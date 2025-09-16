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
