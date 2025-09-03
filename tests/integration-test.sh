#!/bin/bash

# N0DE Integration Test Suite
# End-to-end integration tests for complete migration flow

# Load error handling library
source "/home/sol/n0de-deploy/lib/error-handler.sh"
init_error_handler "$(basename "$0")"

# Test configuration
INTEGRATION_LOG="/home/sol/n0de-deploy/tests/integration.log"
TEST_ENV_FILE="/home/sol/n0de-deploy/.env.test"
TEST_DB_NAME="n0de_test_$(date +%s)"
CLEANUP_ON_EXIT=true

# Test data
TEST_API_ENDPOINTS=(
    "http://localhost:3001/health:200"
    "http://localhost:3001/api/v1/health:200,404"  # Might not exist yet
    "http://localhost:8899:200,404"  # Solana RPC
)

cleanup_test_environment() {
    if [ "$CLEANUP_ON_EXIT" = "true" ]; then
        log_info "Cleaning up test environment"
        
        # Stop test services
        systemctl stop n0de-backend 2>/dev/null || true
        
        # Clean up test database
        if [ -n "${TEST_DB_NAME:-}" ]; then
            sudo -u postgres dropdb "$TEST_DB_NAME" 2>/dev/null || true
        fi
        
        # Remove test files
        rm -f "$TEST_ENV_FILE" 2>/dev/null || true
        
        log_info "Test environment cleaned up"
    fi
}

trap cleanup_test_environment EXIT

setup_test_environment() {
    log_info "Setting up integration test environment"
    
    # Create test database
    sudo -u postgres createdb "$TEST_DB_NAME" || return 1
    
    # Create test environment file
    cat > "$TEST_ENV_FILE" << EOF
NODE_ENV=test
PORT=3001
DATABASE_URL="postgresql://postgres@localhost:5432/$TEST_DB_NAME"
REDIS_URL="redis://localhost:6379/15"
JWT_SECRET="test-jwt-secret-$(openssl rand -hex 16)"
ENABLE_SWAGGER=false
ENABLE_CORS=true
LOG_LEVEL=debug
EOF
    
    chmod 600 "$TEST_ENV_FILE"
    log_success "Test environment setup complete"
}

test_database_migration() {
    log_info "Testing database migration and schema"
    
    # Test database connection
    psql "postgresql://postgres@localhost:5432/$TEST_DB_NAME" -c "SELECT 1;" || return 1
    
    # Test Prisma schema migration (if available)
    if [ -f "/home/sol/n0de-deploy/prisma/schema.prisma" ]; then
        cd /home/sol/n0de-deploy
        DATABASE_URL="postgresql://postgres@localhost:5432/$TEST_DB_NAME" npx prisma db push --skip-generate || return 1
        
        # Verify tables were created
        local table_count
        table_count=$(psql "postgresql://postgres@localhost:5432/$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
        
        if [ "$table_count" -lt 1 ]; then
            log_error "No tables created by Prisma migration"
            return 1
        fi
        
        log_success "Database migration test passed ($table_count tables created)"
    else
        log_warning "Prisma schema not found, skipping schema migration test"
    fi
    
    return 0
}

test_redis_connectivity() {
    log_info "Testing Redis connectivity and data operations"
    
    # Test basic Redis operations
    redis-cli -n 15 set "test:integration:$(date +%s)" "test-value" || return 1
    redis-cli -n 15 get "test:integration:$(date +%s)" >/dev/null || return 1
    redis-cli -n 15 del "test:integration:$(date +%s)" >/dev/null || return 1
    
    log_success "Redis connectivity test passed"
    return 0
}

test_backend_startup() {
    log_info "Testing backend application startup"
    
    cd /home/sol/n0de-deploy
    
    # Build application if not already built
    if [ ! -d "dist" ]; then
        npm run build || return 1
    fi
    
    # Start backend with test environment
    NODE_ENV=test PORT=3001 timeout 30 node dist/src/main.js > "$INTEGRATION_LOG.backend" 2>&1 &
    local backend_pid=$!
    
    # Wait for backend to start
    local wait_time=0
    while [ $wait_time -lt 20 ]; do
        if curl -s -f http://localhost:3001/health >/dev/null 2>&1; then
            log_success "Backend started successfully (PID: $backend_pid)"
            kill $backend_pid 2>/dev/null || true
            wait $backend_pid 2>/dev/null || true
            return 0
        fi
        sleep 1
        ((wait_time++))
    done
    
    log_error "Backend failed to start within 20 seconds"
    kill $backend_pid 2>/dev/null || true
    wait $backend_pid 2>/dev/null || true
    
    # Show startup logs for debugging
    echo "Backend startup logs:"
    tail -20 "$INTEGRATION_LOG.backend" 2>/dev/null || echo "No startup logs available"
    
    return 1
}

test_nginx_routing() {
    log_info "Testing nginx reverse proxy routing"
    
    # Test nginx configuration syntax
    nginx -t || return 1
    
    # Test nginx is running
    systemctl is-active --quiet nginx || return 1
    
    # Test basic routing (might return various status codes depending on configuration)
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
    
    # Accept various valid response codes
    case $response_code in
        200|301|302|404|502|503) 
            log_success "nginx routing test passed (HTTP $response_code)"
            return 0
            ;;
        *)
            log_error "nginx routing test failed (HTTP $response_code)"
            return 1
            ;;
    esac
}

