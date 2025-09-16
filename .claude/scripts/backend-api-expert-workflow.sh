#!/bin/bash
# BACKEND-API-EXPERT Workflow Script
# Automated workflow for Backend API optimization and database improvements

set -e

echo "🤖 BACKEND-API-EXPERT - Starting workflow"
echo "🌿 Branch: feature/backend-performance"
echo "📋 Focus: Backend API optimization and database improvements"

# Switch to agent branch
echo "📍 Switching to agent branch..."
git checkout feature/backend-performance
git pull origin feature/backend-performance

# Check for conflicts with main
echo "🔍 Checking for conflicts with main..."
CONFLICTS=$(git merge-tree $(git merge-base feature/backend-performance main) feature/backend-performance main | wc -l)
if [ "$CONFLICTS" -gt 0 ]; then
  echo "⚠️  Potential conflicts detected with main branch"
  echo "   Consider rebasing or coordinating with other agents"
fi

# Run agent-specific checks
echo "🧪 Running agent-specific checks..."
case "backend-api-expert" in
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
    backend status || echo "backend not configured"
    ;;
esac

echo "✅ BACKEND-API-EXPERT workflow completed"
echo ""
echo "📋 Next steps:"
echo "  1. Make your changes in the appropriate files:"
echo "     - src/"
echo "     - prisma/"
echo "     - nest-cli.json"
echo "     - tsconfig.json"
echo "  2. Test your changes: ./.claude/scripts/backend-api-expert-workflow.sh"
echo "  3. Commit changes: git add . && git commit -m 'feat: agent work description'"
echo "  4. Push changes: git push origin feature/backend-performance"
echo "  5. Create PR when ready: gh pr create --title 'feat: agent work' --body 'Description'"
