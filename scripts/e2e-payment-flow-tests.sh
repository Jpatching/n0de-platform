#!/bin/bash

# N0DE Platform - End-to-End Payment Flow Testing
# Tests complete payment flows for all subscription tiers and providers

set -e

# Colors and configuration
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

API_BASE_URL="https://api.n0de.pro"
FRONTEND_URL="https://www.n0de.pro"
LOG_FILE="/home/sol/n0de-deploy/logs/e2e-payment-tests-$(date +%Y%m%d-%H%M%S).log"

# Test user credentials (create if needed)
TEST_EMAIL="test-e2e-$(date +%s)@n0de.pro"
TEST_PASSWORD="TestPassword123!"

# Subscription plans
declare -A PLANS
PLANS[STARTER]=49
PLANS[PROFESSIONAL]=299
PLANS[ENTERPRISE]=999

# Payment providers
PROVIDERS=("STRIPE" "COINBASE_COMMERCE" "NOWPAYMENTS")

mkdir -p /home/sol/n0de-deploy/logs

echo -e "${PURPLE}🎯 N0DE End-to-End Payment Flow Tests${NC}" | tee -a $LOG_FILE
echo "================================================" | tee -a $LOG_FILE
echo "Test Started: $(date)" | tee -a $LOG_FILE
echo "Test Email: $TEST_EMAIL" | tee -a $LOG_FILE
echo "================================================" | tee -a $LOG_FILE

# Function to create test user
create_test_user() {
    echo -e "\n${BLUE}👤 Creating Test User${NC}" | tee -a $LOG_FILE
    echo "----------------------" | tee -a $LOG_FILE
    
    local user_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "firstName": "Test",
        "lastName": "User"
    }'
    
    local response=$(curl -s -w '%{http_code}' -X POST "$API_BASE_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "$user_data" 2>&1)
    
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "201" ] || [ "$status_code" = "409" ]; then
        echo -e "${GREEN}✅ Test user created/exists${NC}" | tee -a $LOG_FILE
        return 0
    else
        echo -e "${RED}❌ Failed to create test user: $status_code${NC}" | tee -a $LOG_FILE
        echo "Response: $body" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to authenticate test user
authenticate_user() {
    echo -e "\n${BLUE}🔐 Authenticating Test User${NC}" | tee -a $LOG_FILE
    echo "----------------------------" | tee -a $LOG_FILE
    
    local login_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'"
    }'
    
    local response=$(curl -s -w '%{http_code}' -X POST "$API_BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data" 2>&1)
    
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "200" ]; then
        # Extract JWT token
        AUTH_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        if [ -n "$AUTH_TOKEN" ]; then
            echo -e "${GREEN}✅ User authenticated successfully${NC}" | tee -a $LOG_FILE
            return 0
        fi
    fi
    
    echo -e "${RED}❌ Authentication failed: $status_code${NC}" | tee -a $LOG_FILE
    echo "Response: $body" | tee -a $LOG_FILE
    return 1
}

