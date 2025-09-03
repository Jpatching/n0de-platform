#!/bin/bash

# N0DE Migration Testing Suite
# Automated tests for migration process components

# Load error handling library
source "/home/sol/n0de-deploy/lib/error-handler.sh"
init_error_handler "$(basename "$0")"

# Test configuration
TEST_DIR="/home/sol/n0de-deploy/tests"
TEST_RESULTS_FILE="$TEST_DIR/test-results.json"
TEST_LOG="$TEST_DIR/test-execution.log"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
TOTAL_TESTS=0

# Initialize test environment
init_test_environment() {
    log_info "Initializing test environment"
    
    require_directory "$TEST_DIR" true "Test directory"
    
    # Clear previous results
    echo "[]" > "$TEST_RESULTS_FILE"
    > "$TEST_LOG"
    
    log_success "Test environment initialized"
}

# Test result tracking
record_test_result() {
    local test_name=$1
    local status=$2
    local message=${3:-""}
    local duration=${4:-0}
    
    if command -v jq >/dev/null 2>&1; then
        local result=$(jq -n --arg name "$test_name" --arg status "$status" --arg msg "$message" --arg duration "$duration" --arg timestamp "$(date -Iseconds)" \
                      '{name: $name, status: $status, message: $msg, duration: $duration, timestamp: $timestamp}')
        
        jq ". += [$result]" "$TEST_RESULTS_FILE" > "$TEST_RESULTS_FILE.tmp" && mv "$TEST_RESULTS_FILE.tmp" "$TEST_RESULTS_FILE"
    fi
    
    case $status in
        "PASS") ((TESTS_PASSED++)) ;;
        "FAIL") ((TESTS_FAILED++)) ;;
        "SKIP") ((TESTS_SKIPPED++)) ;;
    esac
    
    ((TOTAL_TESTS++))
}

# Test execution wrapper
run_test() {
    local test_name=$1
    local test_function=$2
    local skip_reason=${3:-""}
    
    echo -e "${BLUE}🧪 Running test: $test_name${NC}"
    log_info "Starting test: $test_name"
    
    if [ -n "$skip_reason" ]; then
        echo -e "${YELLOW}⏭️  SKIPPED: $skip_reason${NC}"
        log_warning "Test skipped: $test_name - $skip_reason"
        record_test_result "$test_name" "SKIP" "$skip_reason"
        return 0
    fi
    
    local start_time=$(date +%s)
    
    if $test_function > "$TEST_LOG.tmp" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${GREEN}✅ PASSED: $test_name (${duration}s)${NC}"
        log_success "Test passed: $test_name"
        record_test_result "$test_name" "PASS" "Test completed successfully" "$duration"
        
        # Append test output to main log
        echo "=== Test: $test_name ===" >> "$TEST_LOG"
        cat "$TEST_LOG.tmp" >> "$TEST_LOG"
        echo "" >> "$TEST_LOG"
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${RED}❌ FAILED: $test_name (exit code: $exit_code, ${duration}s)${NC}"
        log_error "Test failed: $test_name - exit code $exit_code"
        record_test_result "$test_name" "FAIL" "Test failed with exit code $exit_code" "$duration"
        
        # Show failure details
        echo -e "${YELLOW}Failure details:${NC}"
        tail -10 "$TEST_LOG.tmp"
        
        # Append test output to main log
        echo "=== FAILED Test: $test_name ===" >> "$TEST_LOG"
        cat "$TEST_LOG.tmp" >> "$TEST_LOG"
        echo "" >> "$TEST_LOG"
    fi
    
    rm -f "$TEST_LOG.tmp"
}

# Individual test functions
test_prerequisites() {
    # Test system prerequisites
    require_command "systemctl" || return 1
    require_command "curl" || return 1
    require_command "psql" || return 1
    require_command "redis-cli" || return 1
    
    # Test file structure
    require_file "/home/sol/n0de-deploy/package.json" || return 1
    require_file "/home/sol/n0de-deploy/scripts/complete-migration.sh" || return 1
    require_file "/home/sol/n0de-deploy/nginx/n0de-complete.conf" || return 1
    
    return 0
}

