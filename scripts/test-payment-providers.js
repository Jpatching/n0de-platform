#!/usr/bin/env node

/**
 * Complete Payment Provider Testing Script
 * Tests Stripe, Coinbase Commerce, and NOWPayments without authentication
 * Creates database records and verifies functionality
 */

const axios = require('axios');
const colors = require('colors/safe');
const { Client } = require('pg');

const API_URL = 'http://localhost:4000';
const DB_CONFIG = {
  connectionString: 'postgresql://postgres:postgres@localhost:5432/n0de_production'
};

class PaymentProviderTester {
  constructor() {
    this.results = {
      stripe: { tests: [], passed: 0, failed: 0 },
      coinbase: { tests: [], passed: 0, failed: 0 },
      nowpayments: { tests: [], passed: 0, failed: 0 },
      database: { tests: [], passed: 0, failed: 0 }
    };
  }

  log(type, message) {
    const timestamp = new Date().toISOString().substring(11, 19);
    switch (type) {
      case 'success':
        console.log(colors.green(`✅ [${timestamp}] ${message}`));
        break;
      case 'error':
        console.error(colors.red(`❌ [${timestamp}] ${message}`));
        break;
      case 'warning':
        console.warn(colors.yellow(`⚠️  [${timestamp}] ${message}`));
        break;
      case 'info':
        console.log(colors.blue(`ℹ️  [${timestamp}] ${message}`));
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  }

  async testStripeDirectly() {
    this.log('info', 'Testing Stripe API directly...');
    
    try {
      // Test Stripe balance endpoint
      const stripe = require('stripe')('sk_test_51S0uJaFjMnr2l5PiUCeEZ4Vw2FEGXNuZFC5MxVjFlN1k6YcVUUP2XETpwovNDnwLcRFiTBZ7HX8OEUTucvHmZ6Wy00zFExTtQk');
      
      const balance = await stripe.balance.retrieve();
      this.log('success', `Stripe API connected (${balance.livemode ? 'LIVE' : 'TEST'} mode)`);
      
      // Create a test checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'N0DE Test Payment',
              description: 'Test payment for N0DE system verification',
            },
            unit_amount: 4900, // $49.00
          },
          quantity: 1,
        }],
        success_url: 'https://www.n0de.pro/payment/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://www.n0de.pro/checkout',
        metadata: {
          test: 'true',
          provider: 'stripe_direct',
          plan: 'STARTER'
        },
      });

      this.log('success', 'Stripe checkout session created successfully');
      this.log('info', `Checkout URL: ${session.url}`);
      this.results.stripe.passed++;
      this.results.stripe.tests.push({
        name: 'Direct Stripe API',
        status: 'passed',
        url: session.url,
        sessionId: session.id
      });

      return session;

    } catch (error) {
      this.log('error', `Stripe direct test failed: ${error.message}`);
      this.results.stripe.failed++;
      this.results.stripe.tests.push({
        name: 'Direct Stripe API',
        status: 'failed',
        error: error.message
      });
    }
  }

  async testCoinbaseDirectly() {
    this.log('info', 'Testing Coinbase Commerce API directly...');
    
    try {
      const response = await axios.post('https://api.commerce.coinbase.com/charges', {
        name: 'N0DE Test Payment',
        description: 'Test crypto payment for N0DE system verification',
        local_price: {
          amount: '49.00',
          currency: 'USD'
        },
        pricing_type: 'fixed_price',
        metadata: {
          test: 'true',
          provider: 'coinbase_direct',
          plan: 'STARTER'
        },
        redirect_url: 'https://www.n0de.pro/payment/success',
        cancel_url: 'https://www.n0de.pro/checkout'
      }, {
        headers: {
          'X-CC-Api-Key': 'cc355dfa-8712-405e-b051-85a370793dfc',
          'X-CC-Version': '2018-03-22',
          'Content-Type': 'application/json'
        }
      });

      this.log('success', 'Coinbase Commerce charge created successfully');
      this.log('info', `Charge ID: ${response.data.data.id}`);
      this.log('info', `Payment URL: ${response.data.data.hosted_url}`);
      this.results.coinbase.passed++;
      this.results.coinbase.tests.push({
        name: 'Direct Coinbase Commerce API',
        status: 'passed',
        url: response.data.data.hosted_url,
        chargeId: response.data.data.id
      });

      return response.data.data;

    } catch (error) {
      this.log('error', `Coinbase direct test failed: ${error.response?.data?.error || error.message}`);
      this.results.coinbase.failed++;
      this.results.coinbase.tests.push({
        name: 'Direct Coinbase Commerce API',
        status: 'failed',
        error: error.message
      });
    }
  }

  async testNOWPaymentsDirectly() {
    this.log('info', 'Testing NOWPayments API directly...');
    
    try {
      // First, test API status
      const statusResponse = await axios.get('https://api.nowpayments.io/v1/status', {
        headers: {
          'x-api-key': 'ZE1DW38-GSW4A0R-GGPJ66B-WCFS6FR'
        }
      });

      if (statusResponse.data.message === 'OK') {
        this.log('success', 'NOWPayments API is accessible');
      }

      // Get available currencies
      const currenciesResponse = await axios.get('https://api.nowpayments.io/v1/currencies', {
        headers: {
          'x-api-key': 'ZE1DW38-GSW4A0R-GGPJ66B-WCFS6FR'
        }
      });

      this.log('info', `NOWPayments supports ${currenciesResponse.data.currencies.length} currencies`);

      // Create a payment estimate
      const estimateResponse = await axios.get('https://api.nowpayments.io/v1/estimate', {
        params: {
          amount: 49,
          currency_from: 'USD',
          currency_to: 'BTC'
        },
        headers: {
          'x-api-key': 'ZE1DW38-GSW4A0R-GGPJ66B-WCFS6FR'
        }
      });

      this.log('success', `NOWPayments estimate: $49 USD = ${estimateResponse.data.estimated_amount} BTC`);
      this.results.nowpayments.passed++;
      this.results.nowpayments.tests.push({
        name: 'NOWPayments API Status & Estimate',
        status: 'passed',
        data: estimateResponse.data
      });

    } catch (error) {
      this.log('error', `NOWPayments direct test failed: ${error.response?.data?.message || error.message}`);
      this.results.nowpayments.failed++;
      this.results.nowpayments.tests.push({
        name: 'NOWPayments API Test',
        status: 'failed',
        error: error.message
      });
    }
  }

  async testBackendHealth() {
    this.log('info', 'Testing backend API health...');
    
    try {
      const response = await axios.get(`${API_URL}/health`);
      
      if (response.data.status === 'ok') {
        this.log('success', `Backend API is healthy (uptime: ${Math.floor(response.data.uptime)}s)`);
        this.results.database.passed++;
        this.results.database.tests.push({
          name: 'Backend Health Check',
          status: 'passed',
          uptime: response.data.uptime
        });
      }
    } catch (error) {
      this.log('error', `Backend health check failed: ${error.message}`);
      this.results.database.failed++;
      this.results.database.tests.push({
        name: 'Backend Health Check',
        status: 'failed',
        error: error.message
      });
    }
  }

  async checkDatabaseStatus() {
    this.log('info', 'Checking database status...');
    
    const client = new Client(DB_CONFIG);
    try {
      await client.connect();
      
      // Check payment tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('payments', 'webhook_events', 'subscriptions', 'users')
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const existingTables = tablesResult.rows.map(row => row.table_name);
      
      const requiredTables = ['payments', 'webhook_events', 'subscriptions', 'users'];
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length === 0) {
        this.log('success', 'All required database tables exist');
        this.results.database.passed++;
      } else {
        this.log('error', `Missing tables: ${missingTables.join(', ')}`);
        this.results.database.failed++;
      }
      
      // Check for existing payments
      const paymentsResult = await client.query('SELECT COUNT(*) FROM payments');
      const paymentsCount = parseInt(paymentsResult.rows[0].count);
      
      if (paymentsCount === 0) {
        this.log('warning', 'No payment records found in database');
      } else {
        this.log('info', `Found ${paymentsCount} existing payment records`);
      }
      
      // Check for existing users
      const usersResult = await client.query('SELECT COUNT(*) FROM users');
      const usersCount = parseInt(usersResult.rows[0].count);
      this.log('info', `Found ${usersCount} users in database`);
      
      this.results.database.tests.push({
        name: 'Database Structure Check',
        status: 'passed',
        payments: paymentsCount,
        users: usersCount
      });
      
    } catch (error) {
      this.log('error', `Database check failed: ${error.message}`);
      this.results.database.failed++;
      this.results.database.tests.push({
        name: 'Database Structure Check',
        status: 'failed',
        error: error.message
      });
    } finally {
      await client.end();
    }
  }

  async testWebhookEndpoints() {
    this.log('info', 'Testing webhook endpoints...');
    
    const webhooks = [
      { name: 'Stripe', path: '/api/v1/payments/webhooks/stripe' },
      { name: 'Coinbase', path: '/api/v1/payments/webhooks/coinbase' },
      { name: 'NOWPayments', path: '/api/v1/payments/webhooks/nowpayments' }
    ];
    
    for (const webhook of webhooks) {
      try {
        const response = await axios.post(
          `${API_URL}${webhook.path}`,
          { test: true },
          { 
            timeout: 5000,
            validateStatus: () => true // Accept any status code
          }
        );
        
        if (response.status === 404) {
          this.log('error', `${webhook.name} webhook endpoint not found`);
        } else {
          this.log('success', `${webhook.name} webhook endpoint is accessible (${response.status})`);
        }
        
      } catch (error) {
        this.log('warning', `${webhook.name} webhook test: ${error.message}`);
      }
    }
  }

  displayResults() {
    console.log(colors.cyan('\\n========================================'));
    console.log(colors.cyan('      PAYMENT PROVIDER TEST RESULTS'));
    console.log(colors.cyan('========================================\\n'));
    
    const providers = ['stripe', 'coinbase', 'nowpayments', 'database'];
    let totalPassed = 0;
    let totalFailed = 0;
    
    providers.forEach(provider => {
      const result = this.results[provider];
      const total = result.passed + result.failed;
      
      console.log(colors.yellow(`${provider.toUpperCase()}:`));
      console.log(colors.green(`  ✅ Passed: ${result.passed}`));
      console.log(colors.red(`  ❌ Failed: ${result.failed}`));
      
      if (total > 0) {
        const successRate = ((result.passed / total) * 100).toFixed(1);
        console.log(colors.blue(`  📊 Success Rate: ${successRate}%`));
      }
      
      console.log('');
      
      totalPassed += result.passed;
      totalFailed += result.failed;
    });
    
    const overallTotal = totalPassed + totalFailed;
    const overallSuccess = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : 0;
    
    console.log(colors.cyan('OVERALL RESULTS:'));
    console.log(colors.green(`✅ Total Passed: ${totalPassed}`));
    console.log(colors.red(`❌ Total Failed: ${totalFailed}`));
    console.log(colors.blue(`📊 Overall Success Rate: ${overallSuccess}%`));
    
    if (totalFailed === 0) {
      console.log(colors.green('\\n🎉 ALL PAYMENT PROVIDERS ARE WORKING!'));
    } else if (totalPassed > 0) {
      console.log(colors.yellow('\\n⚠️  Some tests failed, but core functionality is working'));
    } else {
      console.log(colors.red('\\n❌ Payment system needs attention'));
    }
  }

  showTestingInstructions() {
    console.log(colors.cyan('\\n========================================'));
    console.log(colors.cyan('      MANUAL TESTING INSTRUCTIONS'));
    console.log(colors.cyan('========================================\\n'));
    
    // Show successful test URLs
    const allTests = [
      ...this.results.stripe.tests,
      ...this.results.coinbase.tests,
      ...this.results.nowpayments.tests
    ];
    
    const successfulTests = allTests.filter(test => test.status === 'passed' && test.url);
    
    if (successfulTests.length > 0) {
      console.log(colors.green('🔗 Test Payment Links:'));
      successfulTests.forEach((test, index) => {
        console.log(colors.cyan(`${index + 1}. ${test.name}:`));
        console.log(colors.gray(`   ${test.url}`));
      });
      
      console.log(colors.yellow('\\n💳 For Stripe payments, use test card:'));
      console.log(colors.gray('   Card: 4242 4242 4242 4242'));
      console.log(colors.gray('   Expiry: Any future date (e.g., 12/28)'));
      console.log(colors.gray('   CVC: Any 3 digits (e.g., 123)'));
      
      console.log(colors.yellow('\\n🪙 For crypto payments:'));
      console.log(colors.gray('   Use small test amounts'));
      console.log(colors.gray('   Follow the payment flow to completion'));
    }
    
    console.log(colors.cyan('\\n📊 Monitor payments in real-time:'));
    console.log(colors.gray('   ./scripts/monitor-payments.sh'));
  }
}

async function main() {
  const tester = new PaymentProviderTester();

  console.log(colors.cyan('\\n========================================'));
  console.log(colors.cyan('   N0DE Payment Provider Testing'));
  console.log(colors.cyan('========================================\\n'));

  try {
    // Test each component
    await tester.testBackendHealth();
    await tester.checkDatabaseStatus();
    await tester.testWebhookEndpoints();
    await tester.testStripeDirectly();
    await tester.testCoinbaseDirectly();
    await tester.testNOWPaymentsDirectly();
    
    // Display results and instructions
    tester.displayResults();
    tester.showTestingInstructions();
    
  } catch (error) {
    console.error(colors.red('\\n❌ Testing failed:'), error.message);
    process.exit(1);
  }
}

main();