# Function to get user's current subscription
get_current_subscription() {
    echo -e "\n${BLUE}📋 Getting Current Subscription${NC}" | tee -a $LOG_FILE
    echo "--------------------------------" | tee -a $LOG_FILE
    
    local response=$(curl -s -w '%{http_code}' -X GET "$API_BASE_URL/api/v1/subscriptions/usage" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" 2>&1)
    
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Current subscription retrieved${NC}" | tee -a $LOG_FILE
        echo "Subscription details: $body" | tee -a $LOG_FILE
        return 0
    else
        echo -e "${RED}❌ Failed to get subscription: $status_code${NC}" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to test payment creation for a specific plan
test_payment_creation() {
    local plan=$1
    local provider=${2:-"STRIPE"}
    
    echo -e "\n${YELLOW}💳 Testing Payment Creation: $plan ($provider)${NC}" | tee -a $LOG_FILE
    echo "-----------------------------------------------" | tee -a $LOG_FILE
    
    local payment_data='{
        "plan": "'$plan'",
        "provider": "'$provider'"
    }'
    
    local response=$(curl -s -w '%{http_code}' -X POST "$API_BASE_URL/api/v1/payments/create-checkout" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$payment_data" 2>&1)
    
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "201" ]; then
        echo -e "${GREEN}✅ Payment created successfully for $plan${NC}" | tee -a $LOG_FILE
        
        # Extract payment details
        PAYMENT_ID=$(echo "$body" | grep -o '"paymentId":"[^"]*' | cut -d'"' -f4)
        CHECKOUT_URL=$(echo "$body" | grep -o '"checkoutUrl":"[^"]*' | cut -d'"' -f4)
        
        echo "Payment ID: $PAYMENT_ID" | tee -a $LOG_FILE
        echo "Checkout URL: $CHECKOUT_URL" | tee -a $LOG_FILE
        
        # Test if checkout URL is accessible
        if [ -n "$CHECKOUT_URL" ]; then
            local url_status=$(curl -s -w '%{http_code}' -o /dev/null "$CHECKOUT_URL")
            if [ "$url_status" = "200" ]; then
                echo -e "${GREEN}✅ Checkout URL is accessible${NC}" | tee -a $LOG_FILE
            else
                echo -e "${YELLOW}⚠️ Checkout URL returned status: $url_status${NC}" | tee -a $LOG_FILE
            fi
        fi
        
        return 0
    else
        echo -e "${RED}❌ Payment creation failed: $status_code${NC}" | tee -a $LOG_FILE
        echo "Response: $body" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to test webhook payload processing
test_webhook_processing() {
    local provider=$1
    
    echo -e "\n${YELLOW}🔗 Testing Webhook Processing: $provider${NC}" | tee -a $LOG_FILE
    echo "----------------------------------------" | tee -a $LOG_FILE
    
    local webhook_url="/api/v1/payments/webhooks/"
    local test_payload=""
    
    case $provider in
        "STRIPE")
            webhook_url+="stripe"
            test_payload='{"type":"invoice.payment_succeeded","data":{"object":{"id":"test_payment"}}}'
            ;;
        "COINBASE_COMMERCE")
            webhook_url+="coinbase" 
            test_payload='{"event":{"type":"charge:confirmed","data":{"id":"test_charge"}}}'
            ;;
        "NOWPAYMENTS")
            webhook_url+="nowpayments"
            test_payload='{"payment_status":"finished","payment_id":"test_payment"}'
            ;;
    esac
    
    # Test webhook endpoint (should fail without proper signature)
    local response=$(curl -s -w '%{http_code}' -X POST "$API_BASE_URL$webhook_url" \
        -H "Content-Type: application/json" \
        -d "$test_payload" 2>&1)
    
    local status_code=${response: -3}
    
    if [ "$status_code" = "400" ] || [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
        echo -e "${GREEN}✅ Webhook properly rejects invalid signatures${NC}" | tee -a $LOG_FILE
        return 0
    else
        echo -e "${RED}❌ Webhook security issue - status: $status_code${NC}" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to test API security
test_api_security() {
    echo -e "\n${BLUE}🛡️ Testing API Security${NC}" | tee -a $LOG_FILE
    echo "------------------------" | tee -a $LOG_FILE
    
    # Test without authentication
    local response=$(curl -s -w '%{http_code}' -o /dev/null "$API_BASE_URL/api/v1/payments")
    if [ "$response" = "401" ]; then
        echo -e "${GREEN}✅ Payment endpoint properly protected${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Payment endpoint security issue${NC}" | tee -a $LOG_FILE
    fi
    
    # Test with invalid token
    local response=$(curl -s -w '%{http_code}' -o /dev/null \
        -H "Authorization: Bearer invalid_token_12345" \
        "$API_BASE_URL/api/v1/payments")
    if [ "$response" = "401" ]; then
        echo -e "${GREEN}✅ Invalid token properly rejected${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Invalid token security issue${NC}" | tee -a $LOG_FILE
    fi
    
    # Test rate limiting
    echo -e "${YELLOW}Testing rate limiting...${NC}" | tee -a $LOG_FILE
    local rate_limit_failures=0
    
    for i in {1..20}; do
        local response=$(curl -s -w '%{http_code}' -o /dev/null \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$API_BASE_URL/api/v1/payments" &)
        
        if [ "$i" -eq 20 ]; then
            wait
            if [ "$response" = "429" ]; then
                echo -e "${GREEN}✅ Rate limiting is working${NC}" | tee -a $LOG_FILE
            else
                echo -e "${YELLOW}⚠️ Rate limiting might be too permissive${NC}" | tee -a $LOG_FILE
            fi
        fi
    done
}

# Function to test payment history and stats
test_payment_history() {
    echo -e "\n${BLUE}📊 Testing Payment History & Stats${NC}" | tee -a $LOG_FILE
    echo "-----------------------------------" | tee -a $LOG_FILE
    
    # Get payment history
    local response=$(curl -s -w '%{http_code}' -X GET "$API_BASE_URL/api/v1/payments/history" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Payment history accessible${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Payment history failed: $status_code${NC}" | tee -a $LOG_FILE
    fi
    
    # Get payment stats
    local response=$(curl -s -w '%{http_code}' -X GET "$API_BASE_URL/api/v1/payments/stats" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    local status_code=${response: -3}
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Payment stats accessible${NC}" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Payment stats failed: $status_code${NC}" | tee -a $LOG_FILE
    fi
}

# Function to test billing endpoints
test_billing_endpoints() {
    echo -e "\n${BLUE}💼 Testing Billing Endpoints${NC}" | tee -a $LOG_FILE
    echo "-----------------------------" | tee -a $LOG_FILE
    
    local billing_endpoints=(
        "/api/v1/billing/usage"
        "/api/v1/billing/subscription"
    )
    
    for endpoint in "${billing_endpoints[@]}"; do
        local response=$(curl -s -w '%{http_code}' -o /dev/null \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$API_BASE_URL$endpoint")
        
        if [ "$response" = "200" ]; then
            echo -e "${GREEN}✅ $endpoint accessible${NC}" | tee -a $LOG_FILE
        else
            echo -e "${RED}❌ $endpoint failed: $response${NC}" | tee -a $LOG_FILE
        fi
    done
}

# Function to simulate payment completion
simulate_payment_completion() {
    local payment_id=$1
    
    echo -e "\n${YELLOW}✅ Simulating Payment Completion${NC}" | tee -a $LOG_FILE
    echo "--------------------------------" | tee -a $LOG_FILE
    echo "Payment ID: $payment_id" | tee -a $LOG_FILE
    
    # Check payment status
    local response=$(curl -s -w '%{http_code}' -X GET "$API_BASE_URL/api/v1/payments/$payment_id" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Payment details retrieved${NC}" | tee -a $LOG_FILE
        echo "Payment status: $(echo "$body" | grep -o '"status":"[^"]*' | cut -d'"' -f4)" | tee -a $LOG_FILE
    else
        echo -e "${RED}❌ Failed to get payment details: $status_code${NC}" | tee -a $LOG_FILE
    fi
}

# Function to run comprehensive plan testing
run_plan_testing() {
    echo -e "\n${PURPLE}🎯 Running Comprehensive Plan Testing${NC}" | tee -a $LOG_FILE
    echo "======================================" | tee -a $LOG_FILE
    
    local success_count=0
    local total_tests=0
    
    for plan in "${!PLANS[@]}"; do
        for provider in "${PROVIDERS[@]}"; do
            ((total_tests++))
            echo -e "\n${BLUE}Testing: $plan plan with $provider${NC}" | tee -a $LOG_FILE
            
            if test_payment_creation "$plan" "$provider"; then
                ((success_count++))
                
                # Test webhook for this provider
                if test_webhook_processing "$provider"; then
                    echo -e "${GREEN}✅ Webhook test passed for $provider${NC}" | tee -a $LOG_FILE
                else
                    echo -e "${RED}❌ Webhook test failed for $provider${NC}" | tee -a $LOG_FILE
                fi
                
                # Simulate completion if we have payment ID
                if [ -n "$PAYMENT_ID" ]; then
                    simulate_payment_completion "$PAYMENT_ID"
                fi
            fi
            
            echo "----------------------------------------" | tee -a $LOG_FILE
        done
    done
    
    echo -e "\n${BLUE}Plan Testing Summary: $success_count/$total_tests successful${NC}" | tee -a $LOG_FILE
}

# Function to generate comprehensive test report
generate_comprehensive_report() {
    echo -e "\n${PURPLE}📋 Comprehensive Test Report${NC}" | tee -a $LOG_FILE
    echo "=============================" | tee -a $LOG_FILE
    
    local total_tests=$(grep -c "✅\|❌" $LOG_FILE)
    local passed_tests=$(grep -c "✅" $LOG_FILE)
    local failed_tests=$(grep -c "❌" $LOG_FILE)
    local warnings=$(grep -c "⚠️" $LOG_FILE)
    
    echo "Test Execution Results:" | tee -a $LOG_FILE
    echo "----------------------" | tee -a $LOG_FILE
    echo "Total Checks: $total_tests" | tee -a $LOG_FILE
    echo "Passed: $passed_tests" | tee -a $LOG_FILE
    echo "Failed: $failed_tests" | tee -a $LOG_FILE
    echo "Warnings: $warnings" | tee -a $LOG_FILE
    
    if [ "$total_tests" -gt 0 ]; then
        local success_rate=$(( passed_tests * 100 / total_tests ))
        echo "Success Rate: $success_rate%" | tee -a $LOG_FILE
        
        if [ $failed_tests -eq 0 ]; then
            echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Payment system is production-ready.${NC}" | tee -a $LOG_FILE
        elif [ $success_rate -ge 90 ]; then
            echo -e "\n${YELLOW}⚠️ Most tests passed, but some issues need attention.${NC}" | tee -a $LOG_FILE
        else
            echo -e "\n${RED}❌ Critical issues found. System needs fixes before production.${NC}" | tee -a $LOG_FILE
        fi
    fi
    
    echo -e "\n${BLUE}Detailed log available at: $LOG_FILE${NC}" | tee -a $LOG_FILE
}

# Main execution function
main() {
    echo -e "${PURPLE}Starting comprehensive end-to-end payment testing...${NC}"
    
    # Setup
    if ! create_test_user; then
        echo -e "${RED}Failed to create test user. Exiting.${NC}"
        exit 1
    fi
    
    if ! authenticate_user; then
        echo -e "${RED}Failed to authenticate. Exiting.${NC}"
        exit 1
    fi
    
    # Run all tests
    get_current_subscription
    run_plan_testing
    test_api_security
    test_payment_history
    test_billing_endpoints
    
    # Generate final report
    generate_comprehensive_report
    
    echo -e "\n${PURPLE}End-to-end testing completed!${NC}"
    echo -e "${BLUE}Check the full log: $LOG_FILE${NC}"
}

# Execute main function
main "$@"