test_database_setup_script() {
    # Test database setup script functionality
    local script="/home/sol/n0de-deploy/scripts/db-setup.sh"
    require_file "$script" || return 1
    
    # Check script is executable
    [ -x "$script" ] || return 1
    
    # Test with dry run (if supported)
    bash -n "$script" || return 1  # Syntax check
    
    return 0
}

test_redis_setup_script() {
    # Test Redis setup script functionality
    local script="/home/sol/n0de-deploy/scripts/redis-setup.sh"
    require_file "$script" || return 1
    
    # Check script is executable
    [ -x "$script" ] || return 1
    
    # Syntax check
    bash -n "$script" || return 1
    
    return 0
}

test_nginx_configuration() {
    # Test nginx configuration syntax
    local config="/home/sol/n0de-deploy/nginx/n0de-complete.conf"
    require_file "$config" || return 1
    
    # Test nginx syntax (this will test global config + our config)
    nginx -t || return 1
    
    return 0
}

test_systemd_service_files() {
    # Test systemd service file syntax
    local service_file="/home/sol/n0de-deploy/systemd/n0de-backend.service"
    require_file "$service_file" || return 1
    
    # Check service file syntax
    systemd-analyze verify "$service_file" || return 1
    
    return 0
}

test_backup_system() {
    # Test backup system functionality
    local backup_script="/home/sol/n0de-deploy/scripts/backup-system.sh"
    require_file "$backup_script" || return 1
    
    # Syntax check
    bash -n "$backup_script" || return 1
    
    # Check backup directory permissions
    local backup_dir="/home/sol/n0de-deploy/backups"
    require_directory "$backup_dir" true || return 1
    
    return 0
}

test_monitoring_system() {
    # Test monitoring system
    local monitor_script="/home/sol/n0de-deploy/monitoring/n0de-monitor.sh"
    require_file "$monitor_script" || return 1
    
    # Syntax check
    bash -n "$monitor_script" || return 1
    
    # Test monitoring config creation
    "$monitor_script" config > /dev/null || return 1
    
    return 0
}

test_ssl_setup() {
    # Test SSL setup script
    local ssl_script="/home/sol/n0de-deploy/scripts/ssl-setup.sh"
    require_file "$ssl_script" || return 1
    
    # Syntax check
    bash -n "$ssl_script" || return 1
    
    return 0
}

test_environment_files() {
    # Test environment file templates
    require_file "/home/sol/n0de-deploy/.env.production.template" || return 1
    
    # Check for required environment variables in template
    grep -q "DATABASE_URL" "/home/sol/n0de-deploy/.env.production.template" || return 1
    grep -q "REDIS_URL" "/home/sol/n0de-deploy/.env.production.template" || return 1
    grep -q "JWT_SECRET" "/home/sol/n0de-deploy/.env.production.template" || return 1
    
    return 0
}

test_service_connectivity() {
    # Test basic service connectivity
    local services_running=0
    
    # PostgreSQL
    if systemctl is-active --quiet postgresql; then
        ((services_running++))
        test_database_connection "postgresql://postgres@localhost:5432/postgres" "PostgreSQL" || return 1
    fi
    
    # Redis
    if systemctl is-active --quiet redis-server; then
        ((services_running++))
        test_redis_connection "localhost" "6379" "Redis" || return 1
    fi
    
    # nginx
    if systemctl is-active --quiet nginx; then
        ((services_running++))
        test_http_endpoint "http://localhost" "200,301,302,404" 5 "nginx" || return 1
    fi
    
    # Require at least basic services to be running
    [ $services_running -ge 2 ] || return 1
    
    return 0
}

