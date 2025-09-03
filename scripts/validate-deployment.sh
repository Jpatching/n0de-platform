#!/bin/bash
# Validate the complete deployment

echo "🔍 N0DE Platform Deployment Validation"
echo "======================================="
echo ""

BACKEND="https://api.n0de.pro"
FRONTEND="https://www.n0de.pro"

# Function to check endpoint
check_endpoint() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo "✅ OK ($response)"
        return 0
    else
        echo "❌ Failed ($response)"
        return 1
    fi
}

echo "📡 Infrastructure Status:"
echo "------------------------"
check_endpoint "$BACKEND/health" "Backend Health"
check_endpoint "$FRONTEND" "Frontend Homepage"
check_endpoint "$BACKEND/api/v1/subscriptions/plans" "API Endpoint"

echo ""
echo "🧪 Authentication Test:"
echo "----------------------"
# Try to create a test account
echo -n "Creating test account... "
reg_response=$(curl -s -X POST "$BACKEND/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$(date +%s)'@example.com","password":"Test123!","name":"Test User"}' \
    -w "\n%{http_code}" 2>/dev/null | tail -1)

if [ "$reg_response" = "201" ]; then
    echo "✅ Registration works!"
elif [ "$reg_response" = "409" ]; then
    echo "⚠️  User exists (expected)"
else
    echo "❌ Registration failed ($reg_response)"
fi

echo ""
echo "📊 Summary:"
echo "----------"
echo "Backend URL:  $BACKEND"
echo "Frontend URL: $FRONTEND"
echo "API Docs:     $BACKEND/api"
echo ""

# Final status
if check_endpoint "$BACKEND/health" "" > /dev/null 2>&1; then
    echo "✅ Platform is OPERATIONAL!"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Visit $FRONTEND to test the UI"
    echo "2. Create an account or login"
    echo "3. Access the dashboard"
    echo "4. Test RPC endpoints"
else
    echo "⚠️  Platform deployment in progress..."
    echo "Check backend logs for details"
fi