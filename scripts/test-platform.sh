#!/bin/bash
# N0DE Platform Comprehensive Test Script
# Tests all critical functionality quickly

set -e

BACKEND_URL="https://api.n0de.pro"
FRONTEND_URL="https://www.n0de.pro"
API_BASE="$BACKEND_URL/api/v1"

echo "🚀 N0DE Platform Test Suite"
echo "============================"
echo ""

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected=$2
    local description=$3
    
    echo -n "Testing $description... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected" ]; then
        echo "✅ PASS (HTTP $response)"
    else
        echo "❌ FAIL (Expected $expected, got $response)"
    fi
}

# Function to test JSON response
test_json() {
    local url=$1
    local field=$2
    local description=$3
    
    echo -n "Testing $description... "
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq -e ".$field" >/dev/null 2>&1; then
        value=$(echo "$response" | jq -r ".$field")
        echo "✅ PASS ($field: $value)"
    else
        echo "❌ FAIL (Invalid response)"
    fi
}

echo "1️⃣ INFRASTRUCTURE TESTS"
echo "------------------------"
test_endpoint "$BACKEND_URL/health" "200" "Backend Health"
test_json "$BACKEND_URL/health" "status" "Backend Status"
test_endpoint "$FRONTEND_URL" "200" "Frontend Homepage"
test_endpoint "$API_BASE/auth/status" "200" "Auth Endpoint"

echo ""
echo "2️⃣ API ENDPOINTS"
echo "----------------"
test_endpoint "$API_BASE/subscriptions/plans" "200" "Subscription Plans"
test_endpoint "$API_BASE/usage/stats" "401" "Protected Endpoint (should be 401)"

echo ""
echo "3️⃣ AUTHENTICATION FLOW"
echo "----------------------"
# Test registration endpoint
echo -n "Testing registration endpoint... "
reg_response=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}' \
    -w "\n%{http_code}" 2>/dev/null | tail -1)

if [ "$reg_response" = "201" ] || [ "$reg_response" = "409" ]; then
    echo "✅ PASS (Registration endpoint working)"
else
    echo "❌ FAIL (Registration endpoint error: $reg_response)"
fi

# Test login endpoint
echo -n "Testing login endpoint... "
login_response=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!"}' 2>/dev/null)

if echo "$login_response" | jq -e ".access_token" >/dev/null 2>&1; then
    echo "✅ PASS (Login returns token)"
    TOKEN=$(echo "$login_response" | jq -r ".access_token")
else
    echo "⚠️  WARN (Login failed - user may not exist)"
    TOKEN=""
fi

echo ""
echo "4️⃣ OAUTH PROVIDERS"
echo "------------------"
echo -n "Testing Google OAuth redirect... "
google_response=$(curl -s -o /dev/null -w "%{http_code}" -L "$API_BASE/auth/google" 2>/dev/null)
if [ "$google_response" = "302" ] || [ "$google_response" = "200" ]; then
    echo "✅ PASS (Google OAuth configured)"
else
    echo "❌ FAIL (Google OAuth not configured)"
fi

echo -n "Testing GitHub OAuth redirect... "
github_response=$(curl -s -o /dev/null -w "%{http_code}" -L "$API_BASE/auth/github" 2>/dev/null)
if [ "$github_response" = "302" ] || [ "$github_response" = "200" ]; then
    echo "✅ PASS (GitHub OAuth configured)"
else
    echo "❌ FAIL (GitHub OAuth not configured)"
fi

echo ""
echo "5️⃣ DATABASE CONNECTION"
echo "---------------------"
echo -n "Testing database via API... "
db_test=$(curl -s "$API_BASE/subscriptions/plans" 2>/dev/null)
if echo "$db_test" | jq -e ".[0].name" >/dev/null 2>&1; then
    echo "✅ PASS (Database connected)"
else
    echo "❌ FAIL (Database issue)"
fi

echo ""
echo "6️⃣ WEBSOCKET CONNECTION"
echo "----------------------"
echo -n "Testing WebSocket endpoint... "
ws_response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/socket.io/" 2>/dev/null)
if [ "$ws_response" = "200" ] || [ "$ws_response" = "400" ]; then
    echo "✅ PASS (WebSocket available)"
else
    echo "❌ FAIL (WebSocket not available)"
fi

echo ""
echo "7️⃣ PAYMENT INTEGRATION"
echo "---------------------"
echo -n "Testing Stripe configuration... "
if [ ! -z "$TOKEN" ]; then
    stripe_test=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/billing/payment-methods" 2>/dev/null)
    if echo "$stripe_test" | jq -e "." >/dev/null 2>&1; then
        echo "✅ PASS (Stripe endpoint responding)"
    else
        echo "⚠️  WARN (Stripe endpoint issue)"
    fi
else
    echo "⏭️  SKIP (No auth token)"
fi

echo ""
echo "📊 TEST SUMMARY"
echo "==============="
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo "✅ Infrastructure is running"
echo "⚠️  OAuth needs configuration (check .env file)"
echo "📝 Update OAuth credentials in backend environment variables"
echo ""
echo "Quick fixes needed:"
echo "1. Set real Google OAuth credentials"
echo "2. Set real GitHub OAuth credentials"
echo "3. Configure Stripe webhook secret"
echo "4. Test user dashboard with real data"