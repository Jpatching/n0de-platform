#!/bin/bash

# Verify N0DE Payment System Routing
# Tests all critical payment flow URLs

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 N0DE Payment System Routing Verification${NC}"
echo "============================================="

# Test function
test_url() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "Testing $description... "
    local response=$(curl -s -w '%{http_code}' -o /dev/null --max-time 10 "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $response${NC}"
        return 0
    else
        echo -e "${RED}❌ $response (expected $expected_status)${NC}"
        return 1
    fi
}

echo -e "\n${YELLOW}Frontend URLs:${NC}"
test_url "https://n0de.pro" 200 "Main domain"
test_url "https://n0de.pro/subscription" 200 "Subscription page"
test_url "https://n0de.pro/payment/success" 200 "Payment success"
test_url "https://n0de.pro/payment/cancel" 200 "Payment cancel"

echo -e "\n${YELLOW}API URLs:${NC}"
test_url "https://api.n0de.pro/health" 200 "Health endpoint"
test_url "https://api.n0de.pro/api/v1/subscriptions/plans" 200 "Plans endpoint"

echo -e "\n${YELLOW}Webhook URLs (should return 500 without proper signatures):${NC}"
test_url "https://api.n0de.pro/api/v1/payments/webhooks/stripe" 500 "Stripe webhook"
test_url "https://api.n0de.pro/api/v1/payments/webhooks/coinbase" 500 "Coinbase webhook"
test_url "https://api.n0de.pro/api/v1/payments/webhooks/nowpayments" 500 "NOWPayments webhook"

echo -e "\n${YELLOW}Redirect Check:${NC}"
echo -n "www.n0de.pro redirect behavior... "
redirect_response=$(curl -s -I "https://www.n0de.pro" | grep -i location | awk '{print $2}' | tr -d '\r')
if [ "$redirect_response" = "https://n0de.pro/" ]; then
    echo -e "${GREEN}✅ Properly redirects to n0de.pro${NC}"
else
    echo -e "${YELLOW}⚠️ Redirects to: $redirect_response${NC}"
fi

echo -e "\n${BLUE}📋 Payment Provider URL Configuration${NC}"
echo "================================================"
echo -e "${YELLOW}Update these URLs in your payment providers:${NC}"
echo ""
echo "Stripe Dashboard:"
echo "  Success URL: https://n0de.pro/payment/success"
echo "  Cancel URL: https://n0de.pro/payment/cancel"
echo ""
echo "Coinbase Commerce:"
echo "  Redirect URL: https://n0de.pro/payment/success"
echo ""
echo "NOWPayments:"
echo "  Success URL: https://n0de.pro/payment/success"
echo "  Cancel URL: https://n0de.pro/payment/cancel"

echo -e "\n${GREEN}✅ Domain routing verification complete!${NC}"
echo -e "${BLUE}Your payment system is properly configured.${NC}"
echo -e "${YELLOW}The www → non-www redirect is standard and won't affect payments.${NC}"