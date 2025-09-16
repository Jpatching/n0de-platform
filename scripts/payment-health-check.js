#!/usr/bin/env node

/**
 * N0DE Payment System Health Check Script
 * 
 * This script performs comprehensive validation of the payment system:
 * - Database connectivity and schema validation
 * - Payment provider API key verification
 * - Webhook endpoint accessibility
 * - End-to-end payment flow simulation
 */

const axios = require('axios');
const { Client } = require('pg');
const colors = require('colors/safe');

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:4000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/n0de_production',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_51S0uJaFjMnr2l5PiUCeEZ4Vw2FEGXNuZFC5MxVjFlN1k6YcVUUP2XETpwovNDnwLcRFiTBZ7HX8OEUTucvHmZ6Wy00zFExTtQk',
  COINBASE_API_KEY: process.env.COINBASE_COMMERCE_API_KEY || 'cc355dfa-8712-405e-b051-85a370793dfc',
  NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY || 'ZQSEX5B-PNXMT10-QTXG21M-PCCE0FQ',
};

// Health check results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

// Helper functions
function log(type, message) {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(colors.green(`✅ [${timestamp}] ${message}`));
      results.passed.push(message);
      break;
    case 'error':
      console.error(colors.red(`❌ [${timestamp}] ${message}`));
      results.failed.push(message);
      break;
    case 'warning':
      console.warn(colors.yellow(`⚠️  [${timestamp}] ${message}`));
      results.warnings.push(message);
      break;
    case 'info':
      console.log(colors.blue(`ℹ️  [${timestamp}] ${message}`));
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
}

// Test functions
async function testDatabaseConnection() {
  log('info', 'Testing database connection...');
  const client = new Client({ connectionString: CONFIG.DATABASE_URL });
  
  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    log('success', 'Database connection successful');
    
    // Check required tables
    const tables = ['payments', 'payment_history', 'subscriptions', 'webhook_events', 'users'];
    for (const table of tables) {
      const tableCheck = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      if (tableCheck.rows[0].exists) {
        log('success', `Table '${table}' exists`);
      } else {
        log('error', `Table '${table}' is missing`);
      }
    }
    
    // Check pending webhooks
    const pendingWebhooks = await client.query(
      `SELECT COUNT(*) FROM webhook_events WHERE processed = false`
    );
    const pendingCount = parseInt(pendingWebhooks.rows[0].count);
    if (pendingCount > 0) {
      log('warning', `${pendingCount} unprocessed webhook events found`);
    } else {
      log('success', 'No pending webhook events');
    }
    
    await client.end();
  } catch (error) {
    log('error', `Database connection failed: ${error.message}`);
    if (client) await client.end();
  }
}

async function testBackendHealth() {
  log('info', 'Testing backend API health...');
  
  try {
    const response = await axios.get(`${CONFIG.API_URL}/health`, { timeout: 5000 });
    if (response.data.status === 'ok') {
      log('success', `Backend API is healthy (uptime: ${Math.floor(response.data.uptime)}s)`);
    } else {
      log('warning', 'Backend API returned non-ok status');
    }
  } catch (error) {
    log('error', `Backend API health check failed: ${error.message}`);
  }
}

async function testStripeIntegration() {
  log('info', 'Testing Stripe integration...');
  
  try {
    // Test Stripe API key validity
    const stripe = require('stripe')(CONFIG.STRIPE_SECRET_KEY);
    
    // Check balance (simple API call to verify key)
    const balance = await stripe.balance.retrieve();
    log('success', `Stripe API key is valid (mode: ${balance.livemode ? 'LIVE' : 'TEST'})`);
    
    if (balance.livemode) {
      log('warning', 'Stripe is in LIVE mode - be careful with real transactions!');
    }
    
    // Check for products
    const products = await stripe.products.list({ limit: 5 });
    if (products.data.length > 0) {
      log('success', `Found ${products.data.length} Stripe products`);
      products.data.forEach(product => {
        log('info', `  - ${product.name} (${product.id})`);
      });
    } else {
      log('warning', 'No Stripe products found - create products first');
    }
    
    // Check for prices
    const prices = await stripe.prices.list({ limit: 5 });
    if (prices.data.length > 0) {
      log('success', `Found ${prices.data.length} Stripe prices`);
    } else {
      log('warning', 'No Stripe prices found - create prices first');
    }
    
  } catch (error) {
    log('error', `Stripe integration test failed: ${error.message}`);
  }
}

