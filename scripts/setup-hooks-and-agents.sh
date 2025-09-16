#!/bin/bash

# N0DE Project - Hooks & Agents Setup
# Sets up automated testing hooks and monitoring agents

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_DIR="/home/sol/n0de-deploy"
HOOKS_DIR="$PROJECT_DIR/.hooks"
AGENTS_DIR="$PROJECT_DIR/.agents"

echo -e "${PURPLE}🚀 Setting up N0DE Hooks & Agents${NC}"
echo "=================================="

# Create directory structure
setup_directories() {
    echo -e "\n${BLUE}📁 Creating hooks and agents directories...${NC}"
    
    mkdir -p "$HOOKS_DIR"/{pre-commit,post-commit,pre-push,post-deploy}
    mkdir -p "$AGENTS_DIR"/{payment-monitor,security-scanner,performance-checker,deployment-agent}
    
    echo -e "${GREEN}✅ Directory structure created${NC}"
}

# Setup Git hooks
setup_git_hooks() {
    echo -e "\n${BLUE}🔗 Setting up Git hooks...${NC}"
    
    # Pre-commit hook - Run tests before commit
    cat > "$HOOKS_DIR/pre-commit/payment-tests.sh" << 'EOF'
#!/bin/bash
# Pre-commit hook: Run payment system tests

echo "🧪 Running payment system tests before commit..."

# Run automated payment tests
if /home/sol/n0de-deploy/scripts/automated-payment-tests.sh; then
    echo "✅ Payment tests passed"
else
    echo "❌ Payment tests failed - commit blocked"
    exit 1
fi

# Check TypeScript compilation
cd /home/sol/n0de-deploy/frontend
if npm run build; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed - commit blocked"
    exit 1
fi
EOF

    # Post-commit hook - Deploy if on main branch
    cat > "$HOOKS_DIR/post-commit/auto-deploy.sh" << 'EOF'
#!/bin/bash
# Post-commit hook: Auto-deploy to production

current_branch=$(git branch --show-current)

if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
    echo "🚀 Deploying to production..."
    
    # Deploy frontend
    cd /home/sol/n0de-deploy/frontend
    vercel --prod
    
    # Restart backend
    pm2 restart n0de-backend
    
    echo "✅ Production deployment completed"
fi
EOF

    # Pre-push hook - Security and performance checks
    cat > "$HOOKS_DIR/pre-push/security-check.sh" << 'EOF'
#!/bin/bash
# Pre-push hook: Security and performance validation

echo "🔒 Running security checks..."

# Check for secrets in code
if grep -r "sk_live\|pk_live\|password.*=" --include="*.ts" --include="*.js" /home/sol/n0de-deploy/; then
    echo "❌ Potential secrets found in code - push blocked"
    exit 1
fi

echo "✅ Security checks passed"
EOF

    # Make hooks executable
    chmod +x "$HOOKS_DIR"/pre-commit/*.sh
    chmod +x "$HOOKS_DIR"/post-commit/*.sh
    chmod +x "$HOOKS_DIR"/pre-push/*.sh
    
    echo -e "${GREEN}✅ Git hooks created${NC}"
}

# Setup monitoring agents
setup_monitoring_agents() {
    echo -e "\n${BLUE}🤖 Setting up monitoring agents...${NC}"
    
    # Payment monitoring agent
    cat > "$AGENTS_DIR/payment-monitor/agent.sh" << 'EOF'
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
        AND created_at >= NOW() - INTERVAL '1 hour'
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
EOF

    # Security scanning agent
    cat > "$AGENTS_DIR/security-scanner/agent.sh" << 'EOF'
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
        WHERE error_message LIKE '%authentication%' 
        AND created_at >= NOW() - INTERVAL '1 hour'
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
EOF

    # Performance monitoring agent
    cat > "$AGENTS_DIR/performance-checker/agent.sh" << 'EOF'
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
EOF

    # Deployment agent
    cat > "$AGENTS_DIR/deployment-agent/agent.sh" << 'EOF'
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
EOF

    # Make agents executable
    chmod +x "$AGENTS_DIR"/*/agent.sh
    
    echo -e "${GREEN}✅ Monitoring agents created${NC}"
}

