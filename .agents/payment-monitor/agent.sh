#!/bin/bash
# Payment Monitoring Agent - Continuously monitors payment system health

AGENT_LOG="/home/sol/n0de-deploy/logs/agents/payment-monitor.log"
mkdir -p "$(dirname "$AGENT_LOG")"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PAYMENT-AGENT] $1" | tee -a "$AGENT_LOG"
}

monitor_payment_system() {
    log_message "Starting payment system monitoring..."
    
    # Check payment endpoints
    for endpoint in "/api/v1/payments" "/api/v1/billing/usage" "/api/v1/subscriptions/plans"; do
        response=$(curl -s -w '%{http_code}' -o /dev/null "https://api.n0de.pro$endpoint")
        
        if [ "$response" != "200" ] && [ "$response" != "401" ]; then
            log_message "ALERT: Payment endpoint $endpoint returned $response"
            # Send alert (implement notification system)
        else
            log_message "Payment endpoint $endpoint: OK"
        fi
    done
    
    # Check database connectivity
    if PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT 1;" &>/dev/null; then
        log_message "Database connectivity: OK"
    else
        log_message "ALERT: Database connectivity failed"
    fi
    
    # Check recent payment failures
    failed_payments=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM payments 
        WHERE status = 'FAILED' 
        AND "createdAt" >= NOW() - INTERVAL '1 hour'
    " | xargs)
    
    if [ "$failed_payments" -gt 3 ]; then
        log_message "ALERT: $failed_payments payment failures in last hour"
    else
        log_message "Payment failures: $failed_payments (acceptable)"
    fi
}

# Run monitoring loop
while true; do
    monitor_payment_system
    sleep 300  # Check every 5 minutes
done
