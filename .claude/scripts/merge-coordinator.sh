#!/bin/bash
# N0DE Multi-Agent Merge Coordinator
# Coordinates merging changes from all agent branches

set -e

echo "🔄 N0DE Multi-Agent Merge Coordinator"
echo "===================================="
echo ""

# Get current branch status
echo "📊 Current Branch Status:"
echo "  frontend-specialist: $(git rev-list --count main..origin/feature/frontend-optimization 2>/dev/null || echo 'N/A') commits ahead"
echo "  backend-api-expert: $(git rev-list --count main..origin/feature/backend-performance 2>/dev/null || echo 'N/A') commits ahead"
echo "  payments-specialist: $(git rev-list --count main..origin/feature/payment-optimization 2>/dev/null || echo 'N/A') commits ahead"
echo "  security-guardian: $(git rev-list --count main..origin/feature/security-enhancements 2>/dev/null || echo 'N/A') commits ahead"
echo "  devops-engineer: $(git rev-list --count main..origin/feature/infrastructure-optimization 2>/dev/null || echo 'N/A') commits ahead"
echo ""

# Check for conflicts between agent branches
echo "🔍 Checking for inter-agent conflicts..."
CONFLICT_FOUND=false

echo "  Checking frontend-specialist vs payments-specialist..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/frontend-optimization origin/feature/payment-optimization) origin/feature/frontend-optimization origin/feature/payment-optimization 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/frontend-optimization and feature/payment-optimization"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking frontend-specialist vs security-guardian..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/frontend-optimization origin/feature/security-enhancements) origin/feature/frontend-optimization origin/feature/security-enhancements 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/frontend-optimization and feature/security-enhancements"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking backend-api-expert vs frontend-specialist..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/backend-performance origin/feature/frontend-optimization) origin/feature/backend-performance origin/feature/frontend-optimization 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/backend-performance and feature/frontend-optimization"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking backend-api-expert vs payments-specialist..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/backend-performance origin/feature/payment-optimization) origin/feature/backend-performance origin/feature/payment-optimization 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/backend-performance and feature/payment-optimization"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking backend-api-expert vs security-guardian..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/backend-performance origin/feature/security-enhancements) origin/feature/backend-performance origin/feature/security-enhancements 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/backend-performance and feature/security-enhancements"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking backend-api-expert vs devops-engineer..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/backend-performance origin/feature/infrastructure-optimization) origin/feature/backend-performance origin/feature/infrastructure-optimization 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/backend-performance and feature/infrastructure-optimization"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking payments-specialist vs security-guardian..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/payment-optimization origin/feature/security-enhancements) origin/feature/payment-optimization origin/feature/security-enhancements 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/payment-optimization and feature/security-enhancements"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi

echo "  Checking devops-engineer vs frontend-specialist..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/infrastructure-optimization origin/feature/frontend-optimization) origin/feature/infrastructure-optimization origin/feature/frontend-optimization 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/infrastructure-optimization and feature/frontend-optimization"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking devops-engineer vs payments-specialist..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/infrastructure-optimization origin/feature/payment-optimization) origin/feature/infrastructure-optimization origin/feature/payment-optimization 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/infrastructure-optimization and feature/payment-optimization"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi
echo "  Checking devops-engineer vs security-guardian..."
CONFLICTS=$(git merge-tree $(git merge-base origin/feature/infrastructure-optimization origin/feature/security-enhancements) origin/feature/infrastructure-optimization origin/feature/security-enhancements 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between feature/infrastructure-optimization and feature/security-enhancements"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi

if [ "$CONFLICT_FOUND" = true ]; then
  echo ""
  echo "❌ Inter-agent conflicts detected!"
  echo "   Coordinate with other agents to resolve conflicts before merging"
  exit 1
fi

echo ""
echo "✅ No conflicts detected between agent branches"
echo ""
echo "🚀 Ready for coordinated merge to main!"
echo ""
echo "📋 Recommended merge order:"
echo "  1. frontend-specialist (feature/frontend-optimization) - squash merge"
echo "  2. backend-api-expert (feature/backend-performance) - squash merge"
echo "  3. payments-specialist (feature/payment-optimization) - squash merge"
echo "  4. security-guardian (feature/security-enhancements) - merge merge"
echo "  5. devops-engineer (feature/infrastructure-optimization) - squash merge"
echo ""
echo "💡 To proceed with merges:"
echo "   1. Review all PRs are approved"
echo "   2. Run: ./.claude/scripts/coordinated-merge.sh"
