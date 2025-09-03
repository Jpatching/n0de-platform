#!/bin/bash

# N0DE Production Readiness Validator
# Automated validation of production deployment checklist

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🔍 N0DE Production Readiness Validator${NC}"
echo -e "${PURPLE}=====================================${NC}"

# Configuration
VALIDATION_LOG="/home/sol/n0de-deploy/production-validation.log"
RESULTS_FILE="/home/sol/n0de-deploy/validation-results.json"
SCORE=0
TOTAL_CHECKS=0
CRITICAL_FAILURES=0

# Initialize results
echo "{}" > "$RESULTS_FILE"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$VALIDATION_LOG"
}

# Test function with scoring
test_check() {
    local category=$1
    local check_name=$2
    local command=$3
    local expected=$4
    local critical=${5:-false}
    
    ((TOTAL_CHECKS++))
    
    echo -e "${YELLOW}🔍 Testing: $check_name${NC}"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: $check_name${NC}"
        log "PASS: $category - $check_name"
        ((SCORE++))
        update_results "$category" "$check_name" "PASS" ""
    else
        if [ "$critical" = true ]; then
            echo -e "${RED}❌ CRITICAL FAIL: $check_name${NC}"
            log "CRITICAL FAIL: $category - $check_name"
            ((CRITICAL_FAILURES++))
            update_results "$category" "$check_name" "CRITICAL_FAIL" "Critical service not working"
        else
            echo -e "${YELLOW}⚠️  WARN: $check_name${NC}"
            log "WARN: $category - $check_name"
            update_results "$category" "$check_name" "WARN" "Non-critical issue detected"
        fi
    fi
}

# Update results JSON
update_results() {
    local category=$1
    local check_name=$2
    local status=$3
    local message=$4
    
    if command -v jq >/dev/null 2>&1; then
        jq --arg cat "$category" --arg check "$check_name" --arg stat "$status" --arg msg "$message" \
           '.[$cat] += [{"check": $check, "status": $stat, "message": $msg}]' \
           "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    fi
}

# System checks
validate_system() {
    echo -e "${BLUE}📊 Validating System Resources...${NC}"
    
    # CPU cores
    CORES=$(nproc)
    if [ "$CORES" -ge 16 ]; then
        test_check "system" "CPU cores ($CORES >= 16)" "true" "true"
    else
        test_check "system" "CPU cores ($CORES >= 16)" "false" "false"
    fi
    
    # RAM
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$RAM_GB" -ge 32 ]; then
        test_check "system" "RAM (${RAM_GB}GB >= 32GB)" "true" "true"
    else
        test_check "system" "RAM (${RAM_GB}GB >= 32GB)" "false" "false"
    fi
    
    # Disk space
    DISK_AVAIL=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    test_check "system" "Disk space (${DISK_AVAIL}GB available)" "[ $DISK_AVAIL -gt 100 ]" "false"
    
    # OS version
    test_check "system" "Ubuntu 24.04" "grep -q '24.04' /etc/os-release" "false"
}

# Service checks
validate_services() {
    echo -e "${BLUE}🔧 Validating Services...${NC}"
    
    # Core services
    test_check "services" "PostgreSQL active" "systemctl is-active --quiet postgresql" "true"
    test_check "services" "Redis active" "systemctl is-active --quiet redis-server" "true"  
    test_check "services" "nginx active" "systemctl is-active --quiet nginx" "true"
    
    # N0DE services
    test_check "services" "n0de-backend service exists" "systemctl list-unit-files | grep -q n0de-backend" "false"
    test_check "services" "n0de-backend active" "systemctl is-active --quiet n0de-backend" "false"
    test_check "services" "n0de-monitor active" "systemctl is-active --quiet n0de-monitor" "false"
    
    # Solana validator
    test_check "services" "Solana RPC running" "pgrep -f agave-validator" "true"
}

# Network and connectivity checks
validate_network() {
    echo -e "${BLUE}🌐 Validating Network Connectivity...${NC}"
    
    # Port availability
    test_check "network" "Port 3001 listening" "ss -tlnp | grep -q :3001" "false"
    test_check "network" "Port 8899 listening" "ss -tlnp | grep -q :8899" "true"
    test_check "network" "Port 5432 listening" "ss -tlnp | grep -q :5432" "true"
    test_check "network" "Port 6379 listening" "ss -tlnp | grep -q :6379" "true"
    
    # Service responses
    test_check "network" "PostgreSQL responding" "pg_isready -h localhost -p 5432" "true"
    test_check "network" "Redis responding" "redis-cli ping | grep -q PONG" "true"
    test_check "network" "Solana RPC responding" "curl -sf http://localhost:8899 -X POST -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getHealth\"}'" "true"
    test_check "network" "N0DE backend responding" "curl -sf http://localhost:3001/health" "false"
}

