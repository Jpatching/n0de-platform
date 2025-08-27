#!/usr/bin/env node

/**
 * Initialize Railway PostgreSQL database with n0de platform schema and data
 */

import pg from 'pg';
import chalk from 'chalk';

const { Client } = pg;

async function initRailwayDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log(chalk.green('✅ Connected to Railway PostgreSQL'));

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        plan_type TEXT NOT NULL DEFAULT 'free',
        monthly_requests INTEGER DEFAULT 100000,
        requests_used INTEGER DEFAULT 0,
        rate_limit INTEGER DEFAULT 10,
        monthly_cost DECIMAL(10,2) DEFAULT 0.00,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        notes TEXT
      )
    `);
    console.log(chalk.green('✅ Users table created'));

    // Create usage_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_uuid TEXT NOT NULL,
        method TEXT NOT NULL,
        requests INTEGER DEFAULT 1,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
      )
    `);
    console.log(chalk.green('✅ Usage logs table created'));

    // Create payments table  
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(chalk.green('✅ Payments table created'));

    // Insert sample users
    const users = [
      {
        uuid: 'user_demo_pro_001',
        name: 'Demo User',
        email: 'demo@n0de.com',
        api_key: 'sk_live_demo_pro_key_12345',
        plan_type: 'pro',
        monthly_requests: 10000000,
        requests_used: 250000,
        rate_limit: 200,
        monthly_cost: 99.00,
        notes: 'Sample user for testing'
      },
      {
        uuid: 'user_enterprise_001',
        name: 'Enterprise User',
        email: 'enterprise@n0de.com',
        api_key: 'sk_live_enterprise_key_67890',
        plan_type: 'enterprise',
        monthly_requests: 100000000,
        requests_used: 500000,
        rate_limit: 1000,
        monthly_cost: 299.00,
        notes: 'Enterprise customer'
      },
      {
        uuid: 'user_starter_001',
        name: 'Starter User',
        email: 'starter@n0de.com',
        api_key: 'sk_live_starter_key_abcdef',
        plan_type: 'starter',
        monthly_requests: 1000000,
        requests_used: 50000,
        rate_limit: 50,
        monthly_cost: 29.00,
        notes: 'Starter plan user'
      },
      {
        uuid: 'user_free_001',
        name: 'Free User',
        email: 'free@n0de.com',
        api_key: 'sk_live_free_key_xyz123',
        plan_type: 'free',
        monthly_requests: 100000,
        requests_used: 8500,
        rate_limit: 10,
        monthly_cost: 0.00,
        notes: 'Free tier user'
      }
    ];

    for (const user of users) {
      await client.query(`
        INSERT INTO users (uuid, name, email, api_key, plan_type, monthly_requests, requests_used, rate_limit, monthly_cost, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          api_key = EXCLUDED.api_key,
          plan_type = EXCLUDED.plan_type,
          monthly_requests = EXCLUDED.monthly_requests,
          requests_used = EXCLUDED.requests_used,
          rate_limit = EXCLUDED.rate_limit,
          monthly_cost = EXCLUDED.monthly_cost,
          notes = EXCLUDED.notes
      `, [user.uuid, user.name, user.email, user.api_key, user.plan_type, user.monthly_requests, user.requests_used, user.rate_limit, user.monthly_cost, user.notes]);
    }

    console.log(chalk.green(`✅ Inserted ${users.length} sample users`));

    // Insert sample usage logs
    const usageLogs = [
      { user_uuid: 'user_demo_pro_001', method: 'getAccountInfo', requests: 1000 },
      { user_uuid: 'user_demo_pro_001', method: 'getBalance', requests: 500 },
      { user_uuid: 'user_enterprise_001', method: 'getTransaction', requests: 2000 },
      { user_uuid: 'user_starter_001', method: 'sendTransaction', requests: 100 }
    ];

    for (const log of usageLogs) {
      await client.query(`
        INSERT INTO usage_logs (user_uuid, method, requests)
        VALUES ($1, $2, $3)
      `, [log.user_uuid, log.method, log.requests]);
    }

    console.log(chalk.green(`✅ Inserted ${usageLogs.length} usage log entries`));

    console.log(chalk.green('🎉 Railway database initialization complete!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Database initialization failed:'), error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initRailwayDatabase();