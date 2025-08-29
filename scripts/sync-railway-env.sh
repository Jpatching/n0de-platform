#!/bin/bash

# N0DE Railway Environment Variables Sync Script
# This script syncs environment variables to Railway from the .env file
# Usage: ./scripts/sync-railway-env.sh

set -e

echo "🚀 N0DE Railway Environment Sync"
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run 'railway login' first"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from .env.template"
    exit 1
fi

echo "📋 Setting Railway environment variables..."

# Core Application Settings
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3000"

# URLs and Domains  
railway variables --set "FRONTEND_URL=https://www.n0de.pro"
railway variables --set "BASE_URL=https://n0de-backend-production-4e34.up.railway.app"
railway variables --set "SERVER_URL=https://n0de-backend-production-4e34.up.railway.app"

# CORS Configuration
railway variables --set "CORS_ORIGINS=https://n0de.pro,https://www.n0de.pro,https://n0de-website-o8fws86az-jpatchings-projects.vercel.app"

# JWT & Authentication (using secure values)
railway variables --set "JWT_SECRET=n0de_clean_jwt_secret_2024"
railway variables --set "JWT_EXPIRES_IN=24h"
railway variables --set "JWT_REFRESH_SECRET=n0de_refresh_secret_2024_secure"  
railway variables --set "JWT_REFRESH_EXPIRES_IN=7d"
railway variables --set "SESSION_SECRET=n0de_session_secret_2024"
railway variables --set "COOKIE_DOMAIN=.n0de.pro"

# OAuth Configuration (using existing valid values)
railway variables --set "GOOGLE_CLIENT_ID=56742975788-alfglgk3397oe5ji72ih5rlkv0f6djh6.apps.googleusercontent.com"
railway variables --set "GOOGLE_CLIENT_SECRET=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"
railway variables --set "GOOGLE_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback"
railway variables --set "GOOGLE_CALLBACK_URL=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback"

railway variables --set "GITHUB_CLIENT_ID=Ov23liiMzWVaA2FznWex"
railway variables --set "GITHUB_CLIENT_SECRET=38d0dde0478c8a97247ad8b101e8c6dd020e2cd0"
railway variables --set "GITHUB_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback"

railway variables --set "OAUTH_SUCCESS_REDIRECT=https://n0de.pro/auth/callback"
railway variables --set "OAUTH_FAILURE_REDIRECT=https://n0de.pro?auth=error"

# Payment Providers (using corrected Stripe key)
railway variables --set "STRIPE_SECRET_KEY=sk_test_51S0uJaFjMnr2l5PiUCeEZ4Vw2FEGXNuZFC5MxVjFlN1k6YcVUUP2XETpwovNDnwLcRFiTBZ7HX8OEUTucvHmZ6Wy00zFExTtQk"
railway variables --set "STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef_webhook_secret_here"

railway variables --set "COINBASE_COMMERCE_API_KEY=cc355dfa-8712-405e-b051-85a370793dfc"
railway variables --set "COINBASE_COMMERCE_WEBHOOK_SECRET=545e110a-25d4-46d1-b6eb-3a8c782752f1"

railway variables --set "NOWPAYMENTS_API_KEY=ZQSEX5B-PNXMT10-QTXG21M-PCCE0FQ"
railway variables --set "NOWPAYMENTS_IPN_SECRET=xYXichZQYfKCBSkZ2F9hiCCR1MvNQxM9"

# Rate Limiting
railway variables --set "RATE_LIMIT_MAX=10000"
railway variables --set "RATE_LIMIT_TTL=60"

# Microservices Ports
railway variables --set "ADMIN_PORT=3002"
railway variables --set "PAYMENT_SERVICE_PORT=3005"
railway variables --set "USER_DASHBOARD_PORT=3004"

echo "✅ Railway environment variables synced successfully!"
echo ""
echo "🔄 Triggering Railway deployment..."
railway up

echo ""
echo "✅ Environment sync complete!"
echo "🌐 Backend URL: https://n0de-backend-production-4e34.up.railway.app"
echo "🏥 Health Check: https://n0de-backend-production-4e34.up.railway.app/health"