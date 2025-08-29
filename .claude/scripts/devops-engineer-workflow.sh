#!/bin/bash
# DEVOPS-ENGINEER Workflow Script
# Automated workflow for Performance monitoring and deployment automation

set -e

echo "🤖 DEVOPS-ENGINEER - Starting workflow"
echo "🌿 Branch: feature/infrastructure-optimization"
echo "📋 Focus: Performance monitoring and deployment automation"

# Switch to agent branch
echo "📍 Switching to agent branch..."
git checkout feature/infrastructure-optimization
git pull origin feature/infrastructure-optimization

# Check for conflicts with main
echo "🔍 Checking for conflicts with main..."
CONFLICTS=$(git merge-tree $(git merge-base feature/infrastructure-optimization main) feature/infrastructure-optimization main | wc -l)
if [ "$CONFLICTS" -gt 0 ]; then
  echo "⚠️  Potential conflicts detected with main branch"
  echo "   Consider rebasing or coordinating with other agents"
fi

# Run agent-specific checks
echo "🧪 Running agent-specific checks..."
case "devops-engineer" in
  "frontend-specialist")
    cd frontend/n0de-website
    npm run lint
    npm run type-check
    npm run test
    cd ../..
    ;;
  "backend-api-expert")
    npm run lint
    npm run test
    npm run test:e2e
    ;;
  "payments-specialist")
    npm test -- payment billing subscription
    ;;
  "security-guardian")
    npm audit
    npm test -- auth security
    ;;
  "devops-engineer")
    # Check deployment configurations
    echo "  Validating deployment configs..."
    railway status || echo "Railway not configured"
    ;;
esac

echo "✅ DEVOPS-ENGINEER workflow completed"
echo ""
echo "📋 Next steps:"
echo "  1. Make your changes in the appropriate files:"
echo "     - .github/"
echo "     - railway.toml"
echo "     - docker*"
echo "     - monitoring/"
echo "     - scripts/"
echo "  2. Test your changes: ./.claude/scripts/devops-engineer-workflow.sh"
echo "  3. Commit changes: git add . && git commit -m 'feat: agent work description'"
echo "  4. Push changes: git push origin feature/infrastructure-optimization"
echo "  5. Create PR when ready: gh pr create --title 'feat: agent work' --body 'Description'"
