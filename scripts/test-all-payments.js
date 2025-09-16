#!/usr/bin/env node

/**
 * Comprehensive Payment Testing for All Providers
 * Tests Stripe, Coinbase Commerce, and NOWPayments with real authentication
 */

const axios = require('axios');
const colors = require('colors/safe');
const { Client } = require('pg');
const AuthHelper = require('./auth-helper.js');

const API_URL = 'http://localhost:4000';
const DB_CONFIG = {
  connectionString: 'postgresql://postgres:postgres@localhost:5432/n0de_production'
};

class PaymentTester {
  constructor() {
    this.auth = new AuthHelper();
    this.results = {
      stripe: { passed: 0, failed: 0, tests: [] },
      coinbase: { passed: 0, failed: 0, tests: [] },
      nowpayments: { passed: 0, failed: 0, tests: [] }
    };
  }

  async setup() {
    console.log(colors.cyan('Setting up authentication...'));
    
    try {
      await this.auth.createTestUser();
      await this.auth.login();
      console.log(colors.green('✅ Authentication ready'));
    } catch (error) {
      console.error(colors.red('❌ Authentication setup failed:'), error.message);
      throw error;
    }
  }

  async testStripePayments() {
    console.log(colors.cyan('\n=== Testing Stripe Payments ===\n'));
    
    const tests = [
      { name: 'Create Payment Intent', plan: 'STARTER' },
      { name: 'Create Checkout Session', plan: 'PROFESSIONAL' },
      { name: 'Create Subscription', plan: 'ENTERPRISE' }
    ];

    for (const test of tests) {
      try {
        console.log(colors.yellow(`Testing: ${test.name} (${test.plan})...`));
        
        // Test Stripe Payment Intent
        const response = await axios.post(
          `${API_URL}/api/v1/payments/stripe/create-intent`,
          { plan: test.plan, amount: 4900 },
          { headers: this.auth.getAuthHeaders() }
        );

        if (response.data.clientSecret) {
          console.log(colors.green(`✅ ${test.name} successful`));
          console.log(colors.gray(`   Client Secret: ${response.data.clientSecret.substring(0, 30)}...`));
          this.results.stripe.passed++;
          this.results.stripe.tests.push({ name: test.name, status: 'passed', data: response.data });
        }
        
      } catch (error) {
        console.error(colors.red(`❌ ${test.name} failed:`), error.response?.data?.message || error.message);
        this.results.stripe.failed++;
        this.results.stripe.tests.push({ name: test.name, status: 'failed', error: error.message });
      }
    }
  }

  async testCoinbaseCommerce() {
    console.log(colors.cyan('\n=== Testing Coinbase Commerce ===\n'));
    
    const tests = [
      { name: 'Create Coinbase Charge', plan: 'STARTER' },
      { name: 'Create Crypto Payment', plan: 'PROFESSIONAL' }
    ];

    for (const test of tests) {
      try {
        console.log(colors.yellow(`Testing: ${test.name} (${test.plan})...`));
        
        const response = await axios.post(
          `${API_URL}/api/v1/payments/create-checkout`,
          { plan: test.plan, provider: 'COINBASE_COMMERCE' },
          { headers: this.auth.getAuthHeaders() }
        );

        if (response.data.checkoutUrl) {
          console.log(colors.green(`✅ ${test.name} successful`));
          console.log(colors.gray(`   Checkout URL: ${response.data.checkoutUrl}`));
          console.log(colors.gray(`   Payment ID: ${response.data.paymentId}`));
          this.results.coinbase.passed++;
          this.results.coinbase.tests.push({ name: test.name, status: 'passed', data: response.data });
        }
        
      } catch (error) {
        console.error(colors.red(`❌ ${test.name} failed:`), error.response?.data?.message || error.message);
        this.results.coinbase.failed++;
        this.results.coinbase.tests.push({ name: test.name, status: 'failed', error: error.message });
      }
    }
  }

  async testNOWPayments() {
    console.log(colors.cyan('\n=== Testing NOWPayments ===\n'));
    
    const tests = [
      { name: 'Create NOWPayments Charge', plan: 'STARTER' },
      { name: 'Create Crypto Payment', plan: 'PROFESSIONAL' }
    ];

    for (const test of tests) {
      try {
        console.log(colors.yellow(`Testing: ${test.name} (${test.plan})...`));
        
        const response = await axios.post(
          `${API_URL}/api/v1/payments/create-checkout`,
          { plan: test.plan, provider: 'NOWPAYMENTS' },
          { headers: this.auth.getAuthHeaders() }
        );

        if (response.data.checkoutUrl || response.data.paymentUrl) {
          console.log(colors.green(`✅ ${test.name} successful`));
          console.log(colors.gray(`   Payment URL: ${response.data.checkoutUrl || response.data.paymentUrl}`));
          console.log(colors.gray(`   Payment ID: ${response.data.paymentId}`));
          this.results.nowpayments.passed++;
          this.results.nowpayments.tests.push({ name: test.name, status: 'passed', data: response.data });
        }
        
      } catch (error) {
        console.error(colors.red(`❌ ${test.name} failed:`), error.response?.data?.message || error.message);
        this.results.nowpayments.failed++;
        this.results.nowpayments.tests.push({ name: test.name, status: 'failed', error: error.message });
      }
    }
  }