test_solana_rpc_stability() {
    # Test that Solana RPC is stable and responding
    if ! pgrep -f agave-validator >/dev/null; then
        return 1  # RPC not running - this is critical
    fi
    
    # Test RPC health multiple times to ensure stability
    for i in {1..3}; do
        curl -s -f http://localhost:8899 -X POST -H "Content-Type: application/json" \
             -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' >/dev/null || return 1
        sleep 1
    done
    
    return 0
}

test_production_readiness() {
    # Test production readiness validator
    local validator_script="/home/sol/n0de-deploy/scripts/production-validator.sh"
    require_file "$validator_script" || return 1
    
    # Run production validator
    "$validator_script" summary >/dev/null || return 1
    
    return 0
}

# Performance tests
test_system_performance() {
    # Check system resources
    local memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    [ $memory_usage -lt 90 ] || return 1
    
    local disk_usage=$(df / | awk 'NR==2 {print int($5)}')
    [ $disk_usage -lt 95 ] || return 1
    
    local load_avg=$(uptime | awk '{print $(NF-2)}' | sed 's/,//')
    local load_int=${load_avg%.*}
    local cores=$(nproc)
    [ $load_int -lt $((cores * 3)) ] || return 1
    
    return 0
}

# Generate test report
generate_test_report() {
    echo ""
    echo -e "${PURPLE}📋 Test Results Summary${NC}"
    echo -e "${PURPLE}======================${NC}"
    echo ""
    echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}" 
    echo -e "${YELLOW}⏭️  Skipped: $TESTS_SKIPPED${NC}"
    echo -e "${BLUE}📊 Total: $TOTAL_TESTS${NC}"
    echo ""
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    fi
    
    echo -e "${BLUE}Success Rate: $success_rate%${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Migration system is ready.${NC}"
    else
        echo -e "${RED}⚠️  $TESTS_FAILED test(s) failed. Address issues before migration.${NC}"
    fi
    
    echo ""
    echo "Detailed results: $TEST_RESULTS_FILE"
    echo "Execution log: $TEST_LOG"
}

# Main test execution
main() {
    echo -e "${PURPLE}🧪 N0DE Migration Test Suite${NC}"
    echo -e "${PURPLE}===========================${NC}"
    
    init_test_environment
    
    # Run all tests
    run_test "Prerequisites Check" "test_prerequisites"
    run_test "Database Setup Script" "test_database_setup_script"
    run_test "Redis Setup Script" "test_redis_setup_script"
    run_test "nginx Configuration" "test_nginx_configuration"
    run_test "Systemd Service Files" "test_systemd_service_files"
    run_test "Backup System" "test_backup_system"
    run_test "Monitoring System" "test_monitoring_system"
    run_test "SSL Setup Script" "test_ssl_setup"
    run_test "Environment Files" "test_environment_files"
    run_test "Service Connectivity" "test_service_connectivity"
    run_test "Solana RPC Stability" "test_solana_rpc_stability"
    run_test "Production Readiness" "test_production_readiness"
    run_test "System Performance" "test_system_performance"
    
    generate_test_report
    
    # Exit with error code if any tests failed
    [ $TESTS_FAILED -eq 0 ] || return 1
}

# Command line interface
case "${1:-run}" in
    "run"|"test")
        main
        ;;
    "results"|"report")
        if [ -f "$TEST_RESULTS_FILE" ]; then
            if command -v jq >/dev/null 2>&1; then
                jq . "$TEST_RESULTS_FILE"
            else
                cat "$TEST_RESULTS_FILE"
            fi
        else
            echo "No test results found. Run tests first."
        fi
        ;;
    "clean")
        rm -f "$TEST_RESULTS_FILE" "$TEST_LOG"
        echo "Test results cleaned"
        ;;
    *)
        echo "N0DE Migration Test Suite"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  run     - Run all tests (default)"
        echo "  results - Show test results"
        echo "  clean   - Clean test results"
        ;;
esac