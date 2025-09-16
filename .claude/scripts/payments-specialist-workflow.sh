#!/bin/bash
# PAYMENTS-SPECIALIST Workflow Script
# Automated workflow for Payment flow optimization and revenue improvements

set -e

echo "🤖 PAYMENTS-SPECIALIST - Starting workflow"
echo "🌿 Branch: feature/payment-optimization"
echo "📋 Focus: Payment flow optimization and revenue improvements"

# Switch to agent branch
echo "📍 Switching to agent branch..."
git checkout feature/payment-optimization
git pull origin feature/payment-optimization

# Check for conflicts with main
echo "🔍 Checking for conflicts with main..."
CONFLICTS=$(git merge-tree $(git merge-base feature/payment-optimization main) feature/payment-optimization main | wc -l)
if [ "$CONFLICTS" -gt 0 ]; then
  echo "⚠️  Potential conflicts detected with main branch"
  echo "   Consider rebasing or coordinating with other agents"
fi

# Run agent-specific checks
echo "🧪 Running agent-specific checks..."
case "payments-specialist" in
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

echo "✅ PAYMENTS-SPECIALIST workflow completed"
echo ""
echo "📋 Next steps:"
echo "  1. Make your changes in the appropriate files:"
echo "     - src/billing/"
echo "     - src/payments/"
echo "     - src/subscriptions/"
echo "     - frontend/**/billing/"
echo "     - frontend/**/checkout/"
echo "  2. Test your changes: ./.claude/scripts/payments-specialist-workflow.sh"
echo "  3. Commit changes: git add . && git commit -m 'feat: agent work description'"
echo "  4. Push changes: git push origin feature/payment-optimization"
echo "  5. Create PR when ready: gh pr create --title 'feat: agent work' --body 'Description'"
