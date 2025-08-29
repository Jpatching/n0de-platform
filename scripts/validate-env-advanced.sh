#!/bin/bash

# N0DE Advanced Environment Variables Validation Script
# This script provides detailed analysis and recommendations
# Usage: ./scripts/validate-env-advanced.sh

set -e

echo "🔍 N0DE Advanced Environment Analysis"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Analysis counters
TOTAL_VARS=0
VALID_VARS=0
INVALID_VARS=0
PLACEHOLDER_VARS=0
MISSING_VARS=0

echo ""
echo "📋 Getting current Railway environment variables..."

# Get Railway variables using MCP
RAILWAY_VARS_JSON=$(railway variables --json 2>/dev/null || echo "{}")

echo "✅ Railway variables retrieved"
echo ""

# Function to check Railway variable
check_railway_var() {
    local var_name=$1
    local expected_pattern=$2
    local var_value
    
    # Extract variable value from JSON
    var_value=$(echo "$RAILWAY_VARS_JSON" | grep "\"$var_name\":" | cut -d':' -f2- | sed 's/[",]//g' | xargs 2>/dev/null || echo "")
    
    ((TOTAL_VARS++))
    
    if [[ -z "$var_value" ]]; then
        echo -e "❌ ${RED}$var_name${NC}: MISSING"
        ((MISSING_VARS++))
        return 1
    elif [[ "$var_value" =~ $expected_pattern ]]; then
        echo -e "✅ ${GREEN}$var_name${NC}: Valid ($var_value)"
        ((VALID_VARS++))
        return 0
    elif [[ "$var_value" == *"your-"* || "$var_value" == *"placeholder"* || "$var_value" == *"test_"* ]]; then
        echo -e "⚠️ ${YELLOW}$var_name${NC}: Placeholder value ($var_value)"
        ((PLACEHOLDER_VARS++))
        return 1
    else
        echo -e "❓ ${BLUE}$var_name${NC}: Present but needs validation ($var_value)"
        ((INVALID_VARS++))
        return 1
    fi
}

