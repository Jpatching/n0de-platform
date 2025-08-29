#!/bin/bash

# Safe deployment script for N0DE backend with database migration
echo "🚀 Starting N0DE Backend Deployment with Migration..."

# Step 1: Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Prisma generate failed"
    exit 1
}

# Step 2: Run data migration script  
echo "🔄 Running PaymentHistory data migration..."
node migrate-payment-history.js || {
    echo "❌ Data migration failed"
    exit 1
}

# Step 3: Apply schema changes (now safe since data is fixed)
echo "🗄️  Applying schema changes..."
npx prisma db push || {
    echo "❌ Schema push failed"
    exit 1
}

# Step 4: Verify deployment readiness
echo "✅ Migration completed successfully!"
echo "📋 Summary:"
echo "  - Prisma client generated"
echo "  - PaymentHistory data migrated"
echo "  - Schema changes applied"
echo "  - Ready for Railway deployment"

echo ""
echo "🚀 To deploy to Railway, run: railway up"