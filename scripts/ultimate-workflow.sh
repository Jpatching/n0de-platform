#!/bin/bash
# Ultimate Development Workflow - One Command Deploy

set -e

# Verify required tokens are set in environment
if [ -z "$RAILWAY_API_TOKEN" ] && [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ Missing RAILWAY_API_TOKEN or RAILWAY_TOKEN environment variable"
    echo "Run: export RAILWAY_API_TOKEN=your_token_here"
    exit 1
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Missing VERCEL_TOKEN environment variable" 
    echo "Run: export VERCEL_TOKEN=your_token_here"
    exit 1
fi
echo "🚀 N0DE Ultimate Deployment Pipeline"
echo "====================================="

# Environment detection
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" ]]; then
    ENV="production"
    FRONTEND_URL="https://www.n0de.pro"
elif [[ "$BRANCH" == "staging" ]]; then
    ENV="staging"  
    FRONTEND_URL="https://www.n0de.pro"
else
    ENV="development"
    FRONTEND_URL="http://localhost:3000"
fi

echo "📍 Branch: $BRANCH | Environment: $ENV"
echo ""

# 1. Build & Test Backend
echo "1️⃣ Building Backend..."
npm install --silent 2>/dev/null || npm install
npx prisma generate --no-hints
npm run build

# 2. Deploy Backend to Railway
echo ""
echo "2️⃣ Deploying Backend to Railway..."
railway up --detach
echo "⏳ Waiting for deployment..."
sleep 45

# 3. Test Backend Health
echo ""
echo "3️⃣ Testing Backend Health..."
BACKEND_URL="https://n0de-backend-production-4e34.up.railway.app"
health=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend deployment failed"
    exit 1
fi

# 4. Test Auth Routes
echo ""
echo "4️⃣ Testing Auth Routes..."
auth_test=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/auth/google" 2>/dev/null)
if [ "$auth_test" = "302" ]; then
    echo "✅ Auth routes working"
else
    echo "❌ Auth routes failed: $auth_test"
    exit 1
fi

# 5. Deploy Frontend
echo ""
echo "5️⃣ Deploying Frontend..."
cd frontend/n0de-website

# Update frontend environment
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL/api/v1
NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL
NEXT_PUBLIC_FRONTEND_URL=$FRONTEND_URL
NEXT_PUBLIC_ENVIRONMENT=$ENV
EOF

# Deploy to Vercel
npm install --silent
npm run build
VERCEL_OUTPUT=$(vercel --prod --yes --token $VERCEL_TOKEN)
VERCEL_DEPLOYMENT_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[a-zA-Z0-9.-]*.vercel.app' | tail -1)

# Alias to production domain
if [[ "$ENV" == "production" ]]; then
    vercel alias "$VERCEL_DEPLOYMENT_URL" www.n0de.pro --token $VERCEL_TOKEN
    vercel alias "$VERCEL_DEPLOYMENT_URL" n0de.pro --token $VERCEL_TOKEN
    ACTUAL_FRONTEND_URL="https://www.n0de.pro"
    echo "🌐 Frontend aliased to: $ACTUAL_FRONTEND_URL"
else
    ACTUAL_FRONTEND_URL="$VERCEL_DEPLOYMENT_URL"  
    echo "🚀 Frontend deployed to: $ACTUAL_FRONTEND_URL"
fi

cd ../..

# 6. Final Integration Test  
echo ""
echo "6️⃣ Final Integration Test..."
if [ -n "$ACTUAL_FRONTEND_URL" ]; then
    FRONTEND_TEST_URL="$ACTUAL_FRONTEND_URL"
else
    FRONTEND_TEST_URL="$FRONTEND_URL"
fi

frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_TEST_URL" 2>/dev/null)
if [ "$frontend_status" = "200" ]; then
    echo "✅ Frontend deployed successfully"
else
    echo "⚠️ Frontend status: $frontend_status"
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo "🌐 Backend: $BACKEND_URL"
if [ -n "$ACTUAL_FRONTEND_URL" ]; then
    echo "🖥️ Frontend: $ACTUAL_FRONTEND_URL"
else
    echo "🖥️ Frontend: $FRONTEND_URL"
fi
echo "📚 API Docs: $BACKEND_URL/docs"
echo "🔐 Auth Test: $BACKEND_URL/api/v1/auth/google"
echo ""
echo "✨ Ready for users!"