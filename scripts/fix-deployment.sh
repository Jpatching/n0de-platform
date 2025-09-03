#!/bin/bash
# Fix deployment - ensure Railway uses Railway DB and local doesn't interfere

echo "🚀 Fixing N0DE Platform Deployment"
echo "=================================="
echo ""

cd /home/sol/n0de-deploy

# Step 1: Remove local .env so it doesn't interfere with Railway
echo "1️⃣ Backing up and removing local .env..."
cp .env .env.local-backup 2>/dev/null
rm -f .env

# Step 2: Ensure Railway has correct environment variables
echo ""
echo "2️⃣ Setting Railway environment variables..."

# The DATABASE_URL in Railway should already be set correctly
# Just ensure other critical variables are set
railway variables --set "NODE_ENV=production" \
  --set "PORT=3000" \
  --set "JWT_SECRET=n0de_jwt_secret_2024_production" \
  --set "CORS_ORIGINS=https://n0de.pro,https://www.n0de.pro,https://n0de-website-*.vercel.app" \
  --set "FRONTEND_URL=https://www.n0de.pro" \
  --set "BACKEND_URL=https://n0de-backend-production-4e34.up.railway.app" \
  --set "API_BASE_URL=https://n0de-backend-production-4e34.up.railway.app/api/v1" \
  --skip-deploys

# Step 3: Ensure build script doesn't try to connect to DB
echo ""
echo "3️⃣ Updating package.json to skip DB operations during build..."
cat > package.json.tmp << 'EOF'
{
  "name": "n0de-backend",
  "version": "1.0.0",
  "description": "n0de RPC Infrastructure Backend API",
  "author": "n0de Team",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "postinstall": "npx prisma generate",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "node dist/src/main.js",
    "start:dev": "npx nest start --watch",
    "start:debug": "npx nest start --debug --watch",
    "start:prod": "node dist/src/main.js",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "ts-node prisma/seed.ts"
  },
EOF

# Append dependencies
tail -n +27 package.json >> package.json.tmp
mv package.json.tmp package.json

# Step 4: Deploy to Railway (Railway will use its own DATABASE_URL)
echo ""
echo "4️⃣ Deploying to Railway..."
railway up --detach

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "Railway will use its internal DATABASE_URL automatically."
echo "Check deployment at: https://railway.com/project/262d4f31-c5ec-4614-8db6-b62bdb18ee17"
echo ""
echo "Once deployed, the backend will be available at:"
echo "https://n0de-backend-production-4e34.up.railway.app"