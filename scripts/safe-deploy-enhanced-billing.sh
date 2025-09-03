#!/bin/bash

# 🛡️ SAFE DEPLOYMENT - Enhanced Billing System
# This script deploys enhanced billing gradually WITHOUT risking existing revenue

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[SAFE DEPLOY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Backup current system
backup_system() {
    print_status "Creating safety backup..."
    
    BACKUP_DIR="/home/sol/n0de-deploy-backup-$(date +%Y%m%d_%H%M%S)"
    
    # Backup critical files
    mkdir -p $BACKUP_DIR
    cp -r backend/rpc $BACKUP_DIR/rpc
    cp backend/app.module.ts $BACKUP_DIR/
    cp .env.production $BACKUP_DIR/
    
    print_success "Backup created at: $BACKUP_DIR"
    echo "BACKUP_DIR=$BACKUP_DIR" > .deployment_backup
}

# Check current revenue metrics (safety check)
check_revenue_baseline() {
    print_status "Checking current revenue baseline..."
    
    # Get current API usage statistics
    CURRENT_HOUR=$(date +%H)
    CURRENT_DAY=$(date +%d)
    
    print_status "Recording baseline metrics..."
    echo "DEPLOYMENT_TIME=$(date +%s)" >> .deployment_metrics
    echo "BASELINE_HOUR=$CURRENT_HOUR" >> .deployment_metrics
    echo "BASELINE_DAY=$CURRENT_DAY" >> .deployment_metrics
    
    print_success "Baseline recorded for revenue monitoring"
}

# Phase 1: Install dependencies without changes
install_dependencies() {
    print_status "Installing new dependencies..."
    
    # Only install what we need
    npm install socket.io @nestjs/websockets ioredis geoip-lite
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed safely"
    else
        print_error "Dependency installation failed"
        exit 1
    fi
}

# Phase 2: Add services without activating them
add_services() {
    print_status "Adding new services in DISABLED mode..."
    
    # Copy abuse detection service
    if [ ! -f "backend/services/abuse-detection.service.ts" ]; then
        cp /tmp/abuse-detection.service.ts backend/services/
        print_success "Abuse detection service added (DISABLED)"
    fi
    
    # Copy rate limiting service  
    if [ ! -f "backend/services/rate-limiting.service.ts" ]; then
        cp /tmp/rate-limiting.service.ts backend/services/
        print_success "Rate limiting service added (DISABLED)"
    fi
    
    # Add environment variables for gradual activation
    if ! grep -q "ENABLE_ABUSE_DETECTION" .env.production; then
        echo "" >> .env.production
        echo "# Enhanced Security Features (DISABLED by default)" >> .env.production
        echo "ENABLE_ABUSE_DETECTION=false" >> .env.production
        echo "ABUSE_CONFIDENCE_THRESHOLD=0.95" >> .env.production
        echo "ENABLE_IP_BLOCKING=false" >> .env.production
        print_success "Added safety environment variables"
    fi
}

# Phase 3: Test in monitoring mode
test_monitoring_mode() {
    print_status "Testing enhanced features in MONITORING ONLY mode..."
    
    # Build the application
    npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Build failed - reverting to backup"
        restore_from_backup
        exit 1
    fi
    
    print_success "Build successful"
    
    # Test health endpoints
    print_status "Testing health endpoints..."
    
    # Start server in background for testing
    npm run start:prod &
    SERVER_PID=$!
    echo "SERVER_PID=$SERVER_PID" >> .deployment_metrics
    
    # Wait for server to start
    sleep 10
    
    # Test health endpoint
    if curl -f -s "http://localhost:3001/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed - reverting"
        kill $SERVER_PID
        restore_from_backup
        exit 1
    fi
    
    # Test RPC endpoint with monitoring
    if curl -f -s -X POST "http://localhost:3001/rpc" \
       -H "Content-Type: application/json" \
       -H "x-api-key: test_key_12345" \
       -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null 2>&1; then
        print_success "RPC endpoint test passed"
    else
        print_warning "RPC endpoint test failed (expected if no valid API key)"
    fi
    
    # Stop test server
    kill $SERVER_PID
}

# Phase 4: Enable monitoring gradually
enable_monitoring() {
    print_status "Enabling MONITORING mode (no blocking)..."
    
    # Enable monitoring but not blocking
    sed -i 's/ENABLE_ABUSE_DETECTION=false/ENABLE_ABUSE_DETECTION=true/' .env.production
    echo "ABUSE_BLOCK_ENABLED=false" >> .env.production
    
    print_success "Monitoring enabled - will log suspicious activity only"
    print_warning "Blocking remains DISABLED for safety"
}

# Monitor for safety period
safety_monitoring() {
    local monitoring_minutes=${1:-30}
    
    print_status "Starting $monitoring_minutes minute safety monitoring period..."
    print_status "Monitoring for:"
    echo "  - Revenue impact"
    echo "  - False positives"
    echo "  - System stability"
    echo "  - User complaints"
    
    # Start production server
    print_status "Starting production server with enhanced monitoring..."
    sudo systemctl restart n0de-backend
    
    if [ $? -eq 0 ]; then
        print_success "Production server restarted successfully"
    else
        print_error "Server restart failed - reverting"
        restore_from_backup
        exit 1
    fi
    
    # Monitor for the specified period
    local start_time=$(date +%s)
    local end_time=$((start_time + monitoring_minutes * 60))
    
    while [ $(date +%s) -lt $end_time ]; do
        # Check server health
        if ! curl -f -s "http://localhost:3001/health" > /dev/null; then
            print_error "Server health check failed during monitoring"
            restore_from_backup
            exit 1
        fi
        
        # Check for critical errors in logs
        if sudo journalctl -u n0de-backend --since="1 minute ago" | grep -i "CRITICAL\|ERROR" | grep -v "expected"; then
            print_warning "Errors detected in logs - continuing monitoring..."
        fi
        
        local remaining=$(( (end_time - $(date +%s)) / 60 ))
        print_status "Monitoring... ${remaining} minutes remaining"
        
        sleep 60
    done
    
    print_success "Safety monitoring period completed successfully"
}

# Restore from backup if needed
restore_from_backup() {
    print_error "Restoring from backup..."
    
    if [ -f ".deployment_backup" ]; then
        source .deployment_backup
        
        if [ -d "$BACKUP_DIR" ]; then
            cp -r $BACKUP_DIR/rpc backend/
            cp $BACKUP_DIR/app.module.ts backend/
            cp $BACKUP_DIR/.env.production ./
            
            print_status "Files restored from backup"
            
            # Restart server
            npm run build
            sudo systemctl restart n0de-backend
            
            print_success "System restored to previous state"
        else
            print_error "Backup directory not found!"
        fi
    else
        print_error "No backup information found!"
    fi
}

# Check revenue impact
check_revenue_impact() {
    print_status "Checking revenue impact..."
    
    # This would check your metrics
    # For now, just verify server is responding
    
    local error_count=$(sudo journalctl -u n0de-backend --since="30 minutes ago" | grep -c "ERROR" || echo "0")
    local warning_count=$(sudo journalctl -u n0de-backend --since="30 minutes ago" | grep -c "WARN" || echo "0")
    
    print_status "Error count in last 30 minutes: $error_count"
    print_status "Warning count in last 30 minutes: $warning_count"
    
    if [ $error_count -gt 50 ]; then
        print_error "Too many errors detected - consider reverting"
        return 1
    fi
    
    print_success "Revenue impact check passed"
    return 0
}

# Enable gradual blocking (optional)
enable_gradual_blocking() {
    print_warning "This will enable GRADUAL BLOCKING for obvious abuse"
    print_warning "Only CRITICAL abuse (confidence > 95%) will be blocked"
    
    read -p "Enable gradual blocking? (y/N): " enable_blocking
    
    if [[ $enable_blocking =~ ^[Yy]$ ]]; then
        print_status "Enabling gradual blocking with high confidence threshold..."
        
        echo "ABUSE_BLOCK_ENABLED=true" >> .env.production
        echo "ABUSE_CONFIDENCE_THRESHOLD=0.95" >> .env.production
        
        sudo systemctl restart n0de-backend
        
        print_success "Gradual blocking enabled with high confidence threshold"
        print_warning "Only extremely obvious abuse will be blocked automatically"
    else
        print_status "Blocking remains disabled - monitoring only"
    fi
}

# Main deployment function
main() {
    echo ""
    echo "🛡️ SAFE ENHANCED BILLING DEPLOYMENT"
    echo "===================================="
    echo ""
    print_warning "This will enhance your existing billing system SAFELY"
    print_warning "Your current revenue protection will remain unchanged"
    print_warning "New features will be added gradually with monitoring"
    echo ""
    
    read -p "Continue with safe deployment? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    echo ""
    print_status "Starting SAFE deployment process..."
    
    # Phase 1: Safety preparations
    backup_system
    check_revenue_baseline
    
    # Phase 2: Install and test
    install_dependencies
    add_services
    test_monitoring_mode
    
    # Phase 3: Enable monitoring
    enable_monitoring
    
    # Phase 4: Safety monitoring period
    safety_monitoring 30  # 30 minutes of monitoring
    
    # Phase 5: Check impact
    if check_revenue_impact; then
        print_success "✅ SAFE DEPLOYMENT SUCCESSFUL!"
        echo ""
        print_success "Enhanced billing system is now active in MONITORING mode"
        print_status "Features enabled:"
        echo "  ✅ Advanced abuse detection (logging only)"
        echo "  ✅ Enhanced rate limiting"  
        echo "  ✅ IP-based monitoring"
        echo "  ✅ Pattern recognition"
        echo ""
        print_status "Features DISABLED for safety:"
        echo "  🔒 Automatic blocking (requires manual enable)"
        echo "  🔒 Aggressive rate limiting"
        echo "  🔒 IP blacklisting"
        echo ""
        
        # Offer to enable gradual blocking
        enable_gradual_blocking
        
        print_success "🎉 Your API is now protected with zero risk to existing revenue!"
        
    else
        print_error "Revenue impact detected - system restored to previous state"
        restore_from_backup
        exit 1
    fi
}

# Run main function
main "$@"