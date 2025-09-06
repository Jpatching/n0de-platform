#!/bin/bash
# N0DE Platform - Quick Commands for Development Workflow

# Quick deploy to Vercel (most common command)
n0de-deploy() {
  echo "🚀 N0DE Quick Deploy to Vercel"
  cd /home/sol/n0de-deploy/frontend
  
  # Quick health check first
  if ! curl -s https://api.n0de.pro/health >/dev/null; then
    echo "⚠️  Backend appears to be down - deploying frontend only"
  fi
  
  # Build and deploy
  npm run build && vercel --prod --yes
  
  echo "✅ Deployed to Vercel"
  echo "🌐 Check: https://www.n0de.pro"
}

# Check system health
n0de-health() {
  echo "🏥 N0DE System Health Check"
  echo "=========================="
  
  # Backend health
  if curl -s https://api.n0de.pro/health | grep -q "ok"; then
    echo "✅ Backend: Healthy"
  else
    echo "❌ Backend: Down or unhealthy"
  fi
  
  # Frontend check
  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.n0de.pro)
  echo "✅ Frontend: HTTP $FRONTEND_STATUS"
  
  # Database check
  if PGPASSWORD=Aguero07! psql -U n0de_user -d n0de_database -h localhost -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database: Connected"
  else
    echo "❌ Database: Connection failed"
  fi
  
  # Redis check
  if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis: Connected"
  else
    echo "❌ Redis: Connection failed"
  fi
}

# Sync types between backend and frontend
n0de-sync-types() {
  echo "🔄 Syncing types..."
  cd /home/sol/n0de-deploy
  node .claude/agents/fullstack-sync-agent.js
}

# Quick error analysis
n0de-errors() {
  echo "🔍 Recent error analysis..."
  cd /home/sol/n0de-deploy
  node .claude/agents/error-correlation-agent.js report
}

# Performance audit
n0de-perf() {
  echo "⚡ Performance audit..."
  cd /home/sol/n0de-deploy
  node .claude/agents/performance-guardian.js audit
}

# Business metrics
n0de-business() {
  echo "📊 Business intelligence..."
  cd /home/sol/n0de-deploy
  node .claude/agents/business-intelligence-dashboard.js report
}

# Real-time monitoring dashboard
n0de-monitor() {
  echo "📊 Starting real-time dashboard..."
  cd /home/sol/n0de-deploy
  node .claude/agents/business-intelligence-dashboard.js dashboard
}

# Fix deployment issues
n0de-fix-deploy() {
  echo "🔧 Attempting to fix deployment issues..."
  cd /home/sol/n0de-deploy/frontend
  
  # Clear build cache
  rm -rf .next
  
  # Reinstall dependencies
  npm install
  
  # Try build
  if npm run build; then
    echo "✅ Build successful - attempting deploy"
    vercel --prod --yes
  else
    echo "❌ Build failed - check errors above"
  fi
}

# Rollback deployment
n0de-rollback() {
  echo "🔄 Rolling back deployment..."
  cd /home/sol/n0de-deploy
  node .claude/agents/smart-deployment-orchestrator.js rollback
}

# Complete system status
n0de-status() {
  echo "📊 N0DE Platform Complete Status"
  echo "==============================="
  
  n0de-health
  
  echo ""
  echo "🤖 Agent Status:"
  systemctl is-active n0de-error-agent.service >/dev/null 2>&1 && echo "  ✅ Error Agent: Running" || echo "  ❌ Error Agent: Stopped"
  systemctl is-active n0de-bi-dashboard.service >/dev/null 2>&1 && echo "  ✅ BI Dashboard: Running" || echo "  ❌ BI Dashboard: Stopped"
  
  echo ""
  echo "🚀 Recent Deployments:"
  cd /home/sol/n0de-deploy/frontend
  vercel list --yes | head -5
}

export -f n0de-deploy n0de-health n0de-sync-types n0de-errors n0de-perf n0de-business n0de-monitor n0de-fix-deploy n0de-rollback n0de-status