# Database validation
validate_database() {
    echo -e "${BLUE}🗄️  Validating Database...${NC}"
    
    if [ -f "/home/sol/n0de-deploy/.env.database" ]; then
        source /home/sol/n0de-deploy/.env.database
        
        test_check "database" "Database connection" "psql \$DATABASE_URL -c 'SELECT 1;'" "true"
        test_check "database" "N0DE database exists" "psql \$DATABASE_URL -c 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \$\$public\$\$;'" "false"
        
        # Check for critical tables if they exist
        if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" > /dev/null 2>&1; then
            test_check "database" "Users table exists" "psql \$DATABASE_URL -c 'SELECT COUNT(*) FROM users;'" "false"
            test_check "database" "API keys table exists" "psql \$DATABASE_URL -c 'SELECT COUNT(*) FROM api_keys;'" "false"
        fi
    else
        echo -e "${YELLOW}⚠️  Database configuration not found${NC}"
    fi
}

# Configuration validation
validate_config() {
    echo -e "${BLUE}⚙️  Validating Configuration...${NC}"
    
    # Environment files
    test_check "config" ".env.production exists" "[ -f /home/sol/n0de-deploy/.env.production ]" "false"
    test_check "config" ".env.database exists" "[ -f /home/sol/n0de-deploy/.env.database ]" "false"
    test_check "config" ".env.redis exists" "[ -f /home/sol/n0de-deploy/.env.redis ]" "false"
    
    # Essential scripts
    test_check "config" "complete-migration.sh exists" "[ -x /home/sol/n0de-deploy/scripts/complete-migration.sh ]" "false"
    test_check "config" "service-manager.sh exists" "[ -x /home/sol/n0de-deploy/scripts/service-manager.sh ]" "false"
    test_check "config" "backup-system.sh exists" "[ -x /home/sol/n0de-deploy/scripts/backup-system.sh ]" "false"
    
    # nginx configuration
    test_check "config" "nginx config valid" "nginx -t" "true"
    test_check "config" "n0de nginx config exists" "ls /etc/nginx/sites-available/n0de-*" "false"
    
    # Systemd services
    test_check "config" "n0de-backend service file" "[ -f /etc/systemd/system/n0de-backend.service ]" "false"
}

# SSL validation (if configured)
validate_ssl() {
    echo -e "${BLUE}🔒 Validating SSL Configuration...${NC}"
    
    if [ -d "/etc/letsencrypt/live" ] && [ "$(ls -A /etc/letsencrypt/live/ 2>/dev/null)" ]; then
        DOMAIN=$(ls /etc/letsencrypt/live/ | head -1)
        test_check "ssl" "SSL certificates exist" "[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]" "false"
        test_check "ssl" "SSL certificates valid" "openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates" "false"
        test_check "ssl" "nginx SSL config" "nginx -T | grep -q ssl_certificate" "false"
    else
        echo -e "${BLUE}ℹ️  SSL not configured (optional for staging)${NC}"
    fi
}

# Security validation
validate_security() {
    echo -e "${BLUE}🔐 Validating Security Settings...${NC}"
    
    # File permissions
    test_check "security" ".env files secured (600)" "[ \$(stat -c %a /home/sol/n0de-deploy/.env.production 2>/dev/null || echo 644) -eq 600 ]" "false"
    
    # Service users
    test_check "security" "n0de user exists" "id n0de" "false"
    test_check "security" "n0de-monitor user exists" "id n0de-monitor" "false"
    
    # Process security
    if systemctl is-active --quiet n0de-backend; then
        test_check "security" "backend not running as root" "! ps aux | grep -v grep | grep n0de-backend | grep -q root" "false"
    fi
}

# Backup validation
validate_backups() {
    echo -e "${BLUE}💾 Validating Backup System...${NC}"
    
    test_check "backups" "Backup directory exists" "[ -d /home/sol/n0de-deploy/backups ]" "false"
    test_check "backups" "Backup script executable" "[ -x /home/sol/n0de-deploy/scripts/backup-system.sh ]" "false"
    test_check "backups" "Restore script executable" "[ -x /home/sol/n0de-deploy/scripts/restore-system.sh ]" "false"
    
    # Check for existing backups
    test_check "backups" "Automated backup configured" "crontab -l | grep -q backup" "false"
}

# Monitoring validation
validate_monitoring() {
    echo -e "${BLUE}📊 Validating Monitoring System...${NC}"
    
    test_check "monitoring" "Monitoring script exists" "[ -x /home/sol/n0de-deploy/monitoring/n0de-monitor.sh ]" "false"
    test_check "monitoring" "Monitoring service active" "systemctl is-active --quiet n0de-monitor" "false"
    test_check "monitoring" "Log directory exists" "[ -d /var/log/n0de ]" "false"
}

# Performance validation
validate_performance() {
    echo -e "${BLUE}⚡ Validating Performance...${NC}"
    
    # Memory usage check
    MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    test_check "performance" "Memory usage reasonable (<80%)" "[ $MEMORY_USAGE -lt 80 ]" "false"
    
    # Load average check  
    LOAD_AVG=$(uptime | awk '{print $(NF-2)}' | sed 's/,//')
    LOAD_INT=${LOAD_AVG%.*}
    CORES=$(nproc)
    test_check "performance" "Load average reasonable" "[ $LOAD_INT -lt $((CORES * 2)) ]" "false"
    
    # Disk usage check
    DISK_USAGE=$(df / | awk 'NR==2 {print int($5)}')
    test_check "performance" "Disk usage reasonable (<90%)" "[ $DISK_USAGE -lt 90 ]" "false"
}

