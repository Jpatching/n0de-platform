const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:bOOTEOuUdHGDpqgmYJJuqsALFqtCPDbH@junction.proxy.rlwy.net:21162/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createBridgeTables() {
  try {
    await client.connect();
    console.log('Connected to database');

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
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_transactions_userId_idx" ON "bridge_transactions"("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_transactions_status_idx" ON "bridge_transactions"("status");');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_transactions_sourceChain_idx" ON "bridge_transactions"("sourceChain");');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_transactions_createdAt_idx" ON "bridge_transactions"("createdAt" DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_transactions_sourceTxHash_idx" ON "bridge_transactions"("sourceTxHash");');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_fee_collections_bridgeId_idx" ON "bridge_fee_collections"("bridgeId");');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_fee_collections_collectedAt_idx" ON "bridge_fee_collections"("collectedAt");');
    await client.query('CREATE INDEX IF NOT EXISTS "bridge_fee_collections_feeType_idx" ON "bridge_fee_collections"("feeType");');
    console.log('✅ Created indexes');

    // Add foreign keys (only if they don't exist)
    try {
      await client.query('ALTER TABLE "bridge_transactions" ADD CONSTRAINT "bridge_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;');
      console.log('✅ Added bridge_transactions foreign key');
    } catch (e) {
      console.log('ℹ️ Foreign key bridge_transactions_userId_fkey already exists');
    }

    try {
      await client.query('ALTER TABLE "bridge_fee_collections" ADD CONSTRAINT "bridge_fee_collections_bridgeId_fkey" FOREIGN KEY ("bridgeId") REFERENCES "bridge_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;');
      console.log('✅ Added bridge_fee_collections foreign key');
    } catch (e) {
      console.log('ℹ️ Foreign key bridge_fee_collections_bridgeId_fkey already exists');
    }

    console.log('🎉 Bridge tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating bridge tables:', error);
  } finally {
    await client.end();
  }
}

createBridgeTables(); 