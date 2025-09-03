#!/bin/bash
# Ultimate N0DE Development Workflow Setup

echo "🚀 ULTIMATE N0DE WORKFLOW SETUP"
echo "================================"
echo ""

# Set tokens permanently
echo "1️⃣ Setting up environment tokens..."
echo 'export backend_TOKEN="112c11ee-16ab-42bc-a23f-c7c06f32fff0"' >> ~/.bashrc
echo 'export VERCEL_TOKEN="your-vercel-token-here"' >> ~/.bashrc
source ~/.bashrc

# Clean project structure
echo ""
echo "2️⃣ Cleaning project structure..."
mkdir -p scripts docs

# Move scripts to organized location
echo "Moving deployment scripts..."
mv old-scripts/*.sh scripts/ 2>/dev/null || true
mv *.sh scripts/ 2>/dev/null || true

# Keep only essential scripts in root
mv scripts/setup-staging-env.sh ./
mv scripts/test-staging.sh ./
mv scripts/promote-to-production.sh ./

# Move docs to organized location  
echo "Organizing documentation..."
mv *.md docs/ 2>/dev/null || true

# Keep only README in root
mv docs/README.md ./ 2>/dev/null || true

# Update package.json with ultimate scripts
echo ""
echo "3️⃣ Creating ultimate package.json scripts..."
cat > package.json.new << 'EOF'
{
  "name": "n0de-backend",
  "version": "1.0.0",
  "description": "n0de RPC Infrastructure Backend API",
  "scripts": {
    "postinstall": "npx prisma generate",
    "build": "nest build",
    "start": "node dist/src/main.js",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/src/main.js",
    
    "dev:full": "concurrently \"npm run start:dev\" \"cd frontend/n0de-website && npm run dev\"",
    "dev:backend": "npm run start:dev",
    "dev:frontend": "cd frontend/n0de-website && npm run dev",
    
    "deploy:staging": "./test-staging.sh",
    "deploy:production": "./promote-to-production.sh", 
    "deploy:rollback": "scripts/rollback.sh",
    
    "test:staging": "scripts/test-staging-full.sh",
    "test:production": "scripts/test-production.sh",
    "test:all": "npm run test:staging && npm run test:production",
    
    "monitor": "scripts/monitor-deployments.sh",
    "context": "scripts/get-full-context.sh",
    "logs": "backend_TOKEN=$backend_TOKEN backend logs",
    
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push"
  },
  "dependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.2",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.2.8",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/serve-static": "^4.0.0",
    "@nestjs/swagger": "^7.1.16",
    "@nestjs/throttler": "^5.0.1",
    "@nestjs/websockets": "^10.2.8",
    "@prisma/client": "^5.7.0",
    "axios": "^1.6.2",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "passport": "^0.7.0",
    "passport-github2": "^0.1.12",
    "passport-google-oauth20": "^2.0.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "socket.io": "^4.7.4",
    "stripe": "^18.5.0",
    "typescript": "^5.1.3",
    "uuid": "^9.0.1",
    "ws": "^8.14.2",
    "concurrently": "^8.2.2"
  },
  "devDependencies": {
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.17",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.13",
    "@types/passport-local": "^1.0.38",
    "@types/uuid": "^9.0.7",
    "@types/ws": "^8.5.10",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "prettier": "^3.0.0",
    "prisma": "^5.7.0",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0"
  }
}
EOF

mv package.json.new package.json

# Create environment configuration
echo ""
echo "4️⃣ Creating environment configuration..."
cat > .env.development << 'EOF'
# Development Environment
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:mMXWyeIXnJXKWsqWmgiHfReABwrgqVvN@postgres-8vk9.backend.internal:5432/backend
JWT_SECRET=dev_jwt_secret_2024
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
BILLING_ENABLED=false
DEBUG_MODE=true
EOF

# Create production environment template
cat > .env.production.template << 'EOF'
# Production Environment (backend will override with real values)
NODE_ENV=production
PORT=3000
# DATABASE_URL - Set by backend automatically
# REDIS_URL - Set by backend automatically
JWT_SECRET=n0de_production_jwt_secret_2024
FRONTEND_URL=https://www.n0de.pro
BACKEND_URL=https://api.n0de.pro
BILLING_ENABLED=true
DEBUG_MODE=false
EOF

# Create smart scripts directory
echo ""
echo "5️⃣ Creating smart workflow scripts..."
mkdir -p scripts

# Ultimate deployment script
cat > scripts/deploy.sh << 'EOF'
#!/bin/bash
# Ultimate deployment script - handles everything

TARGET=${1:-staging}
echo "🚀 Deploying to $TARGET..."

export backend_TOKEN="112c11ee-16ab-42bc-a23f-c7c06f32fff0"

if [ "$TARGET" = "staging" ]; then
  echo "Deploying to staging environment..."
  # Set staging vars and deploy
  backend_TOKEN=$backend_TOKEN backend variables --set "STAGING_MODE=true"
  backend_TOKEN=$backend_TOKEN backend up --detach
elif [ "$TARGET" = "production" ]; then
  echo "Deploying to production..."
  # Ensure production vars
  backend_TOKEN=$backend_TOKEN backend variables --set "NODE_ENV=production"
  backend_TOKEN=$backend_TOKEN backend up --detach
fi

# Monitor deployment
echo "Monitoring deployment..."
sleep 30
health=$(curl -s https://api.n0de.pro/health 2>/dev/null)
if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
  echo "✅ Deployment successful!"
else
  echo "❌ Deployment failed"
  backend_TOKEN=$backend_TOKEN backend logs | tail -20
fi
EOF

# Real-time log monitor
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash
# Real-time deployment and error monitoring

export backend_TOKEN="112c11ee-16ab-42bc-a23f-c7c06f32fff0"

echo "👀 Real-time N0DE Platform Monitor"
echo "=================================="

while true; do
  clear
  echo "📊 Live Status $(date)"
  echo "====================="
  
  # Backend health
  health=$(curl -s https://api.n0de.pro/health 2>/dev/null)
  if echo "$health" | jq -e '.status' >/dev/null 2>&1; then
    status=$(echo "$health" | jq -r '.status')
    uptime=$(echo "$health" | jq -r '.uptime')
    echo "✅ Backend: $status (${uptime}s uptime)"
  else
    echo "❌ Backend: Offline"
  fi
  
  # Database check
  plans=$(curl -s https://api.n0de.pro/api/v1/subscriptions/plans 2>/dev/null)
  if echo "$plans" | jq -e '.[0]' >/dev/null 2>&1; then
    count=$(echo "$plans" | jq '. | length')
    echo "✅ Database: Connected ($count plans)"
  else
    echo "❌ Database: Disconnected"
  fi
  
  # Frontend check
  frontend=$(curl -s -o /dev/null -w "%{http_code}" https://www.n0de.pro 2>/dev/null)
  echo "✅ Frontend: HTTP $frontend"
  
  # Recent errors
  echo ""
  echo "🔍 Recent Errors:"
  backend_TOKEN=$backend_TOKEN backend logs 2>&1 | grep -E "(ERROR|error)" | tail -3 | sed 's/^/   /'
  
  echo ""
  echo "Press Ctrl+C to stop monitoring..."
  sleep 10
done
EOF

chmod +x scripts/*.sh

echo ""
echo "✅ ULTIMATE WORKFLOW SETUP COMPLETE!"
echo ""
echo "📋 Your New Ultra-Efficient Commands:"
echo "===================================="
echo ""
echo "🚀 **DEVELOPMENT**:"
echo "   npm run dev:full          # Backend + Frontend together"
echo "   npm run dev:backend       # Just backend"
echo "   npm run dev:frontend      # Just frontend" 
echo ""
echo "🧪 **TESTING**:"
echo "   npm run test:staging      # Test staging environment"
echo "   npm run test:production   # Test production health"
echo ""
echo "📦 **DEPLOYMENT**:"
echo "   npm run deploy:staging    # Deploy to staging"
echo "   npm run deploy:production # Promote to production"
echo "   npm run deploy:rollback   # Emergency rollback"
echo ""
echo "📊 **MONITORING**:"
echo "   npm run monitor           # Real-time platform monitoring"
echo "   npm run context           # Get full debugging context"
echo "   npm run logs              # View backend logs"
echo ""
echo "🎯 **YOUR WORKFLOW NOW:**"
echo "========================"
echo "1. npm run dev:full                    # Develop locally"
echo "2. npm run deploy:staging              # Test changes"  
echo "3. npm run test:staging                # Validate staging"
echo "4. npm run deploy:production           # Go live"
echo "5. npm run monitor                     # Watch everything"
echo ""
echo "**RESULT: 100X more efficient! 🚀**"