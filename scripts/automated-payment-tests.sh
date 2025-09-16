#!/bin/bash

# N0DE Platform - Automated Payment Testing Suite
# This script runs comprehensive tests on the payment system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="https://api.n0de.pro"
FRONTEND_URL="https://www.n0de.pro"
TEST_USER_EMAIL="test-payments@n0de.pro"
LOG_FILE="/home/sol/n0de-deploy/logs/payment-tests-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p /home/sol/n0de-deploy/logs

echo -e "${BLUE}🚀 Starting N0DE Payment System Tests${NC}" | tee -a $LOG_FILE
echo "================================================" | tee -a $LOG_FILE
echo "Timestamp: $(date)" | tee -a $LOG_FILE
echo "API Base URL: $API_BASE_URL" | tee -a $LOG_FILE
echo "Frontend URL: $FRONTEND_URL" | tee -a $LOG_FILE
echo "Log File: $LOG_FILE" | tee -a $LOG_FILE
echo "================================================" | tee -a $LOG_FILE

# Function to make API requests with error handling
make_api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    local expected_status=$5
    
    echo -e "${YELLOW}Making $method request to $endpoint${NC}" | tee -a $LOG_FILE
    
    local curl_cmd="curl -s"
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd -w '%{http_code}' -X $method $API_BASE_URL$endpoint"
    
    local response=$(eval $curl_cmd 2>&1)
    local status_code=${response: -3}
    local body=${response%???}
    
    echo "Response Status: $status_code" | tee -a $LOG_FILE
    echo "Response Body: $body" | tee -a $LOG_FILE
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ Request successful${NC}" | tee -a $LOG_FILE
        return 0
    else
        echo -e "${RED}❌ Request failed. Expected $expected_status, got $status_code${NC}" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to test API endpoint availability
test_api_endpoints() {
    echo -e "\n${BLUE}🔍 Testing API Endpoint Availability${NC}" | tee -a $LOG_FILE
    echo "-----------------------------------" | tee -a $LOG_FILE
    
    local endpoints=(
        "/api/v1/health"
        "/api/v1/auth/health"
        "/api/v1/payments"
        "/api/v1/billing/usage"
        "/api/v1/billing/subscription"
        "/api/v1/subscriptions/plans"
    )
    
    local success_count=0
    
    for endpoint in "${endpoints[@]}"; do
        if make_api_request "GET" "$endpoint" "" "" "200" || make_api_request "GET" "$endpoint" "" "" "401"; then
            ((success_count++))
        fi
    done
    
    echo -e "\n${BLUE}Endpoint Test Results: $success_count/${#endpoints[@]} passed${NC}" | tee -a $LOG_FILE
}

