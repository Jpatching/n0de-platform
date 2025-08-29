#!/bin/bash

# N0DE Environment Variables Validation Script
# This script validates that all required environment variables are set
# Usage: ./scripts/validate-env.sh [railway|vercel|local]

set -e

ENVIRONMENT=${1:-"railway"}

echo "🔍 N0DE Environment Validation"
echo "=============================="
echo "Environment: $ENVIRONMENT"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation counters
MISSING_COUNT=0
PRESENT_COUNT=0

validate_variable() {
    local var_name=$1
    local var_value
    
    case $ENVIRONMENT in
        "railway")
            # Use Railway MCP to get variables in JSON format and parse
            var_value=$(railway variables --json 2>/dev/null | grep "\"$var_name\":" | cut -d':' -f2- | tr -d '",' | xargs 2>/dev/null || echo "")
            ;;
        "local")
            var_value=$(grep "^$var_name=" .env 2>/dev/null | cut -d'=' -f2- || echo "")
            ;;
        "vercel")
            echo -e "${YELLOW}Note: Vercel validation requires manual check in dashboard${NC}"
            return 0
            ;;
    esac
    
    if [[ -n "$var_value" && "$var_value" != "your-"* && "$var_value" != "" ]]; then
        echo -e "✅ ${GREEN}$var_name${NC}: Present"
        ((PRESENT_COUNT++))
    else
        echo -e "❌ ${RED}$var_name${NC}: Missing or placeholder"
        ((MISSING_COUNT++))
    fi
}

echo "🔧 Core Application Variables:"
validate_variable "NODE_ENV"
validate_variable "PORT"
validate_variable "DATABASE_URL"
validate_variable "REDIS_URL"

echo ""
echo "🌐 URL Configuration:"
validate_variable "FRONTEND_URL"
validate_variable "BASE_URL"
validate_variable "SERVER_URL"
validate_variable "CORS_ORIGINS"

echo ""
echo "🔐 Authentication Variables:"
validate_variable "JWT_SECRET"
validate_variable "JWT_EXPIRES_IN"
validate_variable "JWT_REFRESH_SECRET"
validate_variable "JWT_REFRESH_EXPIRES_IN"
validate_variable "SESSION_SECRET"

echo ""
echo "🔑 OAuth Configuration:"
validate_variable "GOOGLE_CLIENT_ID"
validate_variable "GOOGLE_CLIENT_SECRET"
validate_variable "GOOGLE_OAUTH_REDIRECT_URI"
validate_variable "GITHUB_CLIENT_ID"
validate_variable "GITHUB_CLIENT_SECRET"
validate_variable "GITHUB_OAUTH_REDIRECT_URI"

echo ""
echo "💳 Payment Providers:"
validate_variable "STRIPE_SECRET_KEY"
validate_variable "STRIPE_WEBHOOK_SECRET"
validate_variable "COINBASE_COMMERCE_API_KEY"
validate_variable "COINBASE_COMMERCE_WEBHOOK_SECRET"
validate_variable "NOWPAYMENTS_API_KEY"
validate_variable "NOWPAYMENTS_IPN_SECRET"

echo ""
echo "🛡️ Security & Rate Limiting:"
validate_variable "RATE_LIMIT_MAX"
validate_variable "RATE_LIMIT_TTL"
validate_variable "OAUTH_SUCCESS_REDIRECT"
validate_variable "OAUTH_FAILURE_REDIRECT"

echo ""
echo "📊 Summary:"
echo "==========="
echo -e "✅ ${GREEN}Present: $PRESENT_COUNT${NC}"
echo -e "❌ ${RED}Missing: $MISSING_COUNT${NC}"

if [ $MISSING_COUNT -eq 0 ]; then
    echo ""
    echo -e "🎉 ${GREEN}All environment variables are properly configured!${NC}"
    
    # Test backend health if it's Railway validation
    if [ "$ENVIRONMENT" = "railway" ]; then
        echo ""
        echo "🏥 Testing backend health..."
        if curl -s https://n0de-backend-production-4e34.up.railway.app/health > /dev/null; then
            echo -e "✅ ${GREEN}Backend health check passed${NC}"
        else
            echo -e "⚠️ ${YELLOW}Backend health check failed - service may be starting${NC}"
        fi
    fi
    
    exit 0
else
    echo ""
    echo -e "⚠️ ${YELLOW}Please fix missing environment variables before deploying${NC}"
    exit 1
fi