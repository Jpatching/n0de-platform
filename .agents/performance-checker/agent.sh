#!/bin/bash
# Performance Monitoring Agent - Tracks system performance

AGENT_LOG="/home/sol/n0de-deploy/logs/agents/performance-checker.log"
mkdir -p "$(dirname "$AGENT_LOG")"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PERFORMANCE-AGENT] $1" | tee -a "$AGENT_LOG"
}

check_performance() {
    log_message "Starting performance check..."
    
    # Check API response times
    for endpoint in "/health" "/api/v1/subscriptions/plans"; do
        response_time=$(curl -o /dev/null -s -w '%{time_total}' "https://api.n0de.pro$endpoint")
        response_time_ms=$(echo "$response_time * 1000" | bc)
        
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            log_message "ALERT: Slow response $endpoint: ${response_time_ms}ms"
        else
            log_message "Response time $endpoint: ${response_time_ms}ms"
        fi
    done
    
    # Check system resources
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    memory_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log_message "System: CPU ${cpu_usage}%, Memory ${memory_usage}%, Disk ${disk_usage}%"
    
    # Check database performance
    db_connections=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
    log_message "Database connections: $db_connections"
    
    if [ "$db_connections" -gt 80 ]; then
        log_message "ALERT: High database connection count: $db_connections"
    fi
}

# Run performance checks every 10 minutes
while true; do
    check_performance
    sleep 600  # Check every 10 minutes
done