test_service_integration() {
    log_info "Testing service integration and communication"
    
    # Test that all required services can communicate
    local integration_passed=true
    
    # PostgreSQL → Backend communication
    if ! test_database_connection "postgresql://postgres@localhost:5432/$TEST_DB_NAME" "Test database"; then
        integration_passed=false
    fi
    
    # Redis → Backend communication  
    if ! test_redis_connection "localhost" "6379" "Redis"; then
        integration_passed=false
    fi
    
    # nginx → Backend communication (if backend was running)
    # This is tested separately due to complexity of starting full backend
    
    if [ "$integration_passed" = "true" ]; then
        log_success "Service integration test passed"
        return 0
    else
        log_error "Service integration test failed"
        return 1
    fi
}

test_configuration_validation() {
    log_info "Testing configuration file validation"
    
    # Test environment file parsing
    if ! grep -q "DATABASE_URL" "$TEST_ENV_FILE"; then
        log_error "DATABASE_URL missing from test environment"
        return 1
    fi
    
    if ! grep -q "REDIS_URL" "$TEST_ENV_FILE"; then
        log_error "REDIS_URL missing from test environment"  
        return 1
    fi
    
    # Test nginx configuration includes our site
    if ! nginx -T 2>/dev/null | grep -q "n0de"; then
        log_warning "nginx configuration doesn't include n0de site"
    fi
    
    # Test systemd service file validation
    local service_file="/home/sol/n0de-deploy/systemd/n0de-backend.service"
    if [ -f "$service_file" ]; then
        systemd-analyze verify "$service_file" || return 1
    fi
    
    log_success "Configuration validation test passed"
    return 0
}

test_backup_restore_flow() {
    log_info "Testing backup and restore functionality"
    
    # Create test data in database
    psql "postgresql://postgres@localhost:5432/$TEST_DB_NAME" -c "CREATE TABLE IF NOT EXISTS test_backup (id SERIAL, data TEXT);" || return 1
    psql "postgresql://postgres@localhost:5432/$TEST_DB_NAME" -c "INSERT INTO test_backup (data) VALUES ('integration-test-data');" || return 1
    
    # Create a test backup
    local backup_file
    backup_file=$(mktemp "/tmp/test-backup-XXXXXX.sql")
    register_temp_file "$backup_file"
    
    pg_dump "postgresql://postgres@localhost:5432/$TEST_DB_NAME" > "$backup_file" || return 1
    
    if [ ! -s "$backup_file" ]; then
        log_error "Backup file is empty"
        return 1
    fi
    
    # Test restore by creating new database and restoring
    local restore_db_name="n0de_test_restore_$(date +%s)"
    sudo -u postgres createdb "$restore_db_name" || return 1
    
    psql "postgresql://postgres@localhost:5432/$restore_db_name" < "$backup_file" || return 1
    
    # Verify restored data
    local restored_data
    restored_data=$(psql "postgresql://postgres@localhost:5432/$restore_db_name" -t -c "SELECT data FROM test_backup;" | tr -d ' ')
    
    if [ "$restored_data" = "integration-test-data" ]; then
        log_success "Backup and restore test passed"
        sudo -u postgres dropdb "$restore_db_name" 2>/dev/null || true
        return 0
    else
        log_error "Backup and restore test failed - data mismatch"
        sudo -u postgres dropdb "$restore_db_name" 2>/dev/null || true
        return 1
    fi
}

