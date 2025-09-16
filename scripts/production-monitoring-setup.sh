#!/bin/bash

# N0DE Platform - Production Monitoring & Alerting Setup
# Sets up comprehensive monitoring for payment system and infrastructure

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

MONITOR_DIR="/home/sol/n0de-deploy/monitoring"
LOG_DIR="/home/sol/n0de-deploy/logs"
ALERT_EMAIL="alerts@n0de.pro"

echo -e "${PURPLE}🔍 Setting up N0DE Production Monitoring${NC}"
echo "=========================================="

# Create monitoring directory structure
setup_monitoring_directories() {
    echo -e "\n${BLUE}📁 Setting up monitoring directories${NC}"
    
    mkdir -p "$MONITOR_DIR"/{scripts,configs,alerts,dashboards}
    mkdir -p "$LOG_DIR"/{payments,webhooks,api,nginx,system}
    
    echo -e "${GREEN}✅ Monitoring directories created${NC}"
}

# Create system health monitoring script
create_system_health_monitor() {
    echo -e "\n${BLUE}💓 Creating system health monitor${NC}"
    
    cat > "$MONITOR_DIR/scripts/health-monitor.sh" << 'EOF'
#!/bin/bash

# System Health Monitoring Script for N0DE Platform
# Checks critical system components and sends alerts

HEALTH_LOG="/home/sol/n0de-deploy/logs/system/health-$(date +%Y%m%d).log"
ALERT_THRESHOLD=90
ALERT_EMAIL="alerts@n0de.pro"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$HEALTH_LOG"
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    # Log alert
    log_message "ALERT: $subject - $message"
    
    # Send email alert (configure mail system as needed)
    # echo "$message" | mail -s "N0DE Alert: $subject" "$ALERT_EMAIL"
    
    # Log to system log
    logger -p user.crit "N0DE-ALERT: $subject - $message"
}

# Check PostgreSQL
check_postgresql() {
    if ! PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT 1;" &>/dev/null; then
        send_alert "PostgreSQL Down" "PostgreSQL database is not responding"
        return 1
    fi
    
    # Check connection count
    local connections=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
    if [ "$connections" -gt 80 ]; then
        send_alert "High PostgreSQL Connections" "Connection count: $connections"
    fi
    
    log_message "PostgreSQL: OK ($connections connections)"
    return 0
}

# Check Redis
check_redis() {
    if ! redis-cli ping &>/dev/null; then
        send_alert "Redis Down" "Redis server is not responding"
        return 1
    fi
    
    # Check memory usage
    local memory_usage=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log_message "Redis: OK (Memory: $memory_usage)"
    return 0
}

# Check Nginx
check_nginx() {
    if ! systemctl is-active --quiet nginx; then
        send_alert "Nginx Down" "Nginx service is not running"
        return 1
    fi
    
    # Check configuration
    if ! nginx -t &>/dev/null; then
        send_alert "Nginx Config Error" "Nginx configuration has errors"
        return 1
    fi
    
    log_message "Nginx: OK"
    return 0
}

# Check PM2 processes
check_pm2_processes() {
    if ! pm2 list | grep -q "n0de-backend.*online"; then
        send_alert "Backend Process Down" "n0de-backend PM2 process is not running"
        return 1
    fi
    
    # Check memory usage
    local memory=$(pm2 show n0de-backend | grep "memory usage" | head -1 | awk '{print $4}')
    log_message "PM2 Backend: OK (Memory: $memory)"
    return 0
}

# Check disk space
check_disk_space() {
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$ALERT_THRESHOLD" ]; then
        send_alert "Disk Space Critical" "Disk usage is ${disk_usage}%"
        return 1
    fi
    
    log_message "Disk Space: OK (${disk_usage}% used)"
    return 0
}

