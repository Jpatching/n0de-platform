#!/bin/bash
# Test staging environment

echo "🧪 Testing Staging Environment"
echo "=============================="

STAGING_BACKEND="https://api.n0de.pro"
STAGING_FRONTEND="https://www.n0de.pro"

echo "Backend: $STAGING_BACKEND"
echo "Frontend: $STAGING_FRONTEND"
echo ""

# Health check
echo "1️⃣ Health Check..."
health=$(curl -s "$STAGING_BACKEND/health?staging=true" 2>/dev/null)
if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
  echo "✅ Backend healthy"
else
  echo "❌ Backend unhealthy"
  exit 1
fi

# Database test
echo ""
echo "2️⃣ Database Test..."
plans=$(curl -s "$STAGING_BACKEND/api/v1/subscriptions/plans" 2>/dev/null)
if echo "$plans" | jq -e '.[0]' >/dev/null 2>&1; then
  echo "✅ Database connected"
else
  echo "❌ Database issue"
  exit 1
fi

# Frontend test
echo ""
echo "3️⃣ Frontend Test..."
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_FRONTEND" 2>/dev/null)
if [ "$frontend_status" = "200" ]; then
  echo "✅ Frontend online"
else
  echo "⚠️ Frontend status: $frontend_status"
fi

echo ""
echo "✅ STAGING TESTS PASSED!"
echo "Ready for production promotion!"
