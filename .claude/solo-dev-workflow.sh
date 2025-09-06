#!/bin/bash
# N0DE Platform - Optimized Solo Developer Workflow

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Quick development commands for solo developer
n0de-dev() {
  echo -e "${BLUE}🚀 N0DE Solo Dev Mode${NC}"
  echo "==================="
  
  cd /home/sol/n0de-deploy
  
  # Start all services in dev mode
  echo "📦 Starting backend..."
  npm run dev &
  
  echo "🎨 Starting frontend..."
  cd frontend
  npm run dev &
  cd ..
  
  echo -e "${GREEN}✅ Development environment ready${NC}"
  echo "🌐 Frontend: http://localhost:3000"
  echo "🔌 Backend: http://localhost:4000"
}

# Quick deploy to production
n0de-deploy() {
  echo -e "${BLUE}🚀 Deploying to production${NC}"
  
  cd /home/sol/n0de-deploy
  
  # Run all checks
  echo "🔍 Running pre-deployment checks..."
  npm run build || { echo -e "${RED}❌ Backend build failed${NC}"; return 1; }
  
  cd frontend
  npm run build || { echo -e "${RED}❌ Frontend build failed${NC}"; return 1; }
  
  # Deploy to Vercel
  echo "☁️  Deploying frontend to Vercel..."
  vercel --yes --prod
  
  cd ..
  
  # Restart backend
  echo "🔄 Restarting backend services..."
  pm2 restart n0de-backend || pm2 start ecosystem.config.js --name n0de-backend
  
  echo -e "${GREEN}✅ Deployment complete${NC}"
}

# Quick status check
n0de-status() {
  echo -e "${BLUE}📊 N0DE Platform Status${NC}"
  echo "====================="
  
  # Check services
  echo "🔍 Service Status:"
  pm2 list
  
  echo ""
  echo "🌐 Frontend Status:"
  curl -s -o /dev/null -w "  Response: %{http_code}\n" https://www.n0de.pro
  
  echo ""
  echo "🔌 Backend Status:"
  curl -s -o /dev/null -w "  Response: %{http_code}\n" https://www.n0de.pro/api/v1/health
  
  echo ""
  echo "📈 Active Agents:"
  systemctl is-active n0de-error-agent.service >/dev/null && echo -e "  ✅ Error Correlation" || echo -e "  ❌ Error Correlation"
  systemctl is-active n0de-bi-dashboard.service >/dev/null && echo -e "  ✅ Business Intelligence" || echo -e "  ❌ Business Intelligence"
  systemctl is-active n0de-performance.service >/dev/null && echo -e "  ✅ Performance Guardian" || echo -e "  ❌ Performance Guardian"
}

# Quick commit and push
n0de-commit() {
  local message="$1"
  
  if [ -z "$message" ]; then
    echo "Usage: n0de-commit <message>"
    return 1
  fi
  
  echo -e "${BLUE}📝 Committing changes${NC}"
  
  git add .
  git commit -m "$message"
  
  echo -e "${BLUE}📤 Pushing to GitHub${NC}"
  git push origin main
  
  echo -e "${GREEN}✅ Changes pushed${NC}"
}

# Quick test runner
n0de-test() {
  echo -e "${BLUE}🧪 Running tests${NC}"
  
  cd /home/sol/n0de-deploy
  
  echo "🔧 Backend tests..."
  npm test
  
  echo "🎨 Frontend tests..."
  cd frontend
  npm run lint
  npm run build
  cd ..
  
  echo -e "${GREEN}✅ All tests passed${NC}"
}

# Quick database operations
n0de-db() {
  local command="$1"
  
  case "$command" in
    "migrate")
      echo "📊 Running database migrations..."
      npx prisma migrate deploy
      ;;
    "studio")
      echo "🎨 Opening Prisma Studio..."
      npx prisma studio
      ;;
    "reset")
      echo -e "${YELLOW}⚠️  Resetting database...${NC}"
      npx prisma migrate reset
      ;;
    *)
      echo "Usage: n0de-db [migrate|studio|reset]"
      ;;
  esac
}

# Quick logs viewer
n0de-logs() {
  local service="${1:-all}"
  
  case "$service" in
    "backend")
      pm2 logs n0de-backend --lines 50
      ;;
    "frontend")
      tail -f frontend/.next/server/logs/*.log
      ;;
    "nginx")
      tail -f /var/log/nginx/error.log
      ;;
    "all")
      pm2 logs --lines 50
      ;;
    *)
      echo "Usage: n0de-logs [backend|frontend|nginx|all]"
      ;;
  esac
}

# Quick environment switcher
n0de-env() {
  local env="${1:-dev}"
  
  case "$env" in
    "dev")
      echo "🔧 Switching to development environment"
      ln -sf .env.development .env
      ;;
    "prod")
      echo "🚀 Switching to production environment"
      ln -sf .env.production .env
      ;;
    *)
      echo "Usage: n0de-env [dev|prod]"
      ;;
  esac
  
  echo -e "${GREEN}✅ Environment: $env${NC}"
}

# Main control function
n0de() {
  local command="$1"
  shift
  
  case "$command" in
    "dev")
      n0de-dev "$@"
      ;;
    "deploy")
      n0de-deploy "$@"
      ;;
    "status")
      n0de-status "$@"
      ;;
    "commit")
      n0de-commit "$@"
      ;;
    "test")
      n0de-test "$@"
      ;;
    "db")
      n0de-db "$@"
      ;;
    "logs")
      n0de-logs "$@"
      ;;
    "env")
      n0de-env "$@"
      ;;
    *)
      echo -e "${BLUE}🚀 N0DE Solo Developer Commands${NC}"
      echo "=============================="
      echo ""
      echo "Usage: n0de <command> [options]"
      echo ""
      echo "Commands:"
      echo "  dev              Start development environment"
      echo "  deploy           Deploy to production (Vercel + Backend)"
      echo "  status           Check platform status"
      echo "  commit <msg>     Quick commit and push"
      echo "  test             Run all tests"
      echo "  db [cmd]         Database operations (migrate/studio/reset)"
      echo "  logs [service]   View logs (backend/frontend/nginx/all)"
      echo "  env [env]        Switch environment (dev/prod)"
      echo ""
      echo "Quick shortcuts:"
      echo "  n0de dev         # Start coding"
      echo "  n0de commit 'feat: add new feature'"
      echo "  n0de deploy      # Ship to production"
      ;;
  esac
}

# Export functions
export -f n0de n0de-dev n0de-deploy n0de-status n0de-commit
export -f n0de-test n0de-db n0de-logs n0de-env

# Add to bashrc if not already there
if ! grep -q "source.*solo-dev-workflow.sh" ~/.bashrc; then
  echo "source /home/sol/n0de-deploy/.claude/solo-dev-workflow.sh" >> ~/.bashrc
  echo -e "${GREEN}✅ Solo dev commands added to ~/.bashrc${NC}"
fi

echo -e "${GREEN}🚀 N0DE Solo Developer Workflow Loaded${NC}"
echo ""
echo "Quick start:"
echo "  n0de dev     # Start development"
echo "  n0de deploy  # Deploy to production"
echo "  n0de status  # Check everything"
echo ""
echo "Type 'n0de' for all commands"