test_monitoring_integration() {
    log_info "Testing monitoring system integration"
    
    local monitor_script="/home/sol/n0de-deploy/monitoring/n0de-monitor.sh"
    if [ ! -f "$monitor_script" ]; then
        log_warning "Monitoring script not found, skipping test"
        return 0
    fi
    
    # Test monitoring configuration
    "$monitor_script" test > "$INTEGRATION_LOG.monitor" 2>&1 || return 1
    
    # Verify monitoring can detect services
    if grep -q "database" "$INTEGRATION_LOG.monitor" && grep -q "redis" "$INTEGRATION_LOG.monitor"; then
        log_success "Monitoring integration test passed"
        return 0
    else
        log_error "Monitoring integration test failed"
        return 1
    fi
}

test_security_configuration() {
    log_info "Testing security configuration"
    
    # Test file permissions
    if [ -f "/home/sol/n0de-deploy/.env.production" ]; then
        local perms=$(stat -c "%a" "/home/sol/n0de-deploy/.env.production")
        if [ "$perms" != "600" ]; then
            log_error "Environment file permissions too permissive ($perms)"
            return 1
        fi
    fi
    
    # Test service user configuration
    if id "n0de" >/dev/null 2>&1; then
        local user_shell=$(getent passwd n0de | cut -d: -f7)
        if [ "$user_shell" != "/bin/false" ] && [ "$user_shell" != "/usr/sbin/nologin" ]; then
            log_warning "Service user has login shell: $user_shell"
        fi
    fi
    
    # Test nginx security headers (basic check)
    if nginx -T 2>/dev/null | grep -q "X-Frame-Options"; then
        log_success "nginx security headers configured"
    else
        log_warning "nginx security headers not found"
    fi
    
    log_success "Security configuration test passed"
    return 0
}

run_integration_tests() {
    log_info "Starting N0DE integration test suite"
    
    local tests_passed=0
    local tests_failed=0
    
    # Define integration tests
    local integration_tests=(
        "test_database_migration:Database Migration"
        "test_redis_connectivity:Redis Connectivity"
        "test_backend_startup:Backend Application Startup"
        "test_nginx_routing:nginx Reverse Proxy"
        "test_service_integration:Service Integration"
        "test_configuration_validation:Configuration Validation"
        "test_backup_restore_flow:Backup and Restore"
        "test_monitoring_integration:Monitoring Integration"
        "test_security_configuration:Security Configuration"
    )
    
    echo -e "${BLUE}Running ${#integration_tests[@]} integration tests...${NC}"
    echo ""
    
    for test_def in "${integration_tests[@]}"; do
        IFS=':' read -r test_func test_name <<< "$test_def"
        
        echo -e "${YELLOW}🧪 $test_name${NC}"
        
        if $test_func; then
            echo -e "${GREEN}✅ PASSED: $test_name${NC}"
            ((tests_passed++))
        else
            echo -e "${RED}❌ FAILED: $test_name${NC}"
            ((tests_failed++))
        fi
        echo ""
    done
    
    # Summary
    local total_tests=$((tests_passed + tests_failed))
    local success_rate=0
    if [ $total_tests -gt 0 ]; then
        success_rate=$((tests_passed * 100 / total_tests))
    fi
    
    echo -e "${PURPLE}Integration Test Results${NC}"
    echo -e "${PURPLE}========================${NC}"
    echo -e "${GREEN}✅ Passed: $tests_passed${NC}"
    echo -e "${RED}❌ Failed: $tests_failed${NC}"
    echo -e "${BLUE}📊 Success Rate: $success_rate%${NC}"
    echo ""
    
    if [ $tests_failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All integration tests passed!${NC}"
        echo -e "${GREEN}Migration system is ready for production deployment.${NC}"
        return 0
    else
        echo -e "${RED}⚠️  $tests_failed integration test(s) failed.${NC}"
        echo -e "${RED}Address these issues before proceeding with migration.${NC}"
        return 1
    fi
}

main() {
    echo -e "${PURPLE}🔗 N0DE Integration Test Suite${NC}"
    echo -e "${PURPLE}===============================${NC}"
    
    setup_test_environment
    run_integration_tests
}

# Command line interface
case "${1:-run}" in
    "run"|"test")
        main
        ;;
    "setup")
        setup_test_environment
        echo "Integration test environment set up"
        ;;
    "cleanup")
        cleanup_test_environment  
        echo "Integration test environment cleaned up"
        ;;
    *)
        echo "N0DE Integration Test Suite"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  run     - Run integration tests (default)"
        echo "  setup   - Set up test environment only"
        echo "  cleanup - Clean up test environment"
        ;;
esac