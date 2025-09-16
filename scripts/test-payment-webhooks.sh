#!/bin/bash

# N0DE Payment Webhook Testing Script
# Tests webhook endpoints for all payment providers

API_URL="https://api.n0de.pro/api/v1"
WEBHOOK_BASE="https://api.n0de.pro/api/v1/payments/webhooks"

echo "🧪 N0DE Payment Webhook Testing"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_webhook() {
    local provider=$1
    local endpoint=$2
    local payload=$3
    local signature_header=$4
    local signature=$5
    
    echo -e "${YELLOW}Testing $provider webhook...${NC}"
    
    if [ -n "$signature" ]; then
        response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -H "$signature_header: $signature" \
            -d "$payload" \
            -w "\nHTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            -w "\nHTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed -n '1,/HTTP_STATUS/p' | sed '$d')
    
    if [ "$http_status" = "200" ] || [ "$http_status" = "201" ]; then
        echo -e "${GREEN}✓ $provider webhook test successful (HTTP $http_status)${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}✗ $provider webhook test failed (HTTP $http_status)${NC}"
        echo "Response: $body"
    fi
    echo ""
}

# Test Coinbase Commerce webhook
echo "1. Coinbase Commerce Webhook Test"
echo "----------------------------------"
coinbase_payload='{
  "event": {
    "id": "test-event-123",
    "type": "charge:confirmed",
    "data": {
      "id": "test-charge-123",
      "metadata": {
        "paymentId": "test-payment-123",
        "userId": "test-user-123",
        "planType": "STARTER"
      }
    }
  }
}'
test_webhook "Coinbase Commerce" "$WEBHOOK_BASE/coinbase" "$coinbase_payload" "X-CC-Webhook-Signature" ""

# Test Stripe webhook
echo "2. Stripe Webhook Test"
echo "----------------------"
stripe_payload='{
  "id": "evt_test_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_test_123",
      "amount": 4900,
      "currency": "usd",
      "metadata": {
        "paymentId": "test-payment-456",
        "userId": "test-user-456",
        "planType": "STARTER"
      }
    }
  }
}'
test_webhook "Stripe" "$WEBHOOK_BASE/stripe" "$stripe_payload" "stripe-signature" ""

# Test NOWPayments webhook
echo "3. NOWPayments Webhook Test"
echo "--------------------------"
nowpayments_payload='{
  "id": "test-payment-789",
  "payment_id": "5745816396",
  "payment_status": "finished",
  "pay_address": "test-address",
  "price_amount": 49,
  "price_currency": "usd",
  "pay_amount": 0.001,
  "pay_currency": "btc",
  "order_id": "test-payment-789",
  "order_description": "N0DE STARTER Plan"
}'
test_webhook "NOWPayments" "$WEBHOOK_BASE/nowpayments" "$nowpayments_payload" "x-nowpayments-sig" ""

echo "================================"
echo "Webhook testing complete!"
echo ""
echo "Note: These tests use dummy signatures which will fail verification."
echo "This is expected and helps identify if webhook endpoints are accessible."
echo ""
echo "To test with real signatures:"
echo "1. Use the webhook testing tools in each provider's dashboard"
echo "2. Or capture real webhook signatures from production events"