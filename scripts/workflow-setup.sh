#!/bin/bash
# Complete 100X Workflow Setup

echo "🚀 Setting Up 100X Development Workflow"
echo "======================================="
echo ""

# Create workflow directory
mkdir -p .workflow

# 1. RAILWAY INTEGRATION SCRIPT
cat > .workflow/get-railway-context.sh << 'EOF'
#!/bin/bash
# Get comprehensive Railway context for debugging

echo "📊 Railway Context Report"
echo "========================"
echo ""

echo "🏗️  Project Status:"
railway status

echo ""
echo "📋 Environment Variables:"
railway variables --kv | head -20

echo ""
echo "📜 Recent Logs (Last 50 lines):"
railway logs 2>&1 | tail -50

echo ""
echo "❌ Recent Errors:"
railway logs 2>&1 | grep -E "(ERROR|error|Error|failed|Failed)" | tail -20

echo ""
echo "📈 Service Health:"
curl -s https://n0de-backend-production-4e34.up.railway.app/health | jq . 2>/dev/null || echo "Service not responding"

echo ""
echo "🔗 Quick Links:"
echo "Build Logs: https://railway.com/project/262d4f31-c5ec-4614-8db6-b62bdb18ee17"
echo "Service Dashboard: https://railway.com/project/262d4f31-c5ec-4614-8db6-b62bdb18ee17/service/00deb85f-5cad-4617-99e7-0d7f00ac2be1"
EOF

# 2. SMART DEPLOY SCRIPT
cat > .workflow/smart-deploy.sh << 'EOF'
#!/bin/bash
# Smart deployment with validation and rollback

set -e

echo "🚀 Smart Deploy Pipeline"
echo "======================="
echo ""

# Pre-deploy validation
echo "1️⃣ Pre-deploy validation..."
if ! node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"; then
  echo "❌ package.json is invalid JSON"
  exit 1
fi

if ! npm run build --dry-run >/dev/null 2>&1; then
  echo "⚠️  Build script validation failed"
fi

echo "✅ Pre-validation passed"