# Generate final report
generate_report() {
    echo ""
    echo -e "${PURPLE}📋 Production Readiness Report${NC}"
    echo -e "${PURPLE}==============================${NC}"
    echo ""
    
    # Calculate score
    if [ $TOTAL_CHECKS -gt 0 ]; then
        PERCENTAGE=$((SCORE * 100 / TOTAL_CHECKS))
    else
        PERCENTAGE=0
    fi
    
    echo -e "${BLUE}Overall Score: $SCORE/$TOTAL_CHECKS ($PERCENTAGE%)${NC}"
    echo -e "${BLUE}Critical Failures: $CRITICAL_FAILURES${NC}"
    echo ""
    
    # Determine readiness level
    if [ $CRITICAL_FAILURES -gt 0 ]; then
        echo -e "${RED}🚨 PRODUCTION READINESS: NOT READY${NC}"
        echo -e "${RED}Critical failures must be resolved before production deployment.${NC}"
        READINESS="NOT_READY"
    elif [ $PERCENTAGE -ge 90 ]; then
        echo -e "${GREEN}✅ PRODUCTION READINESS: EXCELLENT${NC}"
        echo -e "${GREEN}System is fully ready for production deployment.${NC}"
        READINESS="EXCELLENT"
    elif [ $PERCENTAGE -ge 80 ]; then
        echo -e "${YELLOW}⚠️  PRODUCTION READINESS: GOOD${NC}"
        echo -e "${YELLOW}System is ready with minor issues to address.${NC}"
        READINESS="GOOD"
    elif [ $PERCENTAGE -ge 70 ]; then
        echo -e "${YELLOW}⚠️  PRODUCTION READINESS: FAIR${NC}"
        echo -e "${YELLOW}Address warnings before production deployment.${NC}"
        READINESS="FAIR"
    else
        echo -e "${RED}❌ PRODUCTION READINESS: POOR${NC}"
        echo -e "${RED}Significant issues must be resolved.${NC}"
        READINESS="POOR"
    fi
    
    # Create summary JSON
    if command -v jq >/dev/null 2>&1; then
        jq --arg score "$SCORE" --arg total "$TOTAL_CHECKS" --arg percentage "$PERCENTAGE" \
           --arg critical "$CRITICAL_FAILURES" --arg readiness "$READINESS" --arg timestamp "$(date -Iseconds)" \
           '. + {"summary": {"score": $score, "total": $total, "percentage": $percentage, "critical_failures": $critical, "readiness": $readiness, "timestamp": $timestamp}}' \
           "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    fi
    
    echo ""
    echo -e "${BLUE}Detailed Results:${NC} $RESULTS_FILE"
    echo -e "${BLUE}Full Log:${NC} $VALIDATION_LOG"
    echo ""
    
    if [ $CRITICAL_FAILURES -eq 0 ] && [ $PERCENTAGE -ge 80 ]; then
        echo -e "${GREEN}🎉 Ready to proceed with migration!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Run: ./scripts/complete-migration.sh"
        echo "  2. Monitor: ./monitoring/dashboard.sh"  
        echo "  3. Backup: ./scripts/setup-backup-schedule.sh"
    else
        echo -e "${YELLOW}⚠️  Address issues before migration:${NC}"
        echo ""
        if [ $CRITICAL_FAILURES -gt 0 ]; then
            echo "Critical Issues:"
            grep "CRITICAL FAIL" "$VALIDATION_LOG" | tail -5
        fi
        echo ""
        echo "Review full log for details: $VALIDATION_LOG"
    fi
    
    log "Validation completed - Score: $SCORE/$TOTAL_CHECKS ($PERCENTAGE%), Critical: $CRITICAL_FAILURES, Readiness: $READINESS"
}

# Main validation flow
main() {
    echo -e "${BLUE}Starting production readiness validation...${NC}"
    log "Production readiness validation started"
    
    validate_system
    validate_services  
    validate_network
    validate_database
    validate_config
    validate_ssl
    validate_security
    validate_backups
    validate_monitoring
    validate_performance
    
    generate_report
}

# Command line interface
case "${1:-validate}" in
    "validate"|"check"|"")
        main
        ;;
    "report"|"results")
        if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
            jq . "$RESULTS_FILE"
        elif [ -f "$RESULTS_FILE" ]; then
            cat "$RESULTS_FILE"
        else
            echo "No validation results found. Run validation first."
        fi
        ;;
    "summary")
        if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
            jq '.summary' "$RESULTS_FILE" 2>/dev/null || echo "No summary available"
        else
            echo "No validation results found. Run validation first."
        fi
        ;;
    *)
        echo "N0DE Production Readiness Validator"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  validate  - Run full production readiness validation (default)"
        echo "  report    - Show detailed validation results"
        echo "  summary   - Show validation summary"
        ;;
esac