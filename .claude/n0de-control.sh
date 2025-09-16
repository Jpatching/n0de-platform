#!/bin/bash
# N0DE Platform Master Control Script

case "$1" in
  "deploy")
    echo "🚀 Starting deployment..."
    node .claude/agents/smart-deployment-orchestrator.js deploy
    ;;
  "quick-deploy")
    echo "⚡ Quick frontend deployment..."
    node .claude/agents/smart-deployment-orchestrator.js quick
    ;;
  "rollback")
    echo "🔄 Rolling back..."
    node .claude/agents/smart-deployment-orchestrator.js rollback
    ;;
  "sync-types")
    echo "🔄 Syncing types..."
    node .claude/agents/fullstack-sync-agent.js
    ;;
  "performance")
    echo "⚡ Running performance audit..."
    node .claude/agents/performance-guardian.js audit
    ;;
  "errors")
    echo "🔍 Analyzing errors..."
    node .claude/agents/error-correlation-agent.js report
    ;;
  "business")
    echo "📊 Generating business report..."
    node .claude/agents/business-intelligence-dashboard.js report
    ;;
  "health")
    echo "🏥 Checking system health..."
    curl -s https://api.n0de.pro/health
    echo ""
    curl -s -o /dev/null -w "Frontend: %{http_code}" https://www.n0de.pro
    echo ""
    ;;
  "monitor")
    echo "👀 Starting real-time monitoring..."
    node .claude/agents/business-intelligence-dashboard.js dashboard
    ;;
  "status")
    echo "📊 N0DE Platform Status"
    echo "======================"
    bash "$0" health
    echo ""
    echo "🤖 Active Agents:"
    systemctl is-active n0de-error-agent.service && echo "  ✅ Error Correlation Agent"
    systemctl is-active n0de-bi-dashboard.service && echo "  ✅ Business Intelligence"
    ;;
  *)
    echo "🤖 N0DE Platform Control Center"
    echo ""
    echo "Commands:"
    echo "  deploy         - Full deployment with health checks"
    echo "  quick-deploy   - Quick frontend deployment"
    echo "  rollback       - Rollback to previous version"
    echo "  sync-types     - Synchronize backend/frontend types"
    echo "  performance    - Run performance audit"
    echo "  errors         - Analyze recent errors"
    echo "  business       - Generate business intelligence report"
    echo "  health         - Check system health"
    echo "  monitor        - Start real-time monitoring"
    echo "  status         - Show overall platform status"
    ;;
esac
