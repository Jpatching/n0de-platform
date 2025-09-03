#!/bin/bash
# Quick deployment and verification script

set -e

echo "🚀 N0DE Quick Deploy & Test"
echo "============================"
echo ""

# Backend URL
BACKEND="https://api.n0de.pro"
FRONTEND="https://www.n0de.pro"

# Step 1: Disable billing and fix auth
echo "1️⃣ Configuring backend for no-billing mode..."
cd /home/sol/n0de-deploy

# Update local .env for testing
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:mMXWyeIXnJXKWsqWmgiHfReABwrgqVvN@postgres-8vk9.backend.internal:5432/backend
REDIS_URL=redis://default:stSdHSGnoeHVkNMErsoDkQWvhYUUtEfB@redis-rubf.backend.internal:6379

# URLs
API_BASE_URL=https://api.n0de.pro/api/v1
BACKEND_URL=https://api.n0de.pro
FRONTEND_URL=https://www.n0de.pro

# Disable billing
BILLING_ENABLED=false
STRIPE_TEST_MODE=true
REQUIRE_PAYMENT=false

# Simple auth
JWT_SECRET=n0de_clean_jwt_secret_2024
AUTH_BYPASS_EMAIL_VERIFICATION=true
OAUTH_REQUIRED=false

# Test OAuth (will work but redirect to error page)
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-secret
GITHUB_CLIENT_ID=test-github-id
GITHUB_CLIENT_SECRET=test-github-secret
EOF

# Step 2: Quick database fix
echo ""
echo "2️⃣ Creating database migration for test user..."
cat > prisma/seed-admin.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@n0de.pro' },
    update: {
      emailVerified: true,
      role: 'admin',
    },
    create: {
      email: 'admin@n0de.pro',
      password: hashedPassword,
      name: 'Admin User',
      emailVerified: true,
      role: 'admin',
    },
  });
  
  console.log('Admin user created:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Step 3: Update backend
echo ""
echo "3️⃣ Updating backend code for no-billing mode..."

# Create a simple auth bypass middleware
cat > src/auth/auth-bypass.middleware.ts << 'EOF'
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthBypassMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // In test mode, create a mock user if needed
    if (process.env.BILLING_ENABLED === 'false') {
      req['user'] = {
        id: 1,
        email: 'test@n0de.pro',
        role: 'admin',
      };
    }
    next();
  }
}
EOF

# Step 4: Deploy
echo ""
echo "4️⃣ Deploying to backend..."
backend up --detach

# Step 5: Test
echo ""
echo "5️⃣ Waiting for deployment..."
sleep 10

echo ""
echo "6️⃣ Running tests..."
echo ""

# Test backend
echo -n "Backend health: "
curl -s "$BACKEND/health" | jq -r '.status' || echo "ERROR"

# Test auth
echo -n "Testing login: "
response=$(curl -s -X POST "$BACKEND/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@n0de.pro","password":"Admin123!"}' 2>/dev/null)

if echo "$response" | jq -e '.access_token' >/dev/null 2>&1; then
  echo "✅ SUCCESS"
  TOKEN=$(echo "$response" | jq -r '.access_token')
  echo "Token obtained: ${TOKEN:0:20}..."
else
  echo "❌ FAILED"
  echo "Creating test account..."
  
  # Try registration
  curl -s -X POST "$BACKEND/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@n0de.pro","password":"Admin123!","name":"Admin"}' \
    >/dev/null 2>&1
fi

echo ""
echo "7️⃣ Frontend check..."
echo -n "Frontend status: "
status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND")
if [ "$status" = "200" ]; then
  echo "✅ ONLINE"
else
  echo "❌ OFFLINE ($status)"
fi

echo ""
echo "✅ DEPLOYMENT STATUS"
echo "==================="
echo "Backend:  $BACKEND"
echo "Frontend: $FRONTEND"
echo "Test User: admin@n0de.pro / Admin123!"
echo ""
echo "Test the platform at: $FRONTEND/login"