# Check API endpoints
check_api_endpoints() {
    local api_endpoints=(
        "https://api.n0de.pro/api/v1/health"
        "https://api.n0de.pro/api/v1/subscriptions/plans"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local response=$(curl -s -w '%{http_code}' -o /dev/null "$endpoint" --max-time 10)
        if [ "$response" != "200" ]; then
            send_alert "API Endpoint Down" "$endpoint returned status $response"
            return 1
        fi
    done
    
    log_message "API Endpoints: OK"
    return 0
}

# Check SSL certificates
check_ssl_certificates() {
    local domains=("www.n0de.pro" "api.n0de.pro")
    
    for domain in "${domains[@]}"; do
        local days_until_expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2 | xargs -I {} date -d {} +%s)
        local current_time=$(date +%s)
        local days_left=$(( (days_until_expiry - current_time) / 86400 ))
        
        if [ "$days_left" -lt 30 ]; then
            send_alert "SSL Certificate Expiring" "$domain certificate expires in $days_left days"
        fi
        
        log_message "SSL $domain: OK ($days_left days remaining)"
    done
}

# Main health check
main_health_check() {
    log_message "Starting health check"
    
    local failed_checks=0
    
    check_postgresql || ((failed_checks++))
    check_redis || ((failed_checks++))
    check_nginx || ((failed_checks++))
    check_pm2_processes || ((failed_checks++))
    check_disk_space || ((failed_checks++))
    check_api_endpoints || ((failed_checks++))
    check_ssl_certificates
    
    if [ "$failed_checks" -eq 0 ]; then
        log_message "Health check completed successfully"
    else
        log_message "Health check completed with $failed_checks failures"
    fi
}

# Run health check
main_health_check
EOF

    chmod +x "$MONITOR_DIR/scripts/health-monitor.sh"
    echo -e "${GREEN}✅ System health monitor created${NC}"
}

# Create payment monitoring script
create_payment_monitor() {
    echo -e "\n${BLUE}💳 Creating payment monitoring script${NC}"
    
    cat > "$MONITOR_DIR/scripts/payment-monitor.sh" << 'EOF'
#!/bin/bash

# Payment System Monitoring for N0DE Platform
# Monitors payment processing, webhook delivery, and subscription status

PAYMENT_LOG="/home/sol/n0de-deploy/logs/payments/monitor-$(date +%Y%m%d).log"
API_BASE_URL="https://api.n0de.pro"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$PAYMENT_LOG"
}

send_payment_alert() {
    local subject="$1"
    local message="$2"
    
    log_message "PAYMENT-ALERT: $subject - $message"
    logger -p user.warning "N0DE-PAYMENT-ALERT: $subject - $message"
}

# Check payment processing statistics
check_payment_stats() {
    log_message "Checking payment statistics..."
    
    # Get recent payment failures
    local failed_payments=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM payments 
        WHERE status = 'FAILED' 
        AND created_at >= NOW() - INTERVAL '1 hour'
    " | xargs)
    
    if [ "$failed_payments" -gt 5 ]; then
        send_payment_alert "High Payment Failures" "$failed_payments payment failures in the last hour"
    fi
    
    # Get pending payments count
    local pending_payments=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM payments 
        WHERE status = 'PENDING' 
        AND created_at < NOW() - INTERVAL '1 hour'
    " | xargs)
    
    if [ "$pending_payments" -gt 10 ]; then
        send_payment_alert "Stale Pending Payments" "$pending_payments payments pending for over 1 hour"
    fi
    
    log_message "Payment Stats: $failed_payments failed, $pending_payments stale pending"
}

# Check webhook processing
check_webhook_processing() {
    log_message "Checking webhook processing..."
    
    # Get unprocessed webhooks
    local unprocessed_webhooks=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM webhook_events 
        WHERE processed = false 
        AND created_at < NOW() - INTERVAL '30 minutes'
    " | xargs)
    
    if [ "$unprocessed_webhooks" -gt 0 ]; then
        send_payment_alert "Unprocessed Webhooks" "$unprocessed_webhooks webhooks unprocessed for over 30 minutes"
    fi
    
    # Get webhook errors
    local webhook_errors=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM webhook_events 
        WHERE error_message IS NOT NULL 
        AND created_at >= NOW() - INTERVAL '1 hour'
    " | xargs)
    
    if [ "$webhook_errors" -gt 0 ]; then
        send_payment_alert "Webhook Errors" "$webhook_errors webhook processing errors in the last hour"
    fi
    
    log_message "Webhook Stats: $unprocessed_webhooks unprocessed, $webhook_errors errors"
}

