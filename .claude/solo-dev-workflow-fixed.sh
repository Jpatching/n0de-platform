#!/bin/bash

# N0DE Solo Development Workflow
# Optimized for single developer productivity

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Quick development setup
function n0de-dev() {
  echo -e "${GREEN}🚀 Starting N0DE development environment${NC}"
  
  cd /home/sol/n0de-deploy
  
  # Start backend
  echo "📦 Starting backend..."
  pm2 start ecosystem.config.js || pm2 restart n0de-backend
  
  # Start frontend dev server
  echo "🎨 Starting frontend..."
  cd frontend
  npm run dev &
  
  cd ..
  
  echo -e "${GREEN}✅ Development environment ready${NC}"
  echo "🌐 Frontend: http://localhost:3000"
  echo "🔌 Backend: http://localhost:4000"
}

# Quick deploy to production
function n0de-deploy() {
  echo -e "${BLUE}🚀 Deploying to production${NC}"
  
  cd /home/sol/n0de-deploy
  
  # Run all checks
  echo "🔍 Running pre-deployment checks..."
  npm run build || { echo -e "${RED}❌ Backend build failed${NC}"; return 1; }
  
  cd frontend
  npm run build || { echo -e "${RED}❌ Frontend build failed${NC}"; return 1; }
  
  # Deploy frontend to Vercel
  echo "☁️ Deploying frontend to Vercel..."
  vercel --prod
  
  # Restart backend
  echo "🔄 Restarting backend..."
  cd ..
  pm2 restart n0de-backend
  
  echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Quick status check
function n0de-status() {
  echo -e "${BLUE}📊 N0DE Platform Status${NC}"
  echo ""
  
  # Backend status
  echo "Backend:"
  pm2 status n0de-backend
  
  # Database status
  echo -e "\nDatabase:"
  PGPASSWORD=postgres psql -U n0de_user -d n0de_production -h localhost -c "SELECT COUNT(*) as users FROM users;" 2>/dev/null || echo "❌ Database connection failed"
  
  # Redis status
  echo -e "\nRedis:"
  redis-cli ping || echo "❌ Redis not responding"
  
  # API health
  echo -e "\nAPI Health:"
  curl -s https://api.n0de.pro/health | jq '.' || echo "❌ API not accessible"
}

# Quick logs viewer
function n0de-logs() {
  echo -e "${YELLOW}📜 N0DE Logs${NC}"
  pm2 logs n0de-backend --lines 50
}

# Database console
function n0de-db() {
  echo -e "${BLUE}🗄️ Connecting to N0DE database...${NC}"
  PGPASSWORD=postgres psql -U n0de_user -d n0de_production -h localhost
}

# Redis console
function n0de-redis() {
  echo -e "${RED}📦 Connecting to Redis...${NC}"
  redis-cli
}

# Quick cleanup
function n0de-clean() {
  echo -e "${YELLOW}🧹 Cleaning up N0DE project...${NC}"
  
  cd /home/sol/n0de-deploy
  
  # Clean node_modules if requested
  if [ "$1" == "--full" ]; then
    echo "Removing node_modules..."
    rm -rf node_modules
    rm -rf frontend/node_modules
  fi
  
  # Clean build artifacts
  rm -rf dist
  rm -rf frontend/.next
  rm -rf frontend/dist
  
  # Clean logs
  pm2 flush
  
  echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Export functions for use
export -f n0de-dev
export -f n0de-deploy
export -f n0de-status
export -f n0de-logs
export -f n0de-db
export -f n0de-redis
export -f n0de-clean

echo -e "${GREEN}N0DE development commands loaded ✅${NC}"
echo "Available commands: n0de-dev, n0de-deploy, n0de-status, n0de-logs, n0de-db, n0de-redis, n0de-clean"