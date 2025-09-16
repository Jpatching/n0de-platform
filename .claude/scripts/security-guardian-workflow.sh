#!/bin/bash
# SECURITY-GUARDIAN Workflow Script
# Automated workflow for Authentication security improvements and compliance

set -e

echo "🤖 SECURITY-GUARDIAN - Starting workflow"
echo "🌿 Branch: feature/security-enhancements"
echo "📋 Focus: Authentication security improvements and compliance"

# Switch to agent branch
echo "📍 Switching to agent branch..."
git checkout feature/security-enhancements
git pull origin feature/security-enhancements

# Check for conflicts with main
echo "🔍 Checking for conflicts with main..."
CONFLICTS=$(git merge-tree $(git merge-base feature/security-enhancements main) feature/security-enhancements main | wc -l)
if [ "$CONFLICTS" -gt 0 ]; then
  echo "⚠️  Potential conflicts detected with main branch"
  echo "   Consider rebasing or coordinating with other agents"
fi

# Run agent-specific checks
echo "🧪 Running agent-specific checks..."
case "security-guardian" in
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

echo "✅ SECURITY-GUARDIAN workflow completed"
echo ""
echo "📋 Next steps:"
echo "  1. Make your changes in the appropriate files:"
echo "     - src/auth/"
echo "     - frontend/**/auth/"
echo "     - *.guard.ts"
echo "     - *.strategy.ts"
echo "  2. Test your changes: ./.claude/scripts/security-guardian-workflow.sh"
echo "  3. Commit changes: git add . && git commit -m 'feat: agent work description'"
echo "  4. Push changes: git push origin feature/security-enhancements"
echo "  5. Create PR when ready: gh pr create --title 'feat: agent work' --body 'Description'"
