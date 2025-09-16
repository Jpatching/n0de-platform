#!/bin/bash

# N0DE Comprehensive Monitoring System
# Monitors all services, logs, performance, and alerts on issues

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
MONITOR_DIR="/home/sol/n0de-deploy/monitoring"
LOG_DIR="/var/log/n0de"
ALERTS_FILE="$MONITOR_DIR/alerts.log"
STATUS_FILE="$MONITOR_DIR/status.json"
CONFIG_FILE="$MONITOR_DIR/monitor.conf"

# Create directories if they don't exist
sudo mkdir -p "$LOG_DIR" "$MONITOR_DIR"
sudo chown -R sol:sol "$MONITOR_DIR"

# Default configuration
create_default_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << EOF
# N0DE Monitor Configuration

# Monitoring intervals (in seconds)
HEALTH_CHECK_INTERVAL=30
PERFORMANCE_CHECK_INTERVAL=60
LOG_CHECK_INTERVAL=300

# Alert thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000

# Services to monitor
SERVICES="n0de-backend nginx postgresql redis-server agave-validator"

# Endpoints to check
ENDPOINTS="http://localhost:3001/health http://localhost:8899"

# Alert methods (email,webhook,log)
ALERT_METHODS="log"

# Email settings (if email alerts enabled)
ALERT_EMAIL=""
SMTP_SERVER=""

# Webhook settings (if webhook alerts enabled)  
WEBHOOK_URL=""

# Log file paths
NGINX_ACCESS_LOG="/var/log/nginx/n0de_access.log"
NGINX_ERROR_LOG="/var/log/nginx/n0de_error.log"
BACKEND_LOG="journalctl -u n0de-backend"
EOF
    fi
    
    source "$CONFIG_FILE"
}

# Logging functions
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$LOG_DIR/monitor.log"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$LOG_DIR/monitor.log" "$ALERTS_FILE"
}

log_warning() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" | tee -a "$LOG_DIR/monitor.log"
}

# Alert functions
send_alert() {
    local level=$1
    local service=$2
    local message=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log alert
    echo "$timestamp [$level] $service: $message" >> "$ALERTS_FILE"
    
    # Send notifications based on configuration
    if [[ "$ALERT_METHODS" == *"email"* ]] && [ -n "$ALERT_EMAIL" ]; then
        send_email_alert "$level" "$service" "$message"
    fi
    
    if [[ "$ALERT_METHODS" == *"webhook"* ]] && [ -n "$WEBHOOK_URL" ]; then
        send_webhook_alert "$level" "$service" "$message"
    fi
    
    # Always log to console for immediate visibility
    case $level in
        "CRITICAL") echo -e "${RED}🚨 CRITICAL: $service - $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  WARNING: $service - $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  INFO: $service - $message${NC}" ;;
    esac
}

send_email_alert() {
    local level=$1
    local service=$2
    local message=$3
    
    if command -v mail >/dev/null 2>&1; then
        echo "N0DE Alert: $level - $service
        
Time: $(date)
Service: $service
Level: $level
Message: $message

Server: $(hostname)
IP: $(curl -s ifconfig.me 2>/dev/null || echo 'unknown')

---
N0DE Monitoring System" | mail -s "N0DE Alert: $level - $service" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

send_webhook_alert() {
    local level=$1
    local service=$2
    local message=$3
    
    if command -v curl >/dev/null 2>&1; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"level\": \"$level\",
                \"service\": \"$service\", 
                \"message\": \"$message\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"server\": \"$(hostname)\"
            }" >/dev/null 2>&1 || true
    fi
}

# System monitoring functions
check_system_resources() {
    log_info "Checking system resources..."
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    CPU_USAGE=${CPU_USAGE%.*} # Remove decimal part
    
    if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
        send_alert "WARNING" "SYSTEM" "High CPU usage: ${CPU_USAGE}%"
    fi
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    
    if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
        send_alert "WARNING" "SYSTEM" "High memory usage: ${MEMORY_USAGE}%"
    fi
    
    # Disk usage
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
        send_alert "CRITICAL" "SYSTEM" "High disk usage: ${DISK_USAGE}%"
    fi
    
    # Update status
    echo "{
        \"timestamp\": \"$(date -Iseconds)\",
        \"cpu_usage\": $CPU_USAGE,
        \"memory_usage\": $MEMORY_USAGE,
        \"disk_usage\": $DISK_USAGE
    }" > "$MONITOR_DIR/system_status.json"
}

check_services() {
    log_info "Checking services..."
    
    for service in $SERVICES; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log_info "Service $service is running"
        else
            # Special handling for agave-validator (might not be a systemd service)
            if [ "$service" = "agave-validator" ]; then
                if pgrep -f "agave-validator" > /dev/null; then
                    log_info "Service $service is running (process check)"
                else
                    send_alert "CRITICAL" "$service" "Service is not running"
                fi
            else
                send_alert "CRITICAL" "$service" "Service is not running"
            fi
        fi
    done
}