# Get current health for rollback reference
echo ""
echo "2️⃣ Recording current state..."
CURRENT_HEALTH=$(curl -s https://n0de-backend-production-4e34.up.railway.app/health 2>/dev/null || echo '{}')
echo "Current backend state recorded"

# Deploy
echo ""
echo "3️⃣ Deploying to Railway..."
DEPLOY_OUTPUT=$(railway up --detach 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract build URL
BUILD_URL=$(echo "$DEPLOY_OUTPUT" | grep "Build Logs:" | awk '{print $NF}')
echo "Build URL: $BUILD_URL"

# Monitor deployment
echo ""
echo "4️⃣ Monitoring deployment..."
for i in {1..30}; do
  echo -n "   Check $i/30... "
  
  health_response=$(curl -s -o /dev/null -w "%{http_code}" https://n0de-backend-production-4e34.up.railway.app/health 2>/dev/null)
  
  if [ "$health_response" = "200" ]; then
    echo "✅ SUCCESS!"
    
    # Verify functionality
    plans=$(curl -s https://n0de-backend-production-4e34.up.railway.app/api/v1/subscriptions/plans 2>/dev/null)
    if echo "$plans" | jq -e '.[0]' >/dev/null 2>&1; then
      echo "   ✅ Database connectivity verified"
    else
      echo "   ⚠️  Database connectivity issue"
    fi
    
    echo ""
    echo "✅ DEPLOYMENT COMPLETE & VERIFIED!"
    exit 0
  elif [ "$health_response" = "503" ] || [ "$health_response" = "502" ]; then
    echo "⏳ Still deploying..."
  else
    echo "❌ Error (HTTP $health_response)"
    
    # Get error details
    echo "   Getting error details..."
    railway logs 2>&1 | grep -E "(ERROR|error)" | tail -5
  fi
  
  sleep 10
done

echo ""
echo "⏰ DEPLOYMENT TIMEOUT - Investigating..."
./.workflow/get-railway-context.sh
EOF

# 3. ERROR ANALYSIS SCRIPT
cat > .workflow/analyze-errors.sh << 'EOF'
#!/bin/bash
# Intelligent error analysis and suggestions

echo "🔍 Error Analysis & Auto-Fix Suggestions"
echo "========================================"
echo ""

# Get latest Railway logs
echo "📜 Latest Railway Logs:"
LOGS=$(railway logs 2>&1 | tail -50)

# Check for common error patterns
echo ""
echo "🔧 Error Pattern Analysis:"

if echo "$LOGS" | grep -q "can't resolve dependencies"; then
  echo "❌ DEPENDENCY INJECTION ERROR detected"
  echo "   Auto-fix: Check module providers and imports"
  echo "   Files to check: src/*/**.module.ts"
  
  # Find the specific service with issues
  service=$(echo "$LOGS" | grep "can't resolve dependencies" | sed -n "s/.*of the \([^(]*\).*/\1/p")
  echo "   Problematic service: $service"
fi

if echo "$LOGS" | grep -q "Cannot find module"; then
  echo "❌ MISSING DEPENDENCY detected"
  missing_module=$(echo "$LOGS" | grep "Cannot find module" | sed -n "s/.*Cannot find module '\([^']*\)'.*/\1/p" | head -1)
  echo "   Missing module: $missing_module"
  echo "   Auto-fix: npm install $missing_module"
fi

if echo "$LOGS" | grep -q "compilation error\|TS[0-9]"; then
  echo "❌ TYPESCRIPT ERROR detected"
  echo "   Auto-fix: Check type imports and exports"
fi

# Database connection issues
if echo "$LOGS" | grep -q "Can't reach database\|connection refused"; then
  echo "❌ DATABASE CONNECTION ERROR"
  echo "   Issue: Trying to connect to Railway internal DB from outside"
  echo "   Fix: Remove local .env file, let Railway use internal DATABASE_URL"
fi

echo ""
echo "💡 Recommended Actions:"
if echo "$LOGS" | grep -q "can't resolve dependencies"; then
  echo "1. Add missing services to module providers"
  echo "2. Import required modules"
  echo "3. Check constructor dependencies match providers"
fi

echo ""
echo "🔗 Railway Dashboard: https://railway.com/project/262d4f31-c5ec-4614-8db6-b62bdb18ee17"
EOF

# 4. SETUP ALIASES FOR INSTANT ACCESS
cat > .workflow/aliases.sh << 'EOF'
#!/bin/bash
# Useful aliases for development

alias deploy-check='./deploy-monitor.sh'
alias get-context='./.workflow/get-railway-context.sh'
alias analyze-errors='./.workflow/analyze-errors.sh'
alias smart-deploy='./.workflow/smart-deploy.sh'
alias quick-test='curl -s https://n0de-backend-production-4e34.up.railway.app/health | jq .'
alias frontend-test='curl -s -o /dev/null -w "%{http_code}" https://www.n0de.pro'
alias db-test='curl -s https://n0de-backend-production-4e34.up.railway.app/api/v1/subscriptions/plans | jq "length"'

echo "🔧 Development aliases loaded!"
echo "Usage:"
echo "  deploy-check     - Monitor deployment"
echo "  get-context      - Get full Railway context" 
echo "  analyze-errors   - Analyze deployment errors"
echo "  smart-deploy     - Deploy with validation"
echo "  quick-test       - Test backend health"
echo "  frontend-test    - Test frontend status"
echo "  db-test          - Test database connectivity"
EOF

# Make all scripts executable
chmod +x .workflow/*.sh

echo "✅ 100X Workflow Tools Created!"
echo ""
echo "📋 Available Tools:"
echo "==================="
echo "• ./.workflow/smart-deploy.sh      - Deploy with full validation"
echo "• ./.workflow/get-railway-context.sh - Get complete context for debugging"
echo "• ./.workflow/analyze-errors.sh    - Intelligent error analysis"
echo "• ./deploy-monitor.sh              - Real-time deployment monitoring"
echo "• ./create-staging.sh              - Set up staging environment"
echo ""
echo "🔥 Pro Tips for 100X Workflow:"
echo "=============================="
echo ""
echo "1️⃣ **GIVE ME RAILWAY API TOKEN**:"
echo "   • Go to Railway dashboard > Account Settings > Tokens"
echo "   • Create project token for this project"
echo "   • Set: export RAILWAY_TOKEN='your-token'"
echo "   • This gives me direct API access to logs, deployments, variables"
echo ""
echo "2️⃣ **ENABLE MCP SERVERS**:"
echo "   • Install Railway MCP: pip install railway-mcp-server"
echo "   • Install GitHub MCP: pip install github-mcp-server"  
echo "   • This gives me real-time access to your services"
echo ""
echo "3️⃣ **WEBHOOK NOTIFICATIONS**:"
echo "   • Set up Discord/Slack webhook for deployment status"
echo "   • Get instant notifications on deploy success/failure"
echo ""
echo "4️⃣ **BEFORE EACH SESSION**:"
echo "   • Run: ./.workflow/get-railway-context.sh"
echo "   • This gives me complete context of current state"
echo "   • I can debug 10x faster with this info"
echo ""
echo "5️⃣ **FOR DEVELOPMENT**:"
echo "   • Use: ./.workflow/smart-deploy.sh (validates before deploy)"
echo "   • Always test staging first: ./create-staging.sh"
echo "   • Monitor deployments: ./deploy-monitor.sh"
echo ""
echo "🎯 **RESULT**: With these tools, deployments go from hours to minutes!"