# Test Railway service health
test_service_health() {
    echo "🏥 Testing service health and connectivity..."
    
    local backend_url="https://n0de-backend-production-4e34.up.railway.app"
    
    # Test health endpoint
    if curl -s "$backend_url/health" > /dev/null 2>&1; then
        echo -e "✅ ${GREEN}Backend health endpoint responding${NC}"
        
        # Get health details
        local health_response=$(curl -s "$backend_url/health")
        echo "   Status: $(echo "$health_response" | grep -o '"status":"[^"]*' | cut -d':' -f2 | tr -d '"')"
        echo "   Environment: $(echo "$health_response" | grep -o '"environment":"[^"]*' | cut -d':' -f2 | tr -d '"')"
    else
        echo -e "❌ ${RED}Backend health endpoint not responding${NC}"
    fi
    
    # Test OAuth endpoints
    echo ""
    echo "🔐 Testing OAuth endpoints..."
    
    local google_status=$(curl -s -o /dev/null -w "%{http_code}" "$backend_url/api/v1/auth/google" || echo "000")
    local github_status=$(curl -s -o /dev/null -w "%{http_code}" "$backend_url/api/v1/auth/github" || echo "000")
    
    if [[ "$google_status" == "302" ]]; then
        echo -e "✅ ${GREEN}Google OAuth redirect working${NC} (HTTP $google_status)"
    else
        echo -e "❌ ${RED}Google OAuth endpoint issue${NC} (HTTP $google_status)"
    fi
    
    if [[ "$github_status" == "302" ]]; then
        echo -e "✅ ${GREEN}GitHub OAuth redirect working${NC} (HTTP $github_status)"
    else
        echo -e "❌ ${RED}GitHub OAuth endpoint issue${NC} (HTTP $github_status)"
    fi
}

# Core validation
echo "🔧 Core Application Variables:"
check_railway_var "NODE_ENV" "^production$"
check_railway_var "PORT" "^[0-9]+$"
check_railway_var "DATABASE_URL" "^postgresql://.*"
check_railway_var "REDIS_URL" "^redis://.*"

echo ""
echo "🌐 URL Configuration:"
check_railway_var "FRONTEND_URL" "^https://.*n0de\.pro$"
check_railway_var "BASE_URL" "^https://.*railway\.app$"
check_railway_var "SERVER_URL" "^https://.*railway\.app$"

echo ""
echo "🔐 Authentication & Security:"
check_railway_var "JWT_SECRET" "^.{20,}$"
check_railway_var "JWT_EXPIRES_IN" "^[0-9]+[hmd]$"
check_railway_var "JWT_REFRESH_SECRET" "^.{20,}$"
check_railway_var "SESSION_SECRET" "^.{20,}$"

echo ""
echo "🔑 OAuth Configuration:"
check_railway_var "GOOGLE_CLIENT_ID" "^[0-9]+-.*\.apps\.googleusercontent\.com$"
check_railway_var "GOOGLE_CLIENT_SECRET" "^GOCSPX-.*"
check_railway_var "GITHUB_CLIENT_ID" "^Ov[0-9A-Za-z]+$"
check_railway_var "GITHUB_CLIENT_SECRET" "^[0-9a-f]+$"

echo ""
echo "💳 Payment Providers:"
check_railway_var "STRIPE_SECRET_KEY" "^sk_(live|test)_[0-9A-Za-z]+$"
check_railway_var "STRIPE_WEBHOOK_SECRET" "^whsec_.*"
check_railway_var "COINBASE_COMMERCE_API_KEY" "^[0-9a-f-]+$"
check_railway_var "NOWPAYMENTS_API_KEY" "^[A-Z0-9-]+$"

echo ""
echo "🛡️ Security & Rate Limiting:"
check_railway_var "RATE_LIMIT_MAX" "^[0-9]+$"
check_railway_var "RATE_LIMIT_TTL" "^[0-9]+$"
check_railway_var "CORS_ORIGINS" ".*n0de\.pro.*"

echo ""
test_service_health

echo ""
echo "📊 DETAILED ANALYSIS SUMMARY"
echo "============================="
echo -e "Total Variables Checked: ${BLUE}$TOTAL_VARS${NC}"
echo -e "✅ ${GREEN}Valid & Configured: $VALID_VARS${NC}"
echo -e "❌ ${RED}Missing Variables: $MISSING_VARS${NC}"
echo -e "⚠️ ${YELLOW}Placeholder Values: $PLACEHOLDER_VARS${NC}"
echo -e "❓ ${BLUE}Needs Manual Validation: $INVALID_VARS${NC}"

echo ""
echo "🎯 PRIORITY ACTIONS NEEDED"
echo "=========================="

if [[ $MISSING_VARS -gt 0 ]]; then
    echo -e "${RED}HIGH PRIORITY: Fix missing variables${NC}"
    echo "   • Run: railway variables --set \"VARIABLE_NAME=value\""
fi

if [[ $PLACEHOLDER_VARS -gt 0 ]]; then
    echo -e "${YELLOW}MEDIUM PRIORITY: Replace placeholder values${NC}"
    echo "   • Update test/placeholder values with production credentials"
fi

if [[ $INVALID_VARS -gt 0 ]]; then
    echo -e "${BLUE}LOW PRIORITY: Validate questionable values${NC}"
    echo "   • Review variables that don't match expected patterns"
fi

# Calculate success percentage
SUCCESS_PERCENTAGE=$((VALID_VARS * 100 / TOTAL_VARS))

echo ""
echo "🏆 OVERALL CONFIGURATION HEALTH"
echo "==============================="
echo -e "Configuration Score: ${GREEN}$SUCCESS_PERCENTAGE%${NC}"

if [[ $SUCCESS_PERCENTAGE -ge 90 ]]; then
    echo -e "Status: ${GREEN}EXCELLENT - Ready for production${NC}"
    exit 0
elif [[ $SUCCESS_PERCENTAGE -ge 75 ]]; then
    echo -e "Status: ${YELLOW}GOOD - Minor issues to fix${NC}"
    exit 1
elif [[ $SUCCESS_PERCENTAGE -ge 50 ]]; then
    echo -e "Status: ${YELLOW}NEEDS WORK - Several issues detected${NC}"
    exit 1
else
    echo -e "Status: ${RED}CRITICAL - Major configuration problems${NC}"
    exit 1
fi