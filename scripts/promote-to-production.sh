#!/bin/bash
# Promote staging to production after validation

echo "🚀 Promoting Staging to Production"
echo "=================================="
echo ""

# Step 1: Run staging tests
echo "1️⃣ Running staging validation..."
if ! ./test-staging.sh; then
  echo "❌ Staging tests failed - cannot promote to production"
  exit 1
fi

echo ""
echo "2️⃣ Promoting to production..."

# Switch to main branch
git checkout main
git pull origin main

# Merge staging changes
git merge staging --no-edit

# Deploy to production
echo "Deploying to production Railway..."
railway up --detach

# Deploy frontend to production
echo "Deploying frontend to production Vercel..."
cd frontend/n0de-website
vercel --prod --yes
cd ../..

echo ""
echo "3️⃣ Monitoring production deployment..."
sleep 30

# Verify production health
prod_health=$(curl -s https://n0de-backend-production-4e34.up.railway.app/health 2>/dev/null)
if echo "$prod_health" | jq -e '.status' >/dev/null 2>&1; then
  echo "✅ PRODUCTION DEPLOYMENT SUCCESSFUL!"
  echo ""
  echo "Live URLs:"
  echo "• Backend: https://n0de-backend-production-4e34.up.railway.app"
  echo "• Frontend: https://www.n0de.pro"
else
  echo "❌ Production deployment failed - consider rollback"
  exit 1
fi