# Check subscription status
check_subscription_health() {
    log_message "Checking subscription health..."
    
    # Get subscription statistics
    local active_subs=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE'
    " | xargs)
    
    local cancelled_today=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM subscriptions 
        WHERE status = 'CANCELLED' 
        AND updated_at >= CURRENT_DATE
    " | xargs)
    
    if [ "$cancelled_today" -gt 5 ]; then
        send_payment_alert "High Cancellation Rate" "$cancelled_today subscriptions cancelled today"
    fi
    
    log_message "Subscriptions: $active_subs active, $cancelled_today cancelled today"
}

# Check API key usage
check_api_usage() {
    log_message "Checking API key usage patterns..."
    
    # Get high usage API keys
    local high_usage_keys=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM api_keys ak
        JOIN billing_usage bu ON ak.user_id = bu.user_id
        WHERE bu.requests_used > bu.requests_limit * 0.9
        AND bu.period_start >= CURRENT_DATE
    " | xargs)
    
    if [ "$high_usage_keys" -gt 0 ]; then
        log_message "High Usage Alert: $high_usage_keys API keys near quota limits"
    fi
    
    log_message "API Usage: $high_usage_keys keys near quota limits"
}

# Main payment monitoring
main_payment_monitoring() {
    log_message "Starting payment system monitoring"
    
    check_payment_stats
    check_webhook_processing
    check_subscription_health
    check_api_usage
    
    log_message "Payment monitoring completed"
}

# Run payment monitoring
main_payment_monitoring
EOF

    chmod +x "$MONITOR_DIR/scripts/payment-monitor.sh"
    echo -e "${GREEN}✅ Payment monitor created${NC}"
}

# Create log rotation configuration
setup_log_rotation() {
    echo -e "\n${BLUE}📜 Setting up log rotation${NC}"
    
    cat > "$MONITOR_DIR/configs/logrotate-n0de" << EOF
$LOG_DIR/payments/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sol sol
    postrotate
        systemctl reload nginx
    endscript
}

$LOG_DIR/system/*.log {
    daily
    rotate 15
    compress
    delaycompress
    notifempty
    create 644 sol sol
}

$LOG_DIR/api/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 sol sol
}

/var/log/nginx/*.log {
    daily
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF
    
    # Copy to system logrotate directory
    sudo cp "$MONITOR_DIR/configs/logrotate-n0de" /etc/logrotate.d/n0de
    
    echo -e "${GREEN}✅ Log rotation configured${NC}"
}

# Create cron jobs for monitoring
setup_monitoring_cron() {
    echo -e "\n${BLUE}⏰ Setting up monitoring cron jobs${NC}"
    
    # Create temporary cron file
    cat > /tmp/n0de-monitoring-cron << EOF
# N0DE Platform Monitoring Jobs

# System health check every 5 minutes
*/5 * * * * $MONITOR_DIR/scripts/health-monitor.sh

# Payment monitoring every 10 minutes
*/10 * * * * $MONITOR_DIR/scripts/payment-monitor.sh

# Daily comprehensive system report
0 6 * * * $MONITOR_DIR/scripts/daily-report.sh

# Weekly log cleanup
0 2 * * 0 find $LOG_DIR -name "*.log" -type f -mtime +30 -delete

# Database maintenance
0 3 * * * PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "VACUUM ANALYZE;"
EOF
    
    # Install cron jobs
    crontab -l 2>/dev/null | cat - /tmp/n0de-monitoring-cron | crontab -
    rm /tmp/n0de-monitoring-cron
    
    echo -e "${GREEN}✅ Monitoring cron jobs installed${NC}"
}

