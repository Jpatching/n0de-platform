#!/bin/bash
# Pre-push hook: Security and performance validation

echo "🔒 Running security checks..."

# Check for secrets in code
if grep -r "sk_live\|pk_live\|password.*=" --include="*.ts" --include="*.js" /home/sol/n0de-deploy/; then
    echo "❌ Potential secrets found in code - push blocked"
    exit 1
fi

echo "✅ Security checks passed"