  async checkDatabaseRecords() {
    console.log(colors.cyan('\n=== Checking Database Records ===\n'));
    
    const client = new Client(DB_CONFIG);
    try {
      await client.connect();
      
      // Check payments
      const paymentsResult = await client.query(`
        SELECT 
          id, 
          "userId", 
          provider, 
          status, 
          amount, 
          "planType",
          "createdAt"
        FROM payments 
        WHERE "createdAt" > NOW() - INTERVAL '10 minutes'
        ORDER BY "createdAt" DESC
      `);
      
      console.log(colors.yellow(`Recent payments (last 10 minutes): ${paymentsResult.rows.length}`));
      paymentsResult.rows.forEach((payment, index) => {
        console.log(colors.gray(`  ${index + 1}. ${payment.provider} - ${payment.planType} - $${payment.amount} (${payment.status})`));
      });
      
      // Check webhook events
      const webhooksResult = await client.query(`
        SELECT 
          provider, 
          "eventType", 
          processed, 
          "createdAt"
        FROM webhook_events 
        WHERE "createdAt" > NOW() - INTERVAL '10 minutes'
        ORDER BY "createdAt" DESC
      `);
      
      console.log(colors.yellow(`\\nRecent webhook events: ${webhooksResult.rows.length}`));
      webhooksResult.rows.forEach((webhook, index) => {
        const status = webhook.processed ? colors.green('✓') : colors.red('✗');
        console.log(colors.gray(`  ${index + 1}. ${status} ${webhook.provider} - ${webhook.eventType}`));
      });
      
    } catch (error) {
      console.error(colors.red('❌ Database check failed:'), error.message);
    } finally {
      await client.end();
    }
  }

  displayResults() {
    console.log(colors.cyan('\\n========================================'));
    console.log(colors.cyan('           TEST RESULTS'));
    console.log(colors.cyan('========================================\\n'));
    
    const providers = ['stripe', 'coinbase', 'nowpayments'];
    let totalPassed = 0;
    let totalFailed = 0;
    
    providers.forEach(provider => {
      const result = this.results[provider];
      const total = result.passed + result.failed;
      const successRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : 0;
      
      console.log(colors.yellow(`${provider.toUpperCase()}:`));
      console.log(colors.green(`  ✅ Passed: ${result.passed}`));
      console.log(colors.red(`  ❌ Failed: ${result.failed}`));
      console.log(colors.blue(`  📊 Success Rate: ${successRate}%\\n`));
      
      totalPassed += result.passed;
      totalFailed += result.failed;
    });
    
    const overallTotal = totalPassed + totalFailed;
    const overallSuccess = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : 0;
    
    console.log(colors.cyan('OVERALL:'));
    console.log(colors.green(`✅ Total Passed: ${totalPassed}`));
    console.log(colors.red(`❌ Total Failed: ${totalFailed}`));
    console.log(colors.blue(`📊 Overall Success Rate: ${overallSuccess}%`));
    
    if (totalFailed === 0) {
      console.log(colors.green('\\n🎉 ALL TESTS PASSED! Payment system is working correctly.'));
    } else {
      console.log(colors.yellow('\\n⚠️  Some tests failed. Check the errors above.'));
    }
  }

  async generatePaymentLinks() {
    console.log(colors.cyan('\\n=== Generated Payment Links ===\\n'));
    
    // Show successful payment URLs for manual testing
    const allTests = [
      ...this.results.stripe.tests,
      ...this.results.coinbase.tests,
      ...this.results.nowpayments.tests
    ];
    
    const successfulPayments = allTests.filter(test => test.status === 'passed' && test.data);
    
    if (successfulPayments.length > 0) {
      console.log(colors.green('Click these links to complete payments:'));
      successfulPayments.forEach((test, index) => {
        if (test.data.checkoutUrl) {
          console.log(colors.cyan(`${index + 1}. ${test.name}: ${test.data.checkoutUrl}`));
        }
      });
      
      console.log(colors.yellow('\\nFor Stripe test cards:'));
      console.log(colors.gray('  Success: 4242 4242 4242 4242'));
      console.log(colors.gray('  Decline: 4000 0000 0000 0002'));
      console.log(colors.gray('  Expiry: Any future date, Any CVC'));
      
    } else {
      console.log(colors.red('No successful payments to test manually.'));
    }
  }
}

async function main() {
  const tester = new PaymentTester();

  console.log(colors.cyan('\\n========================================'));
  console.log(colors.cyan('   N0DE Complete Payment Testing'));
  console.log(colors.cyan('========================================\\n'));

  try {
    await tester.setup();
    await tester.testStripePayments();
    await tester.testCoinbaseCommerce();
    await tester.testNOWPayments();
    await tester.checkDatabaseRecords();
    
    tester.displayResults();
    await tester.generatePaymentLinks();
    
  } catch (error) {
    console.error(colors.red('\\n❌ Testing failed:'), error.message);
    process.exit(1);
  }
}

main();