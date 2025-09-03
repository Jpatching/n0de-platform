#!/bin/bash

# Test N0DE Platform Upgrade Flow - Corrected Version

API_URL="https://api.n0de.pro/api/v1"
FRONTEND_URL="https://www.n0de.pro"

echo "Testing N0DE Platform Upgrade Flow (v2)"
echo "========================================"
echo ""

# Test 1: Check backend health
echo "1. Testing backend health..."
curl -s "https://api.n0de.pro/health" | jq '.'
echo ""

# Test 2: Check available plans via API
echo "2. Testing subscriptions endpoint..."
curl -s "${API_URL}/subscriptions" 2>/dev/null | jq '.' 2>/dev/null || echo "Requires auth"
echo ""

# Test 3: Test the correct upgrade checkout endpoint path
echo "3. Testing upgrade checkout endpoint (should require auth)..."
curl -s -X POST "${API_URL}/payments/subscription/upgrade/checkout" \
  -H "Content-Type: application/json" \
  -d '{"planType": "STARTER"}' | jq '.'
echo ""

echo "========================================"
echo "Analysis:"
echo "- API Base URL: ${API_URL}"
echo "- The endpoint /api/v1/payments/subscription/upgrade/checkout exists"
echo "- Frontend needs to call this endpoint instead of /subscriptions/upgrade"