# Create daily report generator
create_daily_report() {
    echo -e "\n${BLUE}📊 Creating daily report generator${NC}"
    
    cat > "$MONITOR_DIR/scripts/daily-report.sh" << 'EOF'
#!/bin/bash

# Daily N0DE Platform Report Generator
# Generates comprehensive daily system and business metrics report

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="/home/sol/n0de-deploy/logs/reports/daily-report-$REPORT_DATE.txt"

mkdir -p /home/sol/n0de-deploy/logs/reports

echo "N0DE Platform Daily Report - $REPORT_DATE" > "$REPORT_FILE"
echo "=========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# System Health Summary
echo "SYSTEM HEALTH SUMMARY" >> "$REPORT_FILE"
echo "---------------------" >> "$REPORT_FILE"

# Database stats
echo "Database:" >> "$REPORT_FILE"
PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY n_tup_ins DESC;
" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"

# Payment Statistics
echo "PAYMENT STATISTICS (Last 24h)" >> "$REPORT_FILE"
echo "-----------------------------" >> "$REPORT_FILE"

PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "
SELECT 
    status,
    provider,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM payments 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY status, provider
ORDER BY count DESC;
" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"

# User Activity
echo "USER ACTIVITY SUMMARY" >> "$REPORT_FILE"
echo "--------------------" >> "$REPORT_FILE"

PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "
SELECT 
    COUNT(DISTINCT user_id) as active_users,
    SUM(requests_used) as total_requests,
    AVG(requests_used) as avg_requests_per_user
FROM billing_usage 
WHERE period_start = CURRENT_DATE - INTERVAL '1 month';
" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"

# Webhook Processing
echo "WEBHOOK PROCESSING (Last 24h)" >> "$REPORT_FILE"
echo "-----------------------------" >> "$REPORT_FILE"

PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "
SELECT 
    provider,
    event_type,
    COUNT(*) as total,
    COUNT(CASE WHEN processed = true THEN 1 END) as processed,
    COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors
FROM webhook_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY provider, event_type
ORDER BY total DESC;
" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"

# System Resources
echo "SYSTEM RESOURCES" >> "$REPORT_FILE"
echo "---------------" >> "$REPORT_FILE"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')%" >> "$REPORT_FILE"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')" >> "$REPORT_FILE"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "Report generated at: $(date)" >> "$REPORT_FILE"
EOF

    chmod +x "$MONITOR_DIR/scripts/daily-report.sh"
    echo -e "${GREEN}✅ Daily report generator created${NC}"
}

# Create alerting configuration
setup_alerting() {
    echo -e "\n${BLUE}🚨 Setting up alerting configuration${NC}"
    
    cat > "$MONITOR_DIR/configs/alert-config.json" << EOF
{
  "alerting": {
    "enabled": true,
    "email": "$ALERT_EMAIL",
    "thresholds": {
      "payment_failure_rate": 5,
      "webhook_processing_delay_minutes": 30,
      "disk_usage_percent": 90,
      "memory_usage_percent": 85,
      "api_response_time_seconds": 5,
      "database_connections": 80,
      "ssl_certificate_days_remaining": 30
    },
    "escalation": {
      "critical_failure_count": 3,
      "escalation_delay_minutes": 15
    }
  },
  "monitoring_intervals": {
    "system_health_minutes": 5,
    "payment_monitoring_minutes": 10,
    "api_health_minutes": 2,
    "webhook_processing_minutes": 5
  }
}
EOF
    
    echo -e "${GREEN}✅ Alerting configuration created${NC}"
}

# Create performance monitoring dashboard
create_performance_dashboard() {
    echo -e "\n${BLUE}📈 Creating performance monitoring dashboard${NC}"
    
    cat > "$MONITOR_DIR/dashboards/performance-metrics.sh" << 'EOF'
#!/bin/bash

# Performance Metrics Dashboard for N0DE Platform
# Real-time display of key performance indicators

clear
echo "N0DE Platform Performance Dashboard"
echo "=================================="
echo "Last Updated: $(date)"
echo ""

# API Response Times
echo "API PERFORMANCE"
echo "---------------"
for endpoint in "/api/v1/health" "/api/v1/subscriptions/plans" "/api/v1/payments"; do
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "https://api.n0de.pro$endpoint")
    printf "%-30s: %.3fs\n" "$endpoint" "$response_time"
