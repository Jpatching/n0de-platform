#!/bin/bash
# Security Scanner Agent - Monitors for security issues

AGENT_LOG="/home/sol/n0de-deploy/logs/agents/security-scanner.log"
mkdir -p "$(dirname "$AGENT_LOG")"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SECURITY-AGENT] $1" | tee -a "$AGENT_LOG"
}

security_scan() {
    log_message "Starting security scan..."
    
    # Check for suspicious login attempts
    suspicious_logins=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "
        SELECT COUNT(*) FROM webhook_events 
        WHERE "errorMessage" LIKE '%authentication%' 
        AND "createdAt" >= NOW() - INTERVAL '1 hour'
    " | xargs)
    
    if [ "$suspicious_logins" -gt 10 ]; then
        log_message "ALERT: $suspicious_logins suspicious login attempts"
    fi
    
    # Check webhook security
    for endpoint in "stripe" "coinbase" "nowpayments"; do
        response=$(curl -s -w '%{http_code}' -o /dev/null \
            -X POST "https://api.n0de.pro/api/v1/payments/webhooks/$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"test":"invalid"}')
        
        if [ "$response" = "200" ]; then
            log_message "ALERT: Webhook $endpoint accepting invalid signatures"
        else
            log_message "Webhook security $endpoint: OK"
        fi
    done
    
    # Check SSL certificates
    for domain in "n0de.pro" "api.n0de.pro"; do
        days_left=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
                   openssl x509 -noout -enddate | cut -d= -f2 | \
                   xargs -I {} date -d {} +%s | \
                   awk -v now="$(date +%s)" '{print int(($1-now)/86400)}')
        
        if [ "$days_left" -lt 30 ]; then
            log_message "ALERT: SSL certificate for $domain expires in $days_left days"
        else
            log_message "SSL certificate $domain: $days_left days remaining"
        fi
    done
}

# Run security scans every hour
while true; do
    security_scan
    sleep 3600  # Check every hour
done
