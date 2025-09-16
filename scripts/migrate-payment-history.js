#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function migratePaymentHistory() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🚀 Starting PaymentHistory data migration...');
    
    // Check if PaymentHistory table exists and has data
    const existingRecords = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM payment_history 
      WHERE amount IS NULL OR "userId" IS NULL
    `;
    
    const count = existingRecords[0]?.count || 0;
    console.log(`📊 Found ${count} records needing migration`);
    
    if (count > 0) {
      // Get first user ID to use as default
      const firstUser = await prisma.user.findFirst();
      
      if (!firstUser) {
        console.log('⚠️  No users found, creating system user...');
        const systemUser = await prisma.user.create({
          data: {
            email: 'system@n0de.pro',
            name: 'System User',
            role: 'USER'
          }
        });
        firstUser = systemUser;
      }
      
      // Update records with missing data
      const updateResult = await prisma.$executeRaw`
        UPDATE payment_history 
        SET 
          amount = COALESCE(amount, 0),
          "userId" = COALESCE("userId", ${firstUser.id})
        WHERE amount IS NULL OR "userId" IS NULL
      `;
      
      console.log(`✅ Updated ${updateResult} payment history records`);
    }
    
    // Verify migration
    const remainingNulls = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM payment_history 
      WHERE amount IS NULL OR "userId" IS NULL
    `;
    
    if (remainingNulls[0]?.count > 0) {
      throw new Error(`Migration incomplete: ${remainingNulls[0].count} records still have null values`);
    }
    
    console.log('🎉 PaymentHistory migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migratePaymentHistory();
}

module.exports = migratePaymentHistory;