done
echo ""

# Database Performance
echo "DATABASE PERFORMANCE"
echo "-------------------"
db_connections=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
echo "Active Connections: $db_connections"

# Payment Processing Stats
echo ""
echo "PAYMENT PROCESSING (Last Hour)"
echo "-----------------------------"
PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "
SELECT 
    status,
    COUNT(*) as count
FROM payments 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY status;
"

# System Resources
echo ""
echo "SYSTEM RESOURCES"
echo "---------------"
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')"
echo "Memory: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $5}')"

# PM2 Status
echo ""
echo "PROCESS STATUS"
echo "-------------"
pm2 list | grep n0de-backend
EOF

    chmod +x "$MONITOR_DIR/dashboards/performance-metrics.sh"
    echo -e "${GREEN}✅ Performance dashboard created${NC}"
}

# Create backup monitoring script
create_backup_monitor() {
    echo -e "\n${BLUE}💾 Creating backup monitoring script${NC}"
    
    cat > "$MONITOR_DIR/scripts/backup-monitor.sh" << 'EOF'
#!/bin/bash

# Database Backup and Monitoring for N0DE Platform
# Ensures regular backups and monitors backup health

BACKUP_DIR="/home/sol/n0de-deploy/backups"
BACKUP_LOG="/home/sol/n0de-deploy/logs/system/backup-$(date +%Y%m%d).log"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$BACKUP_LOG"
}

# Create database backup
create_database_backup() {
    local backup_file="$BACKUP_DIR/n0de-db-backup-$(date +%Y%m%d-%H%M%S).sql"
    
    log_message "Starting database backup..."
    
    if PGPASSWORD=postgres pg_dump -U postgres -h localhost n0de_production > "$backup_file"; then
        # Compress backup
        gzip "$backup_file"
        log_message "Database backup completed: ${backup_file}.gz"
        
        # Verify backup
        if [ -f "${backup_file}.gz" ] && [ -s "${backup_file}.gz" ]; then
            log_message "Backup verification successful"
        else
            log_message "ERROR: Backup verification failed"
            return 1
        fi
    else
        log_message "ERROR: Database backup failed"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_message "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    local remaining_backups=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    log_message "Cleanup completed. $remaining_backups backups remaining."
}

# Monitor backup health
monitor_backup_health() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        local backup_age=$(find "$latest_backup" -mtime +1 2>/dev/null)
        if [ -n "$backup_age" ]; then
            log_message "WARNING: Latest backup is older than 24 hours"
        else
            log_message "Latest backup is current"
        fi
    else
        log_message "ERROR: No backups found"
        return 1
    fi
}

# Main backup routine
main_backup_routine() {
    log_message "Starting backup routine"
    
    create_database_backup
    cleanup_old_backups
    monitor_backup_health
    
    log_message "Backup routine completed"
}

# Run backup routine
main_backup_routine
EOF

    chmod +x "$MONITOR_DIR/scripts/backup-monitor.sh"
    echo -e "${GREEN}✅ Backup monitor created${NC}"
}

# Main setup function
main_setup() {
    echo -e "${PURPLE}Setting up comprehensive production monitoring...${NC}"
    
    setup_monitoring_directories
    create_system_health_monitor
    create_payment_monitor
    create_daily_report
    create_performance_dashboard
    create_backup_monitor
    setup_log_rotation
    setup_alerting
    setup_monitoring_cron
    
    echo -e "\n${GREEN}✅ Production monitoring setup completed!${NC}"
    echo -e "${BLUE}Monitoring scripts location: $MONITOR_DIR${NC}"
    echo -e "${BLUE}Log files location: $LOG_DIR${NC}"
    echo -e "${BLUE}Performance dashboard: $MONITOR_DIR/dashboards/performance-metrics.sh${NC}"
    
    # Test initial health check
    echo -e "\n${YELLOW}Running initial health check...${NC}"
    "$MONITOR_DIR/scripts/health-monitor.sh"
    
    echo -e "\n${PURPLE}Monitoring system is now active!${NC}"
}

# Execute main setup
main_setup "$@"