check_endpoints() {
    log_info "Checking endpoints..."
    
    for endpoint in $ENDPOINTS; do
        start_time=$(date +%s%3N)
        
        if curl -sf "$endpoint" -m 10 > /dev/null 2>&1; then
            end_time=$(date +%s%3N)
            response_time=$((end_time - start_time))
            
            log_info "Endpoint $endpoint is responding (${response_time}ms)"
            
            if [ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
                send_alert "WARNING" "ENDPOINT" "$endpoint slow response: ${response_time}ms"
            fi
        else
            send_alert "CRITICAL" "ENDPOINT" "$endpoint is not responding"
        fi
    done
}

check_database() {
    log_info "Checking database connectivity..."
    
    if [ -f "/home/sol/n0de-deploy/.env.database" ]; then
        source /home/sol/n0de-deploy/.env.database
        
        if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            log_info "Database is accessible"
            
            # Check database size
            DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" | tr -d ' ')
            log_info "Database size: $DB_SIZE"
        else
            send_alert "CRITICAL" "DATABASE" "Cannot connect to database"
        fi
    else
        log_warning "Database configuration not found"
    fi
}

check_redis() {
    log_info "Checking Redis..."
    
    if redis-cli ping | grep -q "PONG"; then
        log_info "Redis is responding"
        
        # Check Redis memory usage
        REDIS_MEMORY=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log_info "Redis memory usage: $REDIS_MEMORY"
    else
        send_alert "CRITICAL" "REDIS" "Redis is not responding"
    fi
}

check_logs() {
    log_info "Checking for errors in logs..."
    
    # Check nginx error log for recent errors
    if [ -f "$NGINX_ERROR_LOG" ]; then
        ERROR_COUNT=$(tail -100 "$NGINX_ERROR_LOG" | grep "$(date '+%Y/%m/%d')" | grep -c "error" || echo "0")
        if [ "$ERROR_COUNT" -gt 10 ]; then
            send_alert "WARNING" "NGINX" "High error count in logs: $ERROR_COUNT errors today"
        fi
    fi
    
    # Check systemd journal for backend errors  
    BACKEND_ERRORS=$(journalctl -u n0de-backend --since "1 hour ago" | grep -c "ERROR" || echo "0")
    if [ "$BACKEND_ERRORS" -gt 5 ]; then
        send_alert "WARNING" "BACKEND" "High error count in backend logs: $BACKEND_ERRORS errors in last hour"
    fi
}

generate_status_report() {
    log_info "Generating status report..."
    
    cat > "$STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "healthy",
    "services": {
$(for service in $SERVICES; do
    if systemctl is-active --quiet "$service" 2>/dev/null || ([ "$service" = "agave-validator" ] && pgrep -f "agave-validator" > /dev/null); then
        echo "        \"$service\": \"running\","
    else
        echo "        \"$service\": \"stopped\","
    fi
done | sed '$ s/,$//')
    },
    "system": {
        "cpu_usage": "$CPU_USAGE%",
        "memory_usage": "$MEMORY_USAGE%", 
        "disk_usage": "$DISK_USAGE%"
    },
    "last_check": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF
}

# Log rotation
rotate_logs() {
    log_info "Rotating logs..."
    
    # Rotate monitor logs if they get too large (>10MB)
    if [ -f "$LOG_DIR/monitor.log" ] && [ $(stat -f%z "$LOG_DIR/monitor.log" 2>/dev/null || stat -c%s "$LOG_DIR/monitor.log") -gt 10485760 ]; then
        mv "$LOG_DIR/monitor.log" "$LOG_DIR/monitor.log.$(date +%Y%m%d_%H%M%S)"
        gzip "$LOG_DIR/monitor.log.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        log_info "Monitor log rotated"
    fi
    
    # Keep only last 7 days of rotated logs
    find "$LOG_DIR" -name "monitor.log.*.gz" -mtime +7 -delete 2>/dev/null || true
}

# Main monitoring loop
run_monitoring() {
    echo -e "${PURPLE}🔍 Starting N0DE monitoring system...${NC}"
    log_info "N0DE monitoring system started"
    
    create_default_config
    
    while true; do
        check_system_resources
        check_services
        check_endpoints
        check_database
        check_redis
        check_logs
        generate_status_report
        
        # Rotate logs periodically
        if [ $(($(date +%s) % 3600)) -eq 0 ]; then
            rotate_logs
        fi
        
        log_info "Monitoring cycle completed, sleeping for $HEALTH_CHECK_INTERVAL seconds"
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Command line interface
case "${1:-monitor}" in
    "monitor"|"start")
        run_monitoring
        ;;
    "status")
        if [ -f "$STATUS_FILE" ]; then
            cat "$STATUS_FILE" | jq . 2>/dev/null || cat "$STATUS_FILE"
        else
            echo "Status file not found. Run monitoring first."
        fi
        ;;
    "alerts")
        if [ -f "$ALERTS_FILE" ]; then
            tail -20 "$ALERTS_FILE"
        else
            echo "No alerts found."
        fi
        ;;
    "logs")
        tail -50 "$LOG_DIR/monitor.log" 2>/dev/null || echo "No monitor logs found."
        ;;
    "test")
        create_default_config
        echo "Testing monitoring functions..."
        check_system_resources
        check_services
        check_endpoints
        check_database
        check_redis
        echo "Test completed. Check $LOG_DIR/monitor.log for details."
        ;;
    "config")
        echo "Monitor configuration file: $CONFIG_FILE"
        if [ -f "$CONFIG_FILE" ]; then
            cat "$CONFIG_FILE"
        else
            echo "Configuration file not found. Run monitoring to create default config."
        fi
        ;;
    *)
        echo "N0DE Monitoring System"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  monitor|start  - Start monitoring (default)"
        echo "  status        - Show current status"
        echo "  alerts        - Show recent alerts" 
        echo "  logs          - Show monitor logs"
        echo "  test          - Test monitoring functions"
        echo "  config        - Show configuration"
        ;;
esac