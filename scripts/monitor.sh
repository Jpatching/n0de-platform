#!/bin/bash
# Real-time deployment and error monitoring

export RAILWAY_TOKEN="112c11ee-16ab-42bc-a23f-c7c06f32fff0"

echo "👀 Real-time N0DE Platform Monitor"
echo "=================================="

while true; do
  clear
  echo "📊 Live Status $(date)"
  echo "====================="
  
  # Backend health
  health=$(curl -s https://n0de-backend-production-4e34.up.railway.app/health 2>/dev/null)
  if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
    status=$(echo "$health" | jq -r '.status')
    uptime=$(echo "$health" | jq -r '.uptime')
    echo "✅ Backend: $status (${uptime}s uptime)"
  else
    echo "❌ Backend: Offline"
  fi
  
  # Database check
  plans=$(curl -s https://n0de-backend-production-4e34.up.railway.app/api/v1/subscriptions/plans 2>/dev/null)
  if echo "$plans" | jq -e '.[0]' >/dev/null 2>&1; then
    count=$(echo "$plans" | jq '. | length')
    echo "✅ Database: Connected ($count plans)"
  else
    echo "❌ Database: Disconnected"
  fi
  
  # Frontend check
  frontend=$(curl -s -o /dev/null -w "%{http_code}" https://www.n0de.pro 2>/dev/null)
  echo "✅ Frontend: HTTP $frontend"
  
  # Recent errors
  echo ""
  echo "🔍 Recent Errors:"
  RAILWAY_TOKEN=$RAILWAY_TOKEN railway logs 2>&1 | grep -E "(ERROR|error)" | tail -3 | sed 's/^/   /'
  
  echo ""
  echo "Press Ctrl+C to stop monitoring..."
  sleep 10
done
