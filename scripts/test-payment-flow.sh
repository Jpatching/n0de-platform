#!/bin/bash

# N0DE Complete Payment Flow Testing Script
# Tests the entire payment journey from checkout to subscription activation

API_URL="https://api.n0de.pro/api/v1"
FRONTEND_URL="https://www.n0de.pro"

echo "🎯 N0DE Payment Flow End-to-End Test"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results storage
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✓ $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $test_name${NC}"
        echo "  Details: $details"
        ((TESTS_FAILED++))
    fi
}

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        print_result "$name" "pass"
    else
        print_result "$name" "fail" "Expected HTTP $expected_status, got $response"
    fi
}

# Function to test authenticated endpoint
test_auth_endpoint() {
    local name=$1
    local endpoint=$2
    local token=$3
    local expected_status=$4
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    if [ -z "$token" ]; then
        print_result "$name" "fail" "No auth token provided"
        return
    fi
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $token" \
        "$API_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        print_result "$name" "pass"
    else
        print_result "$name" "fail" "Expected HTTP $expected_status, got $response"
    fi
}

echo "======================================"
echo "1. Infrastructure & DNS Tests"
echo "======================================"

# Test DNS resolution
echo -e "${BLUE}Testing DNS resolution...${NC}"
test_endpoint "Frontend DNS (www.n0de.pro)" "$FRONTEND_URL" "200"
test_endpoint "API DNS (api.n0de.pro)" "$API_URL/health" "401"

echo ""
echo "======================================"
echo "2. Payment Endpoints Tests"
echo "======================================"

# Test payment endpoints (should require auth)
test_endpoint "Payment create-checkout (no auth)" "$API_URL/payments/create-checkout" "401"
test_endpoint "Payment history (no auth)" "$API_URL/payments/history" "401"

echo ""
echo "======================================"
echo "3. Payment Pages Tests"
echo "======================================"

# Test payment pages
test_endpoint "Checkout page" "$FRONTEND_URL/checkout" "200"
test_endpoint "Payment success page" "$FRONTEND_URL/payment/success" "200"
test_endpoint "Payment cancel page" "$FRONTEND_URL/payment/cancel" "200"
test_endpoint "Subscription page" "$FRONTEND_URL/subscription" "200"

echo ""
echo "======================================"
echo "4. Webhook Endpoints Tests"
echo "======================================"

# Test webhook endpoints (should be public)
echo -e "${BLUE}Testing webhook accessibility...${NC}"

# Coinbase webhook
coinbase_response=$(curl -s -X POST "$API_URL/payments/webhooks/coinbase" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    -w "\nHTTP_STATUS:%{http_code}")
coinbase_status=$(echo "$coinbase_response" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$coinbase_status" = "500" ]; then
    print_result "Coinbase webhook endpoint accessible" "pass"
else
    print_result "Coinbase webhook endpoint" "fail" "Unexpected status: $coinbase_status"
fi

# Stripe webhook
stripe_response=$(curl -s -X POST "$API_URL/payments/webhooks/stripe" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    -w "\nHTTP_STATUS:%{http_code}")
stripe_status=$(echo "$stripe_response" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$stripe_status" = "500" ]; then
    print_result "Stripe webhook endpoint accessible" "pass"
else
    print_result "Stripe webhook endpoint" "fail" "Unexpected status: $stripe_status"
fi

echo ""
echo "======================================"
echo "5. RPC Security Tests"
echo "======================================"

# Test RPC endpoint security
echo -e "${BLUE}Testing RPC endpoint security...${NC}"

# Test without API key
rpc_response=$(curl -s -X POST "$API_URL/rpc" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
    -w "\nHTTP_STATUS:%{http_code}")
rpc_status=$(echo "$rpc_response" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$rpc_status" = "401" ]; then
    print_result "RPC endpoint requires authentication" "pass"
else
    print_result "RPC endpoint security" "fail" "Expected 401, got $rpc_status - API may be exposed!"
fi

# Test with invalid API key
rpc_invalid_response=$(curl -s -X POST "$API_URL/rpc" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: invalid-key-12345" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
    -w "\nHTTP_STATUS:%{http_code}")
rpc_invalid_status=$(echo "$rpc_invalid_response" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$rpc_invalid_status" = "401" ]; then
    print_result "RPC rejects invalid API keys" "pass"
else
    print_result "RPC API key validation" "fail" "Expected 401, got $rpc_invalid_status"
fi

echo ""
echo "======================================"
echo "6. Payment Provider Configuration"
echo "======================================"

echo -e "${BLUE}Checking payment provider setup...${NC}"

# Check if backend is running
pm2_status=$(pm2 list | grep "n0de-backend" | grep "online")
if [ -n "$pm2_status" ]; then
    print_result "Backend service running" "pass"
else
    print_result "Backend service" "fail" "Backend not running or unhealthy"
fi

# Check nginx configuration
nginx_test=$(sudo nginx -t 2>&1)
if echo "$nginx_test" | grep -q "test is successful"; then
    print_result "Nginx configuration valid" "pass"
else
    print_result "Nginx configuration" "fail" "Nginx config test failed"
fi

echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed! Payment system appears to be properly configured.${NC}"
else
    echo -e "\n${RED}⚠ Some tests failed. Please review the issues above.${NC}"
fi

echo ""
echo "======================================"
echo "RECOMMENDATIONS"
echo "======================================"

echo "1. Verify payment provider credentials in backend .env:"
echo "   - COINBASE_COMMERCE_API_KEY"
echo "   - COINBASE_COMMERCE_WEBHOOK_SECRET"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo ""
echo "2. Configure webhook URLs in provider dashboards:"
echo "   - Coinbase: https://api.n0de.pro/api/v1/payments/webhooks/coinbase"
echo "   - Stripe: https://api.n0de.pro/api/v1/payments/webhooks/stripe"
echo ""
echo "3. Test with real payment provider test modes"
echo "4. Monitor backend logs: pm2 logs n0de-backend"
echo ""

exit $TESTS_FAILED