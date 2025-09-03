#!/bin/bash

# Test N0DE Platform Upgrade Flow

API_URL="https://api.n0de.pro"
FRONTEND_URL="https://www.n0de.pro"

echo "Testing N0DE Platform Upgrade Flow"
echo "==================================="
echo ""

# Test 1: Check backend health
echo "1. Testing backend health..."
curl -s "${API_URL}/health" | jq '.'
echo ""

# Test 2: Check available plans
echo "2. Fetching available plans..."
curl -s "${API_URL}/subscriptions/plans" | jq '.' 2>/dev/null || echo "Plans endpoint may require authentication"
echo ""

# Test 3: Test upgrade endpoint (should fail without auth)
echo "3. Testing upgrade endpoint without auth..."
curl -s -X POST "${API_URL}/subscriptions/upgrade" \
  -H "Content-Type: application/json" \
  -d '{"planType": "STARTER"}' | jq '.' 2>/dev/null || echo "Expected: Unauthorized"
echo ""

# Test 4: Test checkout endpoint (should also require auth)
echo "4. Testing checkout endpoint without auth..."
curl -s -X POST "${API_URL}/payments/subscription/upgrade/checkout" \
  -H "Content-Type: application/json" \
  -d '{"planType": "STARTER"}' | jq '.' 2>/dev/null || echo "Expected: Unauthorized"
echo ""

# Test 5: Check frontend is accessible
echo "5. Testing frontend accessibility..."
curl -s -o /dev/null -w "Frontend Status: %{http_code}\n" "${FRONTEND_URL}"
echo ""

echo "==================================="
echo "Summary:"
echo "- Backend API is at: ${API_URL}"
echo "- Frontend is at: ${FRONTEND_URL}"
echo ""
echo "The issue: When clicking upgrade, the frontend calls /subscriptions/upgrade"
echo "instead of /payments/subscription/upgrade/checkout"
echo ""
echo "Fix needed in frontend:"
echo "1. Update API call to use /payments/subscription/upgrade/checkout"
echo "2. Handle the checkout URL response correctly"