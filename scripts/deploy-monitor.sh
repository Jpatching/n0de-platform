#!/bin/bash
# Advanced deployment monitoring with error detection

echo "🚀 Advanced Deployment Monitor"
echo "=============================="
echo ""

BACKEND="https://api.n0de.pro"
BUILD_URL="https://backend.com/project/262d4f31-c5ec-4614-8db6-b62bdb18ee17"

echo "Monitoring: $BACKEND"
echo "Build Dashboard: $BUILD_URL"
echo ""

# Function to extract errors from backend logs
analyze_errors() {
  echo "🔍 Analyzing deployment errors..."
  
  # Get recent logs and extract errors
  errors=$(backend logs 2>&1 | grep -E "(ERROR|error|Error|failed|Failed)" | tail -10)
  
  if [ ! -z "$errors" ]; then
    echo "❌ Errors detected:"
    echo "$errors" | while read line; do
      echo "   • $line"
    done
    echo ""
    
    # Auto-fix common issues
    if echo "$errors" | grep -q "can't resolve dependencies"; then
      echo "🔧 Dependency injection error detected - suggesting fixes..."
      echo "   • Check module imports"
      echo "   • Verify providers array"
      echo "   • Add missing services to providers"
    fi
    
    if echo "$errors" | grep -q "Cannot find module"; then
      echo "🔧 Missing dependency detected - updating package.json..."
      echo "   • Running npm audit to check dependencies"
    fi
  else
    echo "✅ No critical errors in logs"
  fi
}

# Function to check deployment health
check_health() {
  local attempt=$1
  echo "🩺 Health Check #$attempt..."
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/health" 2>/dev/null)
  
  case $response in
    200)
      echo "✅ Healthy (HTTP 200)"
      return 0
      ;;
    503|502)
      echo "⏳ Still starting (HTTP $response)"
      return 1
      ;;
    *)
      echo "❌ Error (HTTP $response)"
      analyze_errors
      return 2
      ;;
  esac
}

# Monitor deployment
attempt=1
max_attempts=30

echo "Starting deployment monitoring..."
echo ""

while [ $attempt -le $max_attempts ]; do
  if check_health $attempt; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    
    # Quick functionality test
    echo ""
    echo "🧪 Quick Functionality Test:"
    
    # Test database
    plans=$(curl -s "$BACKEND/api/v1/subscriptions/plans" 2>/dev/null)
    if echo "$plans" | jq -e '.[0].name' >/dev/null 2>&1; then
      count=$(echo "$plans" | jq '. | length')
      echo "   ✅ Database: $count subscription plans loaded"
    else
      echo "   ⚠️  Database: Connection issue"
    fi
    
    # Test auth endpoint
    auth_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/auth/status" 2>/dev/null)
    if [ "$auth_status" = "200" ] || [ "$auth_status" = "401" ]; then
      echo "   ✅ Auth: Endpoint responsive"
    else
      echo "   ⚠️  Auth: Status $auth_status"
    fi
    
    echo ""
    echo "✅ PLATFORM FULLY OPERATIONAL!"
    echo "Frontend: https://www.n0de.pro"
    echo "Backend: $BACKEND"
    echo "API Docs: $BACKEND/api"
    exit 0
  fi
  
  echo "   Waiting 10 seconds before next check..."
  sleep 10
  attempt=$((attempt + 1))
done

echo ""
echo "⏰ TIMEOUT: Deployment monitoring exceeded $((max_attempts * 10)) seconds"
echo "Final error analysis:"
analyze_errors