# Setup systemd services for agents
setup_agent_services() {
    echo -e "\n${BLUE}⚙️ Setting up systemd services for agents...${NC}"
    
    # Payment monitor service
    sudo tee /etc/systemd/system/n0de-payment-monitor.service > /dev/null << EOF
[Unit]
Description=N0DE Payment Monitor Agent
After=network.target

[Service]
Type=simple
User=sol
WorkingDirectory=/home/sol/n0de-deploy
ExecStart=/home/sol/n0de-deploy/.agents/payment-monitor/agent.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Security scanner service
    sudo tee /etc/systemd/system/n0de-security-scanner.service > /dev/null << EOF
[Unit]
Description=N0DE Security Scanner Agent
After=network.target

[Service]
Type=simple
User=sol
WorkingDirectory=/home/sol/n0de-deploy
ExecStart=/home/sol/n0de-deploy/.agents/security-scanner/agent.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    # Performance checker service
    sudo tee /etc/systemd/system/n0de-performance-checker.service > /dev/null << EOF
[Unit]
Description=N0DE Performance Checker Agent
After=network.target

[Service]
Type=simple
User=sol
WorkingDirectory=/home/sol/n0de-deploy
ExecStart=/home/sol/n0de-deploy/.agents/performance-checker/agent.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start services
    sudo systemctl daemon-reload
    sudo systemctl enable n0de-payment-monitor
    sudo systemctl enable n0de-security-scanner  
    sudo systemctl enable n0de-performance-checker
    
    sudo systemctl start n0de-payment-monitor
    sudo systemctl start n0de-security-scanner
    sudo systemctl start n0de-performance-checker
    
    echo -e "${GREEN}✅ Agent services configured and started${NC}"
}

# Setup webhook endpoints testing
setup_webhook_testing() {
    echo -e "\n${BLUE}🔗 Setting up webhook testing...${NC}"
    
    cat > "$PROJECT_DIR/scripts/test-all-webhooks.sh" << 'EOF'
#!/bin/bash
# Test all payment provider webhooks

echo "🔗 Testing all payment provider webhooks..."

# Test Stripe webhook
echo "Testing Stripe webhook..."
curl -X POST "https://api.n0de.pro/api/v1/payments/webhooks/stripe" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: invalid" \
    -d '{"type":"test","data":{"object":{}}}' || echo "Expected failure"

# Test Coinbase webhook  
echo "Testing Coinbase webhook..."
curl -X POST "https://api.n0de.pro/api/v1/payments/webhooks/coinbase" \
    -H "Content-Type: application/json" \
    -H "X-CC-Webhook-Signature: invalid" \
    -d '{"event":{"type":"test","data":{}}}' || echo "Expected failure"

# Test NOWPayments webhook
echo "Testing NOWPayments webhook..."
curl -X POST "https://api.n0de.pro/api/v1/payments/webhooks/nowpayments" \
    -H "Content-Type: application/json" \
    -H "x-nowpayments-sig: invalid" \
    -d '{"payment_status":"test"}' || echo "Expected failure"

echo "✅ Webhook testing completed"
EOF

    chmod +x "$PROJECT_DIR/scripts/test-all-webhooks.sh"
    
    echo -e "${GREEN}✅ Webhook testing setup completed${NC}"
}

# Main setup function
main_setup() {
    echo -e "${PURPLE}Setting up comprehensive hooks and agents system...${NC}"
    
    setup_directories
    setup_git_hooks
    setup_monitoring_agents
    setup_agent_services
    setup_webhook_testing
    
    echo -e "\n${GREEN}✅ Hooks & Agents setup completed!${NC}"
    echo -e "${BLUE}Active monitoring agents:${NC}"
    echo "• Payment Monitor - Checks every 5 minutes"
    echo "• Security Scanner - Scans every hour"
    echo "• Performance Checker - Monitors every 10 minutes"
    echo ""
    echo -e "${BLUE}Available scripts:${NC}"
    echo "• Test webhooks: $PROJECT_DIR/scripts/test-all-webhooks.sh"
    echo "• Payment tests: $PROJECT_DIR/scripts/automated-payment-tests.sh"
    echo "• E2E tests: $PROJECT_DIR/scripts/e2e-payment-flow-tests.sh"
    echo ""
    echo -e "${PURPLE}Your N0DE platform is now fully monitored and automated!${NC}"
}

# Execute main setup
main_setup "$@"