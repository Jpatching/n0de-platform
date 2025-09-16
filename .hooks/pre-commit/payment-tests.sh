#!/bin/bash
# Pre-commit hook: Run payment system tests

echo "🧪 Running payment system tests before commit..."

# Run automated payment tests
if /home/sol/n0de-deploy/scripts/automated-payment-tests.sh; then
    echo "✅ Payment tests passed"
else
    echo "❌ Payment tests failed - commit blocked"
    exit 1
fi

# Check TypeScript compilation
cd /home/sol/n0de-deploy/frontend
if npm run build; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed - commit blocked"
    exit 1
fi
