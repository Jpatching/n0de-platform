#!/bin/bash
# N0DE Platform - Git Worktree Commands for Parallel Development

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create new feature branch with isolated environment
n0de-feature() {
  local feature_name="$1"
  local base_branch="${2:-main}"
  
  if [ -z "$feature_name" ]; then
    echo "Usage: n0de-feature <feature-name> [base-branch]"
    return 1
  fi

  echo -e "${BLUE}🌱 Creating feature environment: $feature_name${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/worktree-orchestrator.js create "$feature_name" "$base_branch"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Feature environment ready!${NC}"
    echo "🌐 Frontend: http://localhost:3002"
    echo "🔌 Backend: http://localhost:4002" 
    echo "📂 Path: /home/sol/n0de-worktrees/feature/$feature_name"
    echo ""
    echo "📋 Quick commands for this feature:"
    echo "   n0de-feature-deploy $feature_name   # Deploy this feature"
    echo "   n0de-feature-test $feature_name     # Test this feature"
    echo "   n0de-feature-merge $feature_name    # Merge to main"
  fi
}

# Deploy specific feature branch
n0de-feature-deploy() {
  local feature_name="$1"
  
  if [ -z "$feature_name" ]; then
    echo "Usage: n0de-feature-deploy <feature-name>"
    return 1
  fi

  echo -e "${BLUE}🚀 Deploying feature: $feature_name${NC}"
  
  cd "/home/sol/n0de-worktrees/feature/$feature_name"
  
  # Build and deploy frontend
  cd frontend
  npm run build && vercel --yes
  cd ..
  
  # Restart backend if needed
  pm2 restart "n0de-backend-$feature_name" 2>/dev/null || {
    npm run build
    pm2 start ecosystem.config.js --name "n0de-backend-$feature_name"
  }
  
  echo -e "${GREEN}✅ Feature $feature_name deployed${NC}"
}

# Test feature branch
n0de-feature-test() {
  local feature_name="$1"
  
  if [ -z "$feature_name" ]; then
    echo "Usage: n0de-feature-test <feature-name>"
    return 1
  fi

  echo -e "${BLUE}🧪 Testing feature: $feature_name${NC}"
  
  cd "/home/sol/n0de-worktrees/feature/$feature_name"
  
  # Backend tests
  echo "🔧 Running backend tests..."
  npm test
  
  # Frontend tests  
  echo "🎨 Running frontend tests..."
  cd frontend
  npm run lint
  npm run build
  cd ..
  
  # Integration tests
  echo "🔗 Running integration tests..."
  cd /home/sol/n0de-deploy
  node .claude/agents/worktree-orchestrator.js test-all
  
  echo -e "${GREEN}✅ Feature $feature_name tests completed${NC}"
}

# Merge feature branch to main
n0de-feature-merge() {
  local feature_name="$1"
  local target_branch="${2:-main}"
  
  if [ -z "$feature_name" ]; then
    echo "Usage: n0de-feature-merge <feature-name> [target-branch]"
    return 1
  fi

  echo -e "${BLUE}🔀 Merging feature $feature_name to $target_branch${NC}"
  
  # Run final tests
  n0de-feature-test "$feature_name"
  
  if [ $? -eq 0 ]; then
    cd /home/sol/n0de-deploy
    node .claude/agents/worktree-orchestrator.js merge "feature/$feature_name" "$target_branch"
    
    echo -e "${GREEN}✅ Feature $feature_name merged and deployed${NC}"
  else
    echo -e "${RED}❌ Tests failed, merge aborted${NC}"
    return 1
  fi
}

# Create staging environment
n0de-staging() {
  echo -e "${BLUE}🏗️  Setting up staging environment${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/worktree-orchestrator.js staging
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Staging environment ready${NC}"
    echo "🌐 URL: https://staging.n0de.pro"
    echo "📂 Path: /home/sol/n0de-worktrees/staging"
  fi
}

# Deploy to staging
n0de-staging-deploy() {
  echo -e "${BLUE}🚀 Deploying to staging${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/parallel-deployment-system.js deploy-parallel staging
}

