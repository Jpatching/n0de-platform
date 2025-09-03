#!/bin/bash
# Test if the build was successful

echo "🔍 Testing N0DE Backend Build"
echo "=============================="
echo ""

BACKEND="https://api.n0de.pro"

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
health=$(curl -s "$BACKEND/health" 2>/dev/null)
if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
  status=$(echo "$health" | jq -r '.status')
  uptime=$(echo "$health" | jq -r '.uptime')
  echo "   ✅ Health: $status (uptime: ${uptime}s)"
else
  echo "   ❌ Health check failed"
fi

# Test 2: API Endpoints
echo ""
echo "2️⃣ Testing API Endpoints..."
api_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api" 2>/dev/null)
if [ "$api_status" = "200" ]; then
  echo "   ✅ API docs: Available at /api"
else
  echo "   ⚠️  API docs: Status $api_status"
fi

# Test 3: Database
echo ""
echo "3️⃣ Testing Database Connection..."
plans=$(curl -s "$BACKEND/api/v1/subscriptions/plans" 2>/dev/null)
if echo "$plans" | jq -e '.[0].name' >/dev/null 2>&1; then
  count=$(echo "$plans" | jq '. | length')
  echo "   ✅ Database: Connected ($count subscription plans)"
else
  echo "   ❌ Database: Connection failed"
fi

echo ""
echo "📊 Build Test Summary:"
echo "====================="
echo "Backend URL: $BACKEND"
echo ""
if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
  echo "✅ BUILD SUCCESSFUL - Platform is operational!"
else
  echo "❌ BUILD FAILED - Check backend logs"
fi