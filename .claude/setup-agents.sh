#!/bin/bash
# N0DE Platform - Agent Setup and Activation Script

set -e

echo "🤖 N0DE Platform - Agent Setup"
echo "=============================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() {
  echo -e "${BLUE}📍 $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Create necessary directories
log_step "Creating agent directories"
mkdir -p .claude/{agents,reports,data,correlations}
mkdir -p .claude/reports/{performance,business}
mkdir -p backups
log_success "Directories created"

# Install dependencies for agents
log_step "Installing agent dependencies"
if ! command -v jq &> /dev/null; then
  echo "Installing jq..."
  sudo apt-get update && sudo apt-get install -y jq
fi

# Install Node.js dependencies for agents
npm install --save-dev chokidar ws lighthouse imagemin-cli imagemin-mozjpeg imagemin-pngquant depcheck

log_success "Dependencies installed"

# Make agents executable
log_step "Making agents executable"
chmod +x .claude/agents/*.js
chmod +x .githooks/*
log_success "Agents are executable"

# Setup Git hooks
log_step "Installing Git hooks"
if [ -d ".git" ]; then
  # Copy hooks to git hooks directory
  cp .githooks/* .git/hooks/
  chmod +x .git/hooks/*
  log_success "Git hooks installed"
else
  log_warning "Not a git repository - Git hooks skipped"
fi

# Test agents
log_step "Testing agents"

echo "🧪 Testing Full-Stack Sync Agent..."
if timeout 10 node .claude/agents/fullstack-sync-agent.js >/dev/null 2>&1; then
  log_success "Full-Stack Sync Agent working"
else
  log_warning "Full-Stack Sync Agent test failed"
fi

echo "🧪 Testing Performance Guardian..."
if timeout 15 node .claude/agents/performance-guardian.js quick >/dev/null 2>&1; then
  log_success "Performance Guardian working"
else
  log_warning "Performance Guardian test failed"
fi

echo "🧪 Testing Deployment Orchestrator..."
if node .claude/agents/smart-deployment-orchestrator.js >/dev/null 2>&1; then
  log_success "Deployment Orchestrator working"
else
  log_warning "Deployment Orchestrator test failed"
fi

echo "🧪 Testing Business Intelligence Dashboard..."
if timeout 10 node .claude/agents/business-intelligence-dashboard.js collect >/dev/null 2>&1; then
  log_success "Business Intelligence Dashboard working"
else
  log_warning "Business Intelligence Dashboard test failed"
fi

# Setup systemd services for continuous monitoring
log_step "Setting up monitoring services"

# Create systemd service for error correlation agent
sudo tee /etc/systemd/system/n0de-error-agent.service > /dev/null <<EOF
[Unit]
Description=N0DE Error Correlation Agent
After=network.target

[Service]
Type=simple
User=sol
WorkingDirectory=/home/sol/n0de-deploy
ExecStart=/usr/bin/node .claude/agents/error-correlation-agent.js start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for business intelligence
sudo tee /etc/systemd/system/n0de-bi-dashboard.service > /dev/null <<EOF
[Unit]
Description=N0DE Business Intelligence Dashboard
After=network.target

[Service]
Type=simple
User=sol
WorkingDirectory=/home/sol/n0de-deploy
ExecStart=/usr/bin/node .claude/agents/business-intelligence-dashboard.js collect
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable n0de-error-agent.service
sudo systemctl enable n0de-bi-dashboard.service

log_success "Monitoring services configured"

# Create convenient aliases
log_step "Creating command aliases"

cat > /home/sol/.claude/n0de-aliases.sh <<EOF
#!/bin/bash
# N0DE Platform - Convenient aliases

alias n0de-deploy='cd /home/sol/n0de-deploy && node .claude/agents/smart-deployment-orchestrator.js quick'
alias n0de-deploy-full='cd /home/sol/n0de-deploy && node .claude/agents/smart-deployment-orchestrator.js deploy'
alias n0de-rollback='cd /home/sol/n0de-deploy && node .claude/agents/smart-deployment-orchestrator.js rollback'
alias n0de-types='cd /home/sol/n0de-deploy && node .claude/agents/fullstack-sync-agent.js'
alias n0de-perf='cd /home/sol/n0de-deploy && node .claude/agents/performance-guardian.js audit'
alias n0de-errors='cd /home/sol/n0de-deploy && node .claude/agents/error-correlation-agent.js report'
alias n0de-business='cd /home/sol/n0de-deploy && node .claude/agents/business-intelligence-dashboard.js report'
alias n0de-health='curl -s https://api.n0de.pro/health && echo "" && curl -s -o /dev/null -w "Frontend: %{http_code}" https://www.n0de.pro && echo ""'
alias n0de-monitor='cd /home/sol/n0de-deploy && node .claude/agents/business-intelligence-dashboard.js dashboard'

echo "N0DE Platform aliases loaded ✅"
EOF

# Add to bashrc if not already there
if ! grep -q "n0de-aliases.sh" ~/.bashrc; then
  echo "source /home/sol/.claude/n0de-aliases.sh" >> ~/.bashrc
fi

log_success "Command aliases created"

# Create master control script
cat > /home/sol/n0de-deploy/.claude/n0de-control.sh <<EOF
#!/bin/bash
# N0DE Platform Master Control Script

case "\$1" in
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
    ./n0de-control.sh health
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
EOF

chmod +x /home/sol/n0de-deploy/.claude/n0de-control.sh

log_success "Master control script created"

echo ""
echo -e "${GREEN}🎉 N0DE Platform Agents Setup Complete!${NC}"
echo "======================================="
echo ""
echo "🤖 Available Agents:"
echo "  ✅ Full-Stack Sync Agent (auto type sync)"
echo "  ✅ Smart Deployment Orchestrator (intelligent deployments)"
echo "  ✅ Performance Guardian (performance monitoring)"
echo "  ✅ Error Correlation Agent (intelligent debugging)"
echo "  ✅ Business Intelligence Dashboard (analytics)"
echo ""
echo "🚀 Quick Commands:"
echo "  n0de-deploy      # Quick frontend deployment"
echo "  n0de-health      # System health check"
echo "  n0de-errors      # Error analysis"
echo "  n0de-business    # Business metrics"
echo "  n0de-monitor     # Real-time dashboard"
echo ""
echo "🎯 Master Control:"
echo "  ./.claude/n0de-control.sh status    # Overall status"
echo "  ./.claude/n0de-control.sh deploy    # Full deployment"
echo ""
echo "🔧 Next Steps:"
echo "  1. Run: source ~/.bashrc (to load aliases)"
echo "  2. Test: n0de-health (verify system is working)"
echo "  3. Deploy: n0de-deploy (push to Vercel)"
echo "  4. Monitor: n0de-monitor (watch real-time metrics)"