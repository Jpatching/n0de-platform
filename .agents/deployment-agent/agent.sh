#!/bin/bash
# Deployment Agent - Handles automated deployments and rollbacks

AGENT_LOG="/home/sol/n0de-deploy/logs/agents/deployment-agent.log"
mkdir -p "$(dirname "$AGENT_LOG")"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [DEPLOYMENT-AGENT] $1" | tee -a "$AGENT_LOG"
}

check_deployment_health() {
    log_message "Checking deployment health..."
    
    # Check if recent deployment was successful
    frontend_status=$(curl -s -w '%{http_code}' -o /dev/null "https://n0de.pro")
    backend_status=$(curl -s -w '%{http_code}' -o /dev/null "https://api.n0de.pro/health")
    
    if [ "$frontend_status" != "200" ] || [ "$backend_status" != "200" ]; then
        log_message "ALERT: Deployment health check failed - Frontend: $frontend_status, Backend: $backend_status"
        
        # Auto-rollback logic could go here
        log_message "Consider manual rollback if issues persist"
    else
        log_message "Deployment health: OK"
    fi
    
    # Verify payment system after deployment
    /home/sol/n0de-deploy/scripts/verify-payment-provider-urls.sh >> "$AGENT_LOG" 2>&1
}

# Monitor deployments
while true; do
    check_deployment_health
    sleep 1800  # Check every 30 minutes
done
