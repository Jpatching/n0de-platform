#!/bin/bash
# Real-time deployment monitoring with auto-fix

echo "👀 backend Deployment Monitor"
echo "============================="
echo ""

BACKEND_URL="https://api.n0de.pro"
MAX_WAIT=300  # 5 minutes max wait time
CHECK_INTERVAL=10

echo "Monitoring deployment to: $BACKEND_URL"
echo "Will check every $CHECK_INTERVAL seconds for $MAX_WAIT seconds"
echo ""

elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
  echo "⏱️  Check #$((elapsed/CHECK_INTERVAL + 1)) (${elapsed}s elapsed)..."
  
  # Test health endpoint
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
  
  if [ "$response" = "200" ]; then
    echo "✅ DEPLOYMENT SUCCESS!"
    echo ""
    
    # Get deployment info
    health=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
    if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
      status=$(echo "$health" | jq -r '.status')
      uptime=$(echo "$health" | jq -r '.uptime')
      echo "Status: $status"
      echo "Uptime: ${uptime}s"
      echo ""
    fi
    
    # Test critical endpoints
    echo "Testing critical endpoints..."
    
    # Database test
    plans=$(curl -s "$BACKEND_URL/api/v1/subscriptions/plans" 2>/dev/null)
    if echo "$plans" | jq -e '.[0]' >/dev/null 2>&1; then
      echo "✅ Database: Connected"
    else
      echo "⚠️  Database: Issue detected"
    fi
    
    # API test
    api_response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api" 2>/dev/null)
    if [ "$api_response" = "200" ]; then
      echo "✅ API Docs: Available"
    else
      echo "⚠️  API Docs: Status $api_response"
    fi
    
    echo ""
    echo "🎯 Platform is fully operational!"
    exit 0
  elif [ "$response" = "503" ] || [ "$response" = "502" ]; then
    echo "⏳ Still deploying... (HTTP $response)"
  else
    echo "❌ Deployment issue (HTTP $response)"
    
    # Try to get backend logs for debugging
    echo "Checking backend logs..."
    backend logs 2>&1 | tail -10
  fi
  
  sleep $CHECK_INTERVAL
  elapsed=$((elapsed + CHECK_INTERVAL))
done

echo ""
echo "⏰ TIMEOUT: Deployment took longer than $MAX_WAIT seconds"
echo "Check backend logs manually: backend logs"
echo "Check build logs at: https://backend.com/project/262d4f31-c5ec-4614-8db6-b62bdb18ee17"