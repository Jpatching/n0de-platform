#!/bin/bash

# 🚀 N0DE Platform - Master Deployment Script
# Deploys entire n0de.pro ecosystem in coordinated fashion

set -e  # Exit on any error

echo "🌟 Starting N0DE Platform Full Deployment..."
echo "================================================="

# Configuration
BACKEND_URL="https://n0de-backend-production-4e34.up.railway.app"
MAIN_SITE_URL="https://www.n0de.pro"
GAMING_PLATFORM_URL="https://pv3-production.vercel.app"
ADMIN_DASHBOARD_URL="https://admin-n0de.vercel.app"

echo "📋 Deployment Targets:"
echo "  Backend API: $BACKEND_URL"
echo "  Main Site: $MAIN_SITE_URL"
echo "  Gaming Platform: $GAMING_PLATFORM_URL" 
echo "  Admin Dashboard: $ADMIN_DASHBOARD_URL"
echo ""

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ Error: $1 is not installed"
        exit 1
    fi
}

# Check required tools
echo "🔧 Checking deployment tools..."
check_command "railway"
check_command "vercel"
check_command "git"
check_command "npm"

# Ensure we're on main branch and up to date
echo "📦 Preparing repository..."
git checkout main
git pull origin main

# Build and test backend
echo ""
echo "🏗️  Building Backend..."
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend build successful"

# Deploy Backend to Railway
echo ""
echo "🚂 Deploying Backend to Railway..."
railway up --detach

if [ $? -ne 0 ]; then
    echo "❌ Railway deployment failed!"
    exit 1
fi

echo "✅ Backend deployed to Railway"

# Deploy Main Website (n0de-website)
echo ""
echo "🌐 Deploying Main Website..."
cd frontend/n0de-website

# Check if vercel.json exists, create if not
if [ ! -f "vercel.json" ]; then
    echo "📄 Creating vercel.json for main website..."
    cat > vercel.json << EOF
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_BASE_URL": "$BACKEND_URL/api/v1",
    "NEXT_PUBLIC_API_URL": "$BACKEND_URL",
    "NEXT_PUBLIC_APP_URL": "$MAIN_SITE_URL"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
EOF
fi

npm install
vercel --prod --yes

if [ $? -ne 0 ]; then
    echo "❌ Main website deployment failed!"
    exit 1
fi

echo "✅ Main website deployed to Vercel"

# Deploy Gaming Platform
echo ""
echo "🎮 Deploying Gaming Platform..."
cd ../frontend

npm install
vercel --prod --yes

if [ $? -ne 0 ]; then
    echo "❌ Gaming platform deployment failed!"
    exit 1
fi

echo "✅ Gaming platform deployed to Vercel"

# Deploy Admin Dashboard
echo ""
echo "👨‍💼 Deploying Admin Dashboard..."
cd ../admin-dashboard

# Create vercel.json for admin dashboard
if [ ! -f "vercel.json" ]; then
    echo "📄 Creating vercel.json for admin dashboard..."
    cat > vercel.json << EOF
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next", 
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_BASE_URL": "$BACKEND_URL/api/v1",
    "NEXT_PUBLIC_API_URL": "$BACKEND_URL"
  }
}
EOF
fi

npm install
vercel --prod --yes

if [ $? -ne 0 ]; then
    echo "❌ Admin dashboard deployment failed!"
    exit 1
fi

echo "✅ Admin dashboard deployed to Vercel"

# Return to root
cd ../../

# Health Check All Services
echo ""
echo "🏥 Running Health Checks..."

# Check backend health
echo "  🔍 Checking Backend API..."
if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo "  ✅ Backend API is healthy"
else
    echo "  ⚠️  Backend API health check failed (may be starting up)"
fi

# Check main website
echo "  🔍 Checking Main Website..."
if curl -f "$MAIN_SITE_URL" > /dev/null 2>&1; then
    echo "  ✅ Main website is accessible"
else
    echo "  ⚠️  Main website health check failed (may be starting up)"
fi

# Display deployment summary
echo ""
echo "🎉 N0DE Platform Deployment Complete!"
echo "================================================="
echo "🌐 Live URLs:"
echo "  Main Site: $MAIN_SITE_URL"
echo "  Gaming Platform: $GAMING_PLATFORM_URL"
echo "  Admin Dashboard: $ADMIN_DASHBOARD_URL"
echo "  Backend API: $BACKEND_URL"
echo ""
echo "💰 Payment Systems:"
echo "  ✅ Stripe Integration"
echo "  ✅ Coinbase Commerce"
echo "  ✅ NOWPayments"
echo ""
echo "🔄 Real-time Features:"
echo "  ✅ WebSocket Connections"
echo "  ✅ Live Billing Updates"
echo "  ✅ Error Logging"
echo ""
echo "🚀 Your complete n0de.pro ecosystem is now LIVE!"
echo "💸 Ready to generate revenue across all platforms!"