# Promote staging to production
n0de-staging-promote() {
  echo -e "${BLUE}🎯 Promoting staging to production${NC}"
  
  cd /home/sol/n0de-deploy
  
  # Merge staging to main
  git checkout main
  git pull origin main
  git merge staging
  git push origin main
  
  # Deploy to production (will trigger auto-deployment)
  node .claude/agents/parallel-deployment-system.js deploy-parallel production
  
  echo -e "${GREEN}✅ Staging promoted to production${NC}"
}

# List all active worktree environments
n0de-worktrees() {
  echo -e "${BLUE}🌳 Active Worktree Environments${NC}"
  echo "=============================="
  
  cd /home/sol/n0de-deploy
  node .claude/agents/worktree-orchestrator.js list
  
  echo ""
  echo "📊 Worktree Status:"
  git worktree list
}

# Parallel development workflow
n0de-parallel() {
  local branches="$1"
  
  if [ -z "$branches" ]; then
    echo "Usage: n0de-parallel <branch1,branch2,branch3>"
    echo "Example: n0de-parallel payments,auth,dashboard"
    return 1
  fi

  echo -e "${BLUE}🔀 Starting parallel development workflow${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/parallel-deployment-system.js create-workflow "$branches"
  
  echo -e "${GREEN}✅ Parallel development environments ready${NC}"
  echo ""
  echo "🌐 Access your environments:"
  IFS=',' read -ra BRANCH_ARRAY <<< "$branches"
  local port=3002
  for branch in "${BRANCH_ARRAY[@]}"; do
    echo "   $branch: http://localhost:$port"
    ((port++))
  done
}

# Hotfix workflow
n0de-hotfix() {
  local hotfix_name="$1"
  
  if [ -z "$hotfix_name" ]; then
    echo "Usage: n0de-hotfix <hotfix-name>"
    echo "Example: n0de-hotfix critical-auth-bug"
    return 1
  fi

  echo -e "${BLUE}🚨 Starting hotfix workflow: $hotfix_name${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/parallel-deployment-system.js hotfix "$hotfix_name"
}

# Deploy tested hotfix
n0de-hotfix-deploy() {
  local hotfix_name="$1"
  
  if [ -z "$hotfix_name" ]; then
    echo "Usage: n0de-hotfix-deploy <hotfix-name>"
    return 1
  fi

  echo -e "${BLUE}🚀 Deploying hotfix: $hotfix_name${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/parallel-deployment-system.js deploy-hotfix "$hotfix_name"
}

# A/B testing between branches
n0de-ab-test() {
  local feature_a="$1"
  local feature_b="$2"
  local percentage="${3:-50}"
  
  if [ -z "$feature_a" ] || [ -z "$feature_b" ]; then
    echo "Usage: n0de-ab-test <feature-a> <feature-b> [percentage]"
    echo "Example: n0de-ab-test new-checkout old-checkout 25"
    return 1
  fi

  echo -e "${BLUE}🧪 Setting up A/B test: $feature_a vs $feature_b (${percentage}% split)${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/parallel-deployment-system.js ab-test "$feature_a" "$feature_b" "$percentage"
}

# Cleanup worktree environment
n0de-cleanup() {
  local branch_name="$1"
  
  if [ -z "$branch_name" ]; then
    echo "Usage: n0de-cleanup <branch-name>"
    return 1
  fi

  echo -e "${BLUE}🧹 Cleaning up environment: $branch_name${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/worktree-orchestrator.js cleanup "$branch_name"
  
  echo -e "${GREEN}✅ Environment $branch_name cleaned up${NC}"
}

# Sync changes between worktrees
n0de-sync() {
  local from_branch="$1"
  local to_branches="$2"
  
  if [ -z "$from_branch" ] || [ -z "$to_branches" ]; then
    echo "Usage: n0de-sync <from-branch> <to-branch1,to-branch2>"
    echo "Example: n0de-sync main feature/payments,feature/auth"
    return 1
  fi

  echo -e "${BLUE}🔄 Syncing $from_branch → $to_branches${NC}"
  
  cd /home/sol/n0de-deploy
  node .claude/agents/worktree-orchestrator.js sync "$from_branch" "$to_branches"
}

