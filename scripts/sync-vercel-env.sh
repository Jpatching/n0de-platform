#!/bin/bash

# N0DE Vercel Environment Variables Sync Script
# This script syncs environment variables to Vercel for the frontend
# Usage: ./scripts/sync-vercel-env.sh

set -e

echo "🚀 N0DE Vercel Environment Sync"
echo "================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Navigate to frontend directory
cd /tmp/n0de-frontend/n0de-website

echo "📋 Setting Vercel environment variables..."

# Backend API Configuration
vercel env add NEXT_PUBLIC_API_BASE_URL production <<< "https://api.n0de.pro/api/v1"
vercel env add NEXT_PUBLIC_WS_URL production <<< "wss://api.n0de.pro"
vercel env add NEXT_PUBLIC_AUTH_URL production <<< "https://api.n0de.pro"

# App Configuration
vercel env add NEXT_PUBLIC_APP_URL production <<< "https://www.n0de.pro"
vercel env add NEXT_PUBLIC_SITE_URL production <<< "https://www.n0de.pro"
vercel env add NEXT_PUBLIC_DOCS_URL production <<< "https://docs.n0de.pro"

# OAuth Configuration (public client IDs only)
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production <<< "56742975788-alfglgk3397oe5ji72ih5rlkv0f6djh6.apps.googleusercontent.com"
vercel env add NEXT_PUBLIC_GITHUB_CLIENT_ID production <<< "Ov23liiMzWVaA2FznWex"
vercel env add NEXT_PUBLIC_OAUTH_REDIRECT_URI production <<< "https://www.n0de.pro/auth/callback"

# Payment Configuration (public keys only)
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production <<< "pk_test_51S0uJaFjMnr2l5PiPihwLu1qonj1Gc0DBfAV713kkHvlBIItlpuWO1mM2iz5ChAP1378mxtLkPRBjEEbkFe1p7jQ00zeg1ijKQ"
vercel env add NEXT_PUBLIC_COINBASE_API_KEY production <<< "cc355dfa-8712-405e-b051-85a370793dfc"
vercel env add NEXT_PUBLIC_NOWPAYMENTS_API_KEY production <<< "ZQSEX5B-PNXMT10-QTXG21M-PCCE0FQ"

# Environment
vercel env add NODE_ENV production <<< "production"

echo "✅ Vercel environment variables set successfully!"
echo ""
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployment complete!"
echo "🌐 Frontend URL: https://www.n0de.pro"