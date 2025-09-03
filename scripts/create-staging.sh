#!/bin/bash
# Create staging environment on Railway

echo "🏗️  Setting Up Staging Environment"
echo "=================================="
echo ""

# Step 1: Create staging service
echo "1️⃣ Creating staging service on Railway..."
railway add --service staging-backend

# Step 2: Set staging environment variables
echo ""
echo "2️⃣ Setting staging variables..."
railway variables --set "NODE_ENV=staging" \
  --set "PORT=3001" \
  --set "BACKEND_URL=https://staging-backend.up.railway.app" \
  --set "FRONTEND_URL=https://staging-n0de.vercel.app" \
  --set "BILLING_ENABLED=false" \
  --set "STRIPE_TEST_MODE=true" \
  --set "DEBUG_MODE=true" \
  --set "LOG_LEVEL=debug" \
  --service staging-backend

# Step 3: Create staging database
echo ""
echo "3️⃣ Setting up staging database..."
railway add --database postgres --service staging-postgres

echo ""
echo "✅ Staging Environment Ready!"
echo ""
echo "Usage:"
echo "• Deploy to staging: railway up --service staging-backend"
echo "• Check staging logs: railway logs --service staging-backend"
echo "• Staging URL: https://staging-backend.up.railway.app"
echo ""
echo "Now you can test changes safely before production!"