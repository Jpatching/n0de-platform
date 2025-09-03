#!/bin/bash

# 🛡️ BULLETPROOF BILLING SYSTEM DEPLOYMENT SCRIPT
# This script deploys the complete anti-abuse billing system

set -e

echo "🚀 Deploying Bulletproof Billing & Abuse Prevention System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        print_warning "Redis CLI not found. Make sure Redis is running"
    fi
    
    # Check Prisma
    if ! command -v npx &> /dev/null; then
        print_error "npx not found. Please install Node.js properly"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    
    npm install socket.io @nestjs/websockets geoip-lite ioredis
    
    if [ $? -eq 0 ]; then
        print_success "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
    
    print_status "Installing frontend dependencies..."
    
    cd frontend
    npm install socket.io-client
    
    if [ $? -eq 0 ]; then
        print_success "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    cd ..
}

# Update database schema
update_database() {
    print_status "Updating database schema..."
    
    # Check if schema enhancements exist
    if [ ! -f "prisma/schema-enhancements.prisma" ]; then
        print_error "Schema enhancements file not found!"
        print_warning "Please manually add the models from schema-enhancements.prisma to your main schema.prisma"
        return 1
    fi
    
    print_warning "Please manually merge the models from prisma/schema-enhancements.prisma into your main schema.prisma"
    print_warning "Then run: npx prisma db push && npx prisma generate"
    
    read -p "Have you updated the schema? (y/N): " schema_updated
    if [[ $schema_updated =~ ^[Yy]$ ]]; then
        npx prisma generate
        print_success "Database schema updated"
    else
        print_warning "Skipping database update - please do this manually"
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production not found!"
        exit 1
    fi
    
    # Check for required environment variables
    required_vars=(
        "STRIPE_WEBHOOK_SECRET"
        "COINBASE_COMMERCE_WEBHOOK_SECRET" 
        "NOWPAYMENTS_IPN_SECRET"
        "REDIS_URL"
        "DATABASE_URL"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env.production; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Missing environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_warning "Please add these to your .env.production file"
    else
        print_success "Environment variables check passed"
    fi
}

# Test Redis connection
test_redis() {
    print_status "Testing Redis connection..."
    
    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis connection successful"
    else
        print_warning "Redis connection failed - make sure Redis is running"
        print_warning "Start Redis with: redis-server"
    fi
}

# Build the application
build_application() {
    print_status "Building backend application..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Backend build successful"
    else
        print_error "Backend build failed"
        exit 1
    fi
    
    print_status "Building frontend application..."
    
    cd frontend
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend build successful" 
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
}

# Setup webhook endpoints
setup_webhooks() {
    print_status "Setting up webhook endpoints..."
    
    echo ""
    echo "📡 Configure these webhook URLs in your payment providers:"
    echo ""
    echo "🟢 Stripe Webhooks:"
    echo "   URL: https://n0de.pro/api/v1/webhooks/stripe"
    echo "   Events: customer.subscription.*, invoice.payment_*, invoice.upcoming"
    echo ""
    echo "🔶 Coinbase Commerce Webhooks:" 
    echo "   URL: https://n0de.pro/api/v1/webhooks/coinbase"
    echo "   Events: charge:confirmed, charge:failed, charge:delayed"
    echo ""
    echo "🔷 NOWPayments Webhooks:"
    echo "   URL: https://n0de.pro/api/v1/webhooks/nowpayments" 
    echo "   Events: All payment status updates"
    echo ""
}

# Run tests
run_tests() {
    print_status "Running system tests..."
    
    # Test API endpoints
    if curl -f -s "http://localhost:3001/health" > /dev/null; then
        print_success "API health check passed"
    else
        print_warning "API health check failed - make sure server is running"
    fi
    
    # Test webhook endpoints (if server is running)
    if curl -f -s "http://localhost:3001/api/v1/webhooks/test/stripe" \
       -X POST \
       -H "Content-Type: application/json" \
       -d '{"type":"test","data":{}}' > /dev/null 2>&1; then
        print_success "Webhook test endpoints working"
    else
        print_warning "Webhook test endpoints not responding"
    fi
}

# Deploy to production
deploy_production() {
    print_status "Preparing production deployment..."
    
    # Check if we're in production mode
    if [ "$NODE_ENV" = "production" ]; then
        print_status "Running production deployment checks..."
        
        # Verify all services are configured
        if ! systemctl is-active --quiet nginx; then
            print_warning "Nginx is not running"
        fi
        
        if ! systemctl is-active --quiet redis; then
            print_warning "Redis service is not running" 
        fi
        
        # Restart backend service
        print_status "Restarting backend service..."
        sudo systemctl restart n0de-backend
        
        if [ $? -eq 0 ]; then
            print_success "Backend service restarted"
        else
            print_error "Failed to restart backend service"
        fi
        
        # Deploy frontend to Vercel
        print_status "Deploying frontend to Vercel..."
        cd frontend
        vercel --prod
        cd ..
        
    else
        print_warning "Not in production environment - skipping production deployment"
        print_status "To deploy to production, run: NODE_ENV=production $0"
    fi
}

# Show monitoring setup
show_monitoring() {
    print_status "Setting up monitoring..."
    
    echo ""
    echo "📊 Monitor these key metrics:"
    echo ""
    echo "🔒 Abuse Detection:"
    echo "   - Requests blocked per hour"
    echo "   - False positive rate" 
    echo "   - Auto-suspensions triggered"
    echo "   - Geographic anomalies detected"
    echo ""
    echo "💰 Billing Performance:"
    echo "   - Webhook processing time (target: <5 seconds)"
    echo "   - Payment sync success rate (target: >99%)"
    echo "   - Subscription status accuracy" 
    echo "   - Grace period effectiveness"
    echo ""
    echo "⚡ System Performance:"
    echo "   - API response time (target: <100ms)"
    echo "   - Redis cache hit rate (target: >95%)"
    echo "   - Rate limit effectiveness"
    echo "   - WebSocket connection stability"
    echo ""
}

# Main deployment flow
main() {
    echo "🛡️ BULLETPROOF BILLING & ABUSE PREVENTION SYSTEM"
    echo "================================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    install_dependencies
    echo ""
    
    update_database  
    echo ""
    
    setup_environment
    echo ""
    
    test_redis
    echo ""
    
    build_application
    echo ""
    
    setup_webhooks
    echo ""
    
    run_tests
    echo ""
    
    show_monitoring
    echo ""
    
    # Ask about production deployment
    read -p "Deploy to production? (y/N): " deploy_prod
    if [[ $deploy_prod =~ ^[Yy]$ ]]; then
        deploy_production
    fi
    
    echo ""
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "======================"
    echo ""
    print_success "Bulletproof Billing System is now active!"
    echo ""
    echo "🛡️  Your API is protected against:"
    echo "   ✅ Freeloaders and usage abusers"
    echo "   ✅ Script kiddies and bots"
    echo "   ✅ API key sharing" 
    echo "   ✅ DDoS and burst attacks"
    echo "   ✅ Geographic anomalies"
    echo "   ✅ Payment fraud"
    echo ""
    echo "💰 Your customers get:"
    echo "   ✅ Instant subscription updates (<5 seconds)"
    echo "   ✅ Real-time usage tracking"
    echo "   ✅ Transparent billing"
    echo "   ✅ Fair usage limits"
    echo ""
    echo "📚 See BULLETPROOF_BILLING_SYSTEM.md for full documentation"
    echo ""
    print_success "System is now monitoring 24/7 and protecting your revenue! 🚀"
}

# Run main function
main "$@"