# Function to test database connectivity
test_database_connection() {
    echo -e "\n${BLUE}🗄️ Testing Database Connection${NC}" | tee -a $LOG_FILE
    echo "--------------------------------" | tee -a $LOG_FILE
    
    # Test PostgreSQL connection
    if PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL connection successful${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ PostgreSQL connection failed${NC}" | tee -a $LOG_FILE
        return 1
    fi
    
    # Test Redis connection
    if redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✅ Redis connection successful${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Redis connection failed${NC}" | tee -a $LOG_FILE
        return 1
    fi
    
    # Check critical tables
    local tables=(
        "users"
        "subscriptions"
        "payments"
        "webhook_events"
        "api_keys"
        "billing_usage"
    )
    
    echo -e "\n${YELLOW}Checking database tables...${NC}" | tee -a $LOG_FILE
    
    for table in "${tables[@]}"; do
        local count=$(PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Table '$table': $count records${NC}" | tee -a $LOG_FILE
        else
            echo -e "${RED}❌ Table '$table': Error accessing${NC}" | tee -a $LOG_FILE
        fi
    done
}

# Function to test payment webhook endpoints
test_webhook_endpoints() {
    echo -e "\n${BLUE}🔗 Testing Webhook Endpoints${NC}" | tee -a $LOG_FILE
    echo "-----------------------------" | tee -a $LOG_FILE
    
    local webhook_endpoints=(
        "/api/v1/payments/webhooks/stripe"
        "/api/v1/payments/webhooks/coinbase"
        "/api/v1/payments/webhooks/nowpayments"
    )
    
    for endpoint in "${webhook_endpoints[@]}"; do
        # Test with invalid signature (should fail)
        if make_api_request "POST" "$endpoint" '{"test":"data"}' "" "400"; then
            echo -e "${GREEN}✅ $endpoint properly rejects invalid signatures${NC}" | tee -a $LOG_FILE
        else
            echo -e "${RED}❌ $endpoint security issue${NC}" | tee -a $LOG_FILE
        fi
    done
}

# Function to test frontend accessibility
test_frontend_accessibility() {
    echo -e "\n${BLUE}🌐 Testing Frontend Accessibility${NC}" | tee -a $LOG_FILE
    echo "--------------------------------" | tee -a $LOG_FILE
    
    local frontend_pages=(
        "/"
        "/subscription"
        "/dashboard"
        "/payment/success"
        "/payment/cancel"
    )
    
    for page in "${frontend_pages[@]}"; do
        local status_code=$(curl -s -w '%{http_code}' -o /dev/null "$FRONTEND_URL$page")
        if [ "$status_code" = "200" ]; then
            echo -e "${GREEN}✅ $page accessible (HTTP $status_code)${NC}" | tee -a $LOG_FILE
        else
            echo -e "${RED}❌ $page inaccessible (HTTP $status_code)${NC}" | tee -a $LOG_FILE
        fi
    done
}

# Function to test SSL certificates
test_ssl_certificates() {
    echo -e "\n${BLUE}🔒 Testing SSL Certificates${NC}" | tee -a $LOG_FILE
    echo "----------------------------" | tee -a $LOG_FILE
    
    local domains=(
        "www.n0de.pro"
        "api.n0de.pro"
    )
    
    for domain in "${domains[@]}"; do
        local ssl_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSL certificate valid for $domain${NC}" | tee -a $LOG_FILE
            echo "$ssl_info" | tee -a $LOG_FILE
        else
            echo -e "${RED}❌ SSL certificate issue for $domain${NC}" | tee -a $LOG_FILE
        fi
    done
}

# Function to test Nginx configuration
test_nginx_config() {
    echo -e "\n${BLUE}⚙️ Testing Nginx Configuration${NC}" | tee -a $LOG_FILE
    echo "-------------------------------" | tee -a $LOG_FILE
    
    if sudo nginx -t &>/dev/null; then
        echo -e "${GREEN}✅ Nginx configuration valid${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Nginx configuration has errors${NC}" | tee -a $LOG_FILE
        return 1
    fi
    
    # Test if Nginx is running
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx service is running${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Nginx service is not running${NC}" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to test payment provider configurations
test_payment_provider_configs() {
    echo -e "\n${BLUE}💳 Testing Payment Provider Configurations${NC}" | tee -a $LOG_FILE
    echo "------------------------------------------" | tee -a $LOG_FILE
    
    # Check environment variables
    local required_vars=(
        "STRIPE_SECRET_KEY"
        "COINBASE_COMMERCE_API_KEY" 
        "COINBASE_COMMERCE_WEBHOOK_SECRET"
        "NOWPAYMENTS_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            echo -e "${GREEN}✅ $var is configured${NC}" | tee -a $LOG_FILE
        else
            echo -e "${RED}❌ $var is missing${NC}" | tee -a $LOG_FILE
        fi
    done
}

# Function to run security tests
run_security_tests() {
    echo -e "\n${BLUE}🛡️ Running Security Tests${NC}" | tee -a $LOG_FILE
    echo "---------------------------" | tee -a $LOG_FILE
    
    # Test SQL injection protection
    echo -e "${YELLOW}Testing SQL injection protection...${NC}" | tee -a $LOG_FILE
    make_api_request "GET" "/api/v1/users/me" "" "'; DROP TABLE users; --" "400"
    
    # Test XSS protection  
    echo -e "${YELLOW}Testing XSS protection...${NC}" | tee -a $LOG_FILE
    make_api_request "POST" "/api/v1/payments" '{"plan":"<script>alert(1)</script>"}' "" "400"
    
    # Test rate limiting
    echo -e "${YELLOW}Testing rate limiting...${NC}" | tee -a $LOG_FILE
    for i in {1..10}; do
        make_api_request "GET" "/api/v1/health" "" "" "200" &
    done
    wait
}

# Function to generate test report
generate_test_report() {
    echo -e "\n${BLUE}📊 Generating Test Report${NC}" | tee -a $LOG_FILE
    echo "===========================" | tee -a $LOG_FILE
    
    local total_tests=$(grep -c "Making \|Testing \|Running " $LOG_FILE)
    local passed_tests=$(grep -c "✅" $LOG_FILE)
    local failed_tests=$(grep -c "❌" $LOG_FILE)
    
    echo "Test Execution Summary:" | tee -a $LOG_FILE
    echo "----------------------" | tee -a $LOG_FILE
    echo "Total Tests: $total_tests" | tee -a $LOG_FILE
    echo "Passed: $passed_tests" | tee -a $LOG_FILE
    echo "Failed: $failed_tests" | tee -a $LOG_FILE
    echo "Success Rate: $(( passed_tests * 100 / (passed_tests + failed_tests) ))%" | tee -a $LOG_FILE
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! System is ready for production.${NC}" | tee -a $LOG_FILE
    else
        echo -e "\n${RED}⚠️ Some tests failed. Please review and fix issues before production.${NC}" | tee -a $LOG_FILE
    fi
}

# Main execution flow
main() {
    test_database_connection
    test_api_endpoints
    test_webhook_endpoints
    test_frontend_accessibility
    test_ssl_certificates
    test_nginx_config
    test_payment_provider_configs
    run_security_tests
    generate_test_report
    
    echo -e "\n${BLUE}Test execution completed. Full log: $LOG_FILE${NC}"
}

# Execute main function
main "$@"