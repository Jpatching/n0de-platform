const { Client } = require('pg');

async function createBridgeTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create bridge_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "bridge_transactions" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "sourceChain" TEXT NOT NULL,
          "targetChain" TEXT NOT NULL,
          "sourceToken" TEXT NOT NULL,
          "targetToken" TEXT NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "bridgeFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "convenienceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "netAmount" DOUBLE PRECISION NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "sourceTxHash" TEXT,
          "targetTxHash" TEXT,
          "vaaId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" TIMESTAMP(3),
          CONSTRAINT "bridge_transactions_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Created bridge_transactions table');

    // Create bridge_fee_collections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "bridge_fee_collections" (
          "id" TEXT NOT NULL,
          "bridgeId" TEXT NOT NULL,
          "feeAmount" DOUBLE PRECISION NOT NULL,
          "feeType" TEXT NOT NULL,
          "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "bridge_fee_collections_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Created bridge_fee_collections table');

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "bridge_transactions_userId_idx" ON "bridge_transactions"("userId");',
      'CREATE INDEX IF NOT EXISTS "bridge_transactions_status_idx" ON "bridge_transactions"("status");',
      'CREATE INDEX IF NOT EXISTS "bridge_transactions_sourceChain_idx" ON "bridge_transactions"("sourceChain");',
      'CREATE INDEX IF NOT EXISTS "bridge_transactions_createdAt_idx" ON "bridge_transactions"("createdAt" DESC);',
      'CREATE INDEX IF NOT EXISTS "bridge_transactions_sourceTxHash_idx" ON "bridge_transactions"("sourceTxHash");',
      'CREATE INDEX IF NOT EXISTS "bridge_fee_collections_bridgeId_idx" ON "bridge_fee_collections"("bridgeId");',
      'CREATE INDEX IF NOT EXISTS "bridge_fee_collections_collectedAt_idx" ON "bridge_fee_collections"("collectedAt");',
      'CREATE INDEX IF NOT EXISTS "bridge_fee_collections_feeType_idx" ON "bridge_fee_collections"("feeType");'
    ];

    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Created all indexes');

    // Check if users table exists before adding foreign keys
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (usersTableExists.rows[0].exists) {
      // Add foreign key constraints
      await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'bridge_transactions_userId_fkey'
            ) THEN
                ALTER TABLE "bridge_transactions" ADD CONSTRAINT "bridge_transactions_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
            
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'bridge_fee_collections_bridgeId_fkey'
            ) THEN
                ALTER TABLE "bridge_fee_collections" ADD CONSTRAINT "bridge_fee_collections_bridgeId_fkey" 
                FOREIGN KEY ("bridgeId") REFERENCES "bridge_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END $$;
      `);
      console.log('✅ Added foreign key constraints');
    } else {
      console.log('⚠️  Users table not found, skipping foreign key constraints');
    }

    console.log('🎉 Bridge tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating bridge tables:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createBridgeTables(); 