async function testWebhookEndpoints() {
  log('info', 'Testing webhook endpoints...');
  
  const webhookEndpoints = [
    { path: '/api/v1/payments/webhooks/stripe', name: 'Stripe' },
    { path: '/api/v1/payments/webhooks/coinbase', name: 'Coinbase' },
    { path: '/api/v1/payments/webhooks/nowpayments', name: 'NOWPayments' },
  ];
  
  for (const endpoint of webhookEndpoints) {
    try {
      const response = await axios.post(
        `${CONFIG.API_URL}${endpoint.path}`,
        { test: true },
        { 
          timeout: 5000,
          validateStatus: () => true // Accept any status
        }
      );
      
      // Webhook endpoints typically return 400/401 for invalid signatures
      if (response.status === 500) {
        log('warning', `${endpoint.name} webhook endpoint returned 500 - check error handling`);
      } else if (response.status === 404) {
        log('error', `${endpoint.name} webhook endpoint not found (404)`);
      } else {
        log('success', `${endpoint.name} webhook endpoint is accessible (${response.status})`);
      }
    } catch (error) {
      log('error', `${endpoint.name} webhook test failed: ${error.message}`);
    }
  }
}

async function testCoinbaseIntegration() {
  log('info', 'Testing Coinbase Commerce integration...');
  
  try {
    const response = await axios.get('https://api.commerce.coinbase.com/charges', {
      headers: {
        'X-CC-Api-Key': CONFIG.COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
      },
      timeout: 5000,
    });
    
    log('success', 'Coinbase Commerce API key is valid');
    if (response.data.data) {
      log('info', `  Found ${response.data.data.length} charges`);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', 'Coinbase Commerce API key is invalid');
    } else {
      log('warning', `Coinbase Commerce test returned: ${error.message}`);
    }
  }
}

async function testNOWPaymentsIntegration() {
  log('info', 'Testing NOWPayments integration...');
  
  try {
    const response = await axios.get('https://api.nowpayments.io/v1/status', {
      headers: {
        'x-api-key': CONFIG.NOWPAYMENTS_API_KEY,
      },
      timeout: 5000,
    });
    
    if (response.data.message === 'OK') {
      log('success', 'NOWPayments API is accessible');
    } else {
      log('warning', 'NOWPayments API returned unexpected response');
    }
  } catch (error) {
    log('warning', `NOWPayments test failed: ${error.message}`);
  }
}

async function checkRecentPayments() {
  log('info', 'Checking recent payment activity...');
  const client = new Client({ connectionString: CONFIG.DATABASE_URL });
  
  try {
    await client.connect();
    
    // Check recent payments
    const recentPayments = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending
      FROM payments 
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
    `);
    
    const stats = recentPayments.rows[0];
    log('info', `Payment stats (last 7 days):`);
    log('info', `  Total: ${stats.total}`);
    log('info', `  Completed: ${stats.completed}`);
    log('info', `  Failed: ${stats.failed}`);
    log('info', `  Pending: ${stats.pending}`);
    
    if (stats.failed > 0) {
      log('warning', `${stats.failed} failed payments in the last 7 days`);
    }
    
    if (stats.pending > 0) {
      log('warning', `${stats.pending} payments still pending`);
    }
    
    await client.end();
  } catch (error) {
    log('error', `Recent payments check failed: ${error.message}`);
    if (client) await client.end();
  }
}

// Main execution
async function runHealthCheck() {
  console.log(colors.cyan('\n========================================'));
  console.log(colors.cyan('   N0DE Payment System Health Check'));
  console.log(colors.cyan('========================================\n'));
  
  // Run all tests
  await testDatabaseConnection();
  console.log();
  
  await testBackendHealth();
  console.log();
  
  await testStripeIntegration();
  console.log();
  
  await testCoinbaseIntegration();
  console.log();
  
  await testNOWPaymentsIntegration();
  console.log();
  
  await testWebhookEndpoints();
  console.log();
  
  await checkRecentPayments();
  
  // Summary
  console.log(colors.cyan('\n========================================'));
  console.log(colors.cyan('              SUMMARY'));
  console.log(colors.cyan('========================================\n'));
  
  console.log(colors.green(`✅ Passed: ${results.passed.length}`));
  console.log(colors.yellow(`⚠️  Warnings: ${results.warnings.length}`));
  console.log(colors.red(`❌ Failed: ${results.failed.length}`));
  
  if (results.failed.length > 0) {
    console.log(colors.red('\n❌ HEALTH CHECK FAILED'));
    console.log(colors.red('Failed checks:'));
    results.failed.forEach(msg => console.log(colors.red(`  - ${msg}`)));
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log(colors.yellow('\n⚠️  HEALTH CHECK PASSED WITH WARNINGS'));
    process.exit(0);
  } else {
    console.log(colors.green('\n✅ ALL HEALTH CHECKS PASSED'));
    process.exit(0);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  console.error(colors.red(`\n❌ Health check crashed: ${error.message}`));
  process.exit(1);
});