# Quick worktree status
n0de-wt-status() {
  echo -e "${BLUE}📊 Worktree Quick Status${NC}"
  echo "====================="
  
  cd /home/sol/n0de-deploy
  
  # List worktrees
  echo "🌳 Git Worktrees:"
  git worktree list | sed 's/^/  /'
  
  echo ""
  echo "🔍 Health Check:"
  
  # Check common ports
  for port in 3002 3003 3004; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" | grep -q "200"; then
      echo -e "  ✅ Port $port: Active"
    else
      echo -e "  ❌ Port $port: Inactive"
    fi
  done
  
  echo ""
  echo "🤖 Agents:"
  systemctl is-active n0de-error-agent.service >/dev/null && echo -e "  ✅ Error Agent" || echo -e "  ❌ Error Agent"
  systemctl is-active n0de-bi-dashboard.service >/dev/null && echo -e "  ✅ BI Dashboard" || echo -e "  ❌ BI Dashboard"
}

# Interactive worktree manager
n0de-wt-manager() {
  while true; do
    clear
    echo -e "${BLUE}🌳 N0DE Worktree Manager${NC}"
    echo "========================"
    echo ""
    echo "1. Create feature branch"
    echo "2. Setup staging environment"
    echo "3. List active environments"
    echo "4. Deploy to environments"
    echo "5. Run parallel tests"
    echo "6. Cleanup environment"
    echo "7. A/B test setup"
    echo "8. Exit"
    echo ""
    read -p "Choose option (1-8): " choice
    
    case $choice in
      1)
        read -p "Feature name: " feature_name
        read -p "Base branch [main]: " base_branch
        n0de-feature "${feature_name}" "${base_branch:-main}"
        read -p "Press Enter to continue..."
        ;;
      2)
        n0de-staging
        read -p "Press Enter to continue..."
        ;;
      3)
        n0de-worktrees
        read -p "Press Enter to continue..."
        ;;
      4)
        read -p "Environments (staging,production): " envs
        cd /home/sol/n0de-deploy
        node .claude/agents/parallel-deployment-system.js deploy-parallel "${envs:-staging,production}"
        read -p "Press Enter to continue..."
        ;;
      5)
        cd /home/sol/n0de-deploy
        node .claude/agents/parallel-deployment-system.js test-all
        read -p "Press Enter to continue..."
        ;;
      6)
        read -p "Branch name to cleanup: " branch_name
        n0de-cleanup "$branch_name"
        read -p "Press Enter to continue..."
        ;;
      7)
        read -p "Feature A: " feature_a
        read -p "Feature B: " feature_b
        read -p "Traffic % for A [50]: " percentage
        n0de-ab-test "$feature_a" "$feature_b" "${percentage:-50}"
        read -p "Press Enter to continue..."
        ;;
      8)
        echo "👋 Exiting worktree manager"
        break
        ;;
      *)
        echo "Invalid option"
        read -p "Press Enter to continue..."
        ;;
    esac
  done
}

# Export all functions
export -f n0de-feature n0de-feature-deploy n0de-feature-test n0de-feature-merge
export -f n0de-staging n0de-staging-deploy n0de-staging-promote
export -f n0de-worktrees n0de-parallel n0de-hotfix n0de-hotfix-deploy
export -f n0de-ab-test n0de-cleanup n0de-sync n0de-wt-status n0de-wt-manager

echo -e "${GREEN}🌳 N0DE Worktree commands loaded${NC}"
echo ""
echo "🚀 Parallel Development Commands:"
echo "   n0de-feature <name>           # Create isolated feature environment"
echo "   n0de-staging                  # Setup staging environment"
echo "   n0de-parallel <br1,br2,br3>  # Multiple feature environments"
echo "   n0de-hotfix <name>            # Emergency hotfix workflow"
echo "   n0de-ab-test <a> <b> [%]      # A/B testing setup"
echo "   n0de-wt-manager               # Interactive worktree manager"
echo "   n0de-worktrees                # List all environments"