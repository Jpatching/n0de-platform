const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:bOOTEOuUdHGDpqgmYJJuqsALFqtCPDbH@junction.proxy.rlwy.net:21162/railway',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 10000
});

async function createTable() {
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('Creating bridge_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bridge_transactions (
        id TEXT PRIMARY KEY,
        "userId" TEXT,
        "sourceChain" TEXT,
        "targetChain" TEXT,
        "sourceToken" TEXT,
        "targetToken" TEXT,
        amount DOUBLE PRECISION,
        "bridgeFee" DOUBLE PRECISION DEFAULT 0,
        "convenienceFee" DOUBLE PRECISION DEFAULT 0,
        "netAmount" DOUBLE PRECISION,
        status TEXT DEFAULT 'pending',
        "sourceTxHash" TEXT,
        "targetTxHash" TEXT,
        "vaaId" TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT NOW(),
        "completedAt" TIMESTAMP(3)
      )
    `);
    
    console.log('✅ bridge_transactions table created!');
    
    console.log('Creating bridge_fee_collections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bridge_fee_collections (
        id TEXT PRIMARY KEY,
        "bridgeId" TEXT,
        "feeAmount" DOUBLE PRECISION,
        "feeType" TEXT,
        "collectedAt" TIMESTAMP(3) DEFAULT NOW()
      )
    `);
    
    console.log('✅ bridge_fee_collections table created!');
    console.log('🎉 All tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    try {
      await client.end();
      console.log('Connection closed');
    } catch (e) {
      console.log('Error closing connection:', e.message);
    }
  }
}

createTable(); 