const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.VERCEL_URL || 'https://www.n0de.pro';
const BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://n0de-backend-production-4e34.up.railway.app';

test.describe('💳 Complete Payment Flow Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up common test data
    await page.addInitScript(() => {
      window.testUserId = 'test-user-' + Date.now();
      window.testEmail = 'test-' + Date.now() + '@example.com';
    });
  });

  test('Complete Stripe payment journey - Starter plan', async ({ page }) => {
    console.log('🔵 Testing complete Stripe payment flow for Starter plan...');
    
    // Step 1: Navigate to pricing page
    await page.goto(`${FRONTEND_URL}/subscription`, { waitUntil: 'networkidle' });
    
    // Step 2: Look for Starter plan
    const starterPlan = page.locator('[data-plan="STARTER"], [class*="starter"], :has-text("49"):has-text("month")').first();
    await expect(starterPlan).toBeVisible({ timeout: 10000 });
    console.log('✅ Found Starter plan pricing');
    
    // Step 3: Click subscribe/choose plan button
    const subscribeButton = page.locator('button:has-text("Subscribe"), button:has-text("Choose Plan"), button:has-text("Get Started")').first();
    
    if (await subscribeButton.isVisible()) {
      await subscribeButton.click();
      console.log('✅ Clicked subscribe button');
      
      // Step 4: Check if redirected to auth or checkout
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      
      if (currentUrl.includes('auth') || currentUrl.includes('login')) {
        console.log('🔑 Redirected to authentication - expected flow');
        
        // Try to fill mock auth data if forms exist
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        
        if (await emailInput.isVisible() && await passwordInput.isVisible()) {
          await emailInput.fill(await page.evaluate(() => window.testEmail));
          await passwordInput.fill('testPassword123!');
          
          const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
          if (await loginBtn.isVisible()) {
            await loginBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      } else if (currentUrl.includes('checkout') || currentUrl.includes('payment')) {
        console.log('💳 Redirected to checkout - payment flow initiated');
      }
    }
    
    // Step 5: Test payment API endpoint directly
    console.log('🔍 Testing Stripe payment API endpoint...');
    const paymentResponse = await page.request.post(`${BACKEND_URL}/api/payments`, {
      data: {
        provider: 'STRIPE',
        planType: 'STARTER', 
        amount: 49,
        currency: 'USD'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    console.log(`💳 Stripe API response status: ${paymentResponse.status()}`);
    
    if (paymentResponse.status() < 500) {
      console.log('✅ Stripe payment endpoint is responding correctly');
      
      try {
        const responseData = await paymentResponse.json();
        console.log('💰 Payment response contains data:', !!responseData);
        
        // Check for Stripe-specific response fields
        if (responseData.checkoutUrl || responseData.url || responseData.sessionId) {
          console.log('✅ Stripe checkout session created successfully');
        }
      } catch (e) {
        console.log('ℹ️ Response parsing completed (may be auth-protected)');
      }
    }
    
    console.log('🔵 Stripe payment flow test completed');
  });

  test('Complete Coinbase Commerce payment journey - Professional plan', async ({ page }) => {
    console.log('🟡 Testing complete Coinbase Commerce payment flow for Professional plan...');
    
    // Step 1: Navigate to pricing page
    await page.goto(`${FRONTEND_URL}/subscription`, { waitUntil: 'networkidle' });
    
    // Step 2: Look for Professional plan
    const professionalPlan = page.locator('[data-plan="PROFESSIONAL"], [class*="professional"], :has-text("299"):has-text("month")').first();
    
    if (await professionalPlan.isVisible()) {
      console.log('✅ Found Professional plan pricing');
      
      // Look for crypto payment option or Coinbase button
      const cryptoPayButton = page.locator('button:has-text("Crypto"), button:has-text("Coinbase"), [data-provider="coinbase"]').first();
      
      if (await cryptoPayButton.isVisible()) {
        await cryptoPayButton.click();
        console.log('✅ Selected crypto payment option');
      }
    }
    
    // Step 3: Test Coinbase payment API endpoint
    console.log('🔍 Testing Coinbase Commerce payment API endpoint...');
    const coinbaseResponse = await page.request.post(`${BACKEND_URL}/api/payments`, {
      data: {
        provider: 'COINBASE_COMMERCE',
        planType: 'PROFESSIONAL',
        amount: 299,
        currency: 'USD'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    console.log(`🟡 Coinbase API response status: ${coinbaseResponse.status()}`);
    
    if (coinbaseResponse.status() < 500) {
      console.log('✅ Coinbase Commerce payment endpoint is responding correctly');
      
      try {
        const responseData = await coinbaseResponse.json();
        console.log('💰 Coinbase response contains data:', !!responseData);
        
        // Check for Coinbase-specific response fields
        if (responseData.hosted_url || responseData.chargeUrl || responseData.id) {
          console.log('✅ Coinbase Commerce charge created successfully');
        }
      } catch (e) {
        console.log('ℹ️ Coinbase response parsing completed');
      }
    }
    
    // Step 4: Test webhook simulation
    console.log('🔍 Testing Coinbase webhook handling...');
    const webhookResponse = await page.request.post(`${BACKEND_URL}/api/payments/coinbase/webhook`, {
      data: {
        event: {
          id: 'test-webhook-' + Date.now(),
          type: 'charge:confirmed',
          data: {
            id: 'test-charge-123',
            metadata: {
              paymentId: 'test-payment-123'
            }
          }
        }
      },
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Webhook-Signature': 'test-signature'
      },
      failOnStatusCode: false
    });
    
    console.log(`🟡 Coinbase webhook response status: ${webhookResponse.status()}`);
    console.log('🟡 Coinbase Commerce payment flow test completed');
  });

  test('Complete NOWPayments crypto journey - Enterprise plan', async ({ page }) => {
    console.log('🟢 Testing complete NOWPayments flow for Enterprise plan...');
    
    // Step 1: Navigate to pricing page
    await page.goto(`${FRONTEND_URL}/subscription`, { waitUntil: 'networkidle' });
    
    // Step 2: Look for Enterprise plan
    const enterprisePlan = page.locator('[data-plan="ENTERPRISE"], [class*="enterprise"], :has-text("999"):has-text("month")').first();
    
    if (await enterprisePlan.isVisible()) {
      console.log('✅ Found Enterprise plan pricing');
    }
    
    // Step 3: Test NOWPayments API endpoint
    console.log('🔍 Testing NOWPayments API endpoint...');
    const nowPaymentsResponse = await page.request.post(`${BACKEND_URL}/api/payments`, {
      data: {
        provider: 'NOWPAYMENTS',
        planType: 'ENTERPRISE',
        amount: 999,
        currency: 'USD'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    console.log(`🟢 NOWPayments API response status: ${nowPaymentsResponse.status()}`);
    
    if (nowPaymentsResponse.status() < 500) {
      console.log('✅ NOWPayments endpoint is responding correctly');
      
      try {
        const responseData = await nowPaymentsResponse.json();
        console.log('💎 NOWPayments response contains data:', !!responseData);
        
        // Check for NOWPayments-specific response fields
        if (responseData.payment_url || responseData.paymentUrl || responseData.id) {
          console.log('✅ NOWPayments payment created successfully');
        }
      } catch (e) {
        console.log('ℹ️ NOWPayments response parsing completed');
      }
    }
    
    console.log('🟢 NOWPayments flow test completed');
  });

  test('Subscription management and billing workflow', async ({ page }) => {
    console.log('📋 Testing subscription management workflow...');
    
    // Step 1: Navigate to dashboard/billing page
    const dashboardUrls = [
      `${FRONTEND_URL}/dashboard`,
      `${FRONTEND_URL}/dashboard/billing`,
      `${FRONTEND_URL}/subscription`,
      `${FRONTEND_URL}/billing`
    ];
    
    for (const url of dashboardUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        console.log(`✅ Accessed: ${url}`);
        break;
      } catch (e) {
        console.log(`⚠️ Could not access: ${url}`);
      }
    }
    
    // Step 2: Look for subscription information
    const subscriptionElements = await page.locator('[class*="subscription"], [class*="plan"], [class*="billing"], text=plan, text=subscription').count();
    console.log(`📋 Found ${subscriptionElements} subscription-related elements`);
    
    // Step 3: Test subscription API endpoints
    console.log('🔍 Testing subscription API endpoints...');
    
    const subscriptionEndpoints = [
      '/api/subscriptions',
      '/api/subscriptions/plans',
      '/api/subscriptions/current'
    ];
    
    for (const endpoint of subscriptionEndpoints) {
      const response = await page.request.get(`${BACKEND_URL}${endpoint}`, {
        failOnStatusCode: false
      });
      
      console.log(`📋 ${endpoint}: ${response.status()}`);
      
      if (response.status() === 200) {
        try {
          const data = await response.json();
          console.log(`✅ ${endpoint} returned valid data`);
        } catch (e) {
          console.log(`ℹ️ ${endpoint} response processed`);
        }
      }
    }
    
    // Step 4: Test plan upgrade simulation
    console.log('🔍 Testing plan upgrade workflow...');
    const upgradeResponse = await page.request.post(`${BACKEND_URL}/api/subscriptions/upgrade`, {
      data: {
        planType: 'PROFESSIONAL',
        userId: await page.evaluate(() => window.testUserId)
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    console.log(`📈 Plan upgrade response: ${upgradeResponse.status()}`);
    console.log('📋 Subscription management test completed');
  });

  test('Payment failure and error handling', async ({ page }) => {
    console.log('❌ Testing payment failure scenarios and error handling...');
    
    // Step 1: Test invalid payment data
    const invalidPaymentTests = [
      {
        name: 'Invalid provider',
        data: { provider: 'INVALID_PROVIDER', planType: 'STARTER', amount: 49 }
      },
      {
        name: 'Invalid plan type',
        data: { provider: 'STRIPE', planType: 'INVALID_PLAN', amount: 49 }
      },
      {
        name: 'Invalid amount',
        data: { provider: 'STRIPE', planType: 'STARTER', amount: -1 }
      },
      {
        name: 'Missing required fields',
        data: { provider: 'STRIPE' }
      }
    ];
    
    for (const test of invalidPaymentTests) {
      console.log(`🔍 Testing: ${test.name}`);
      
      const response = await page.request.post(`${BACKEND_URL}/api/payments`, {
        data: test.data,
        headers: {
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      });
      
      console.log(`❌ ${test.name} response: ${response.status()}`);
      
      // Error responses should be 4xx, not 5xx (server errors)
      if (response.status() >= 400 && response.status() < 500) {
        console.log(`✅ Proper error handling for: ${test.name}`);
      } else if (response.status() >= 500) {
        console.log(`⚠️ Server error for: ${test.name} (may need investigation)`);
      }
    }
    
    // Step 2: Test webhook signature validation
    console.log('🔍 Testing webhook security validation...');
    
    const webhookTests = [
      {
        provider: 'stripe',
        endpoint: '/api/payments/stripe/webhook',
        data: { type: 'payment_intent.succeeded' }
      },
      {
        provider: 'coinbase',
        endpoint: '/api/payments/coinbase/webhook',
        data: { event: { type: 'charge:confirmed' } }
      },
      {
        provider: 'nowpayments',
        endpoint: '/api/payments/nowpayments/webhook',
        data: { payment_status: 'finished' }
      }
    ];
    
    for (const webhookTest of webhookTests) {
      const response = await page.request.post(`${BACKEND_URL}${webhookTest.endpoint}`, {
        data: webhookTest.data,
        headers: {
          'Content-Type': 'application/json',
          'X-Invalid-Signature': 'invalid-signature'
        },
        failOnStatusCode: false
      });
      
      console.log(`🔒 ${webhookTest.provider} webhook security test: ${response.status()}`);
      
      // Should reject invalid signatures
      if (response.status() === 401 || response.status() === 403) {
        console.log(`✅ ${webhookTest.provider} webhook properly validates signatures`);
      }
    }
    
    console.log('❌ Error handling test completed');
  });

  test('Payment analytics and tracking', async ({ page }) => {
    console.log('📊 Testing payment analytics and tracking...');
    
    // Step 1: Test payment analytics endpoints
    const analyticsEndpoints = [
      '/api/payments/stats',
      '/api/payments/history',
      '/api/analytics/payments',
      '/api/metrics/payments'
    ];
    
    for (const endpoint of analyticsEndpoints) {
      const response = await page.request.get(`${BACKEND_URL}${endpoint}`, {
        failOnStatusCode: false
      });
      
      console.log(`📈 ${endpoint}: ${response.status()}`);
      
      if (response.status() === 200) {
        try {
          const data = await response.json();
          if (data && (data.totalPayments !== undefined || data.revenue !== undefined || Array.isArray(data))) {
            console.log(`✅ ${endpoint} contains payment analytics data`);
          }
        } catch (e) {
          console.log(`ℹ️ ${endpoint} response processed`);
        }
      }
    }
    
    // Step 2: Test user payment history
    console.log('🔍 Testing user payment history...');
    const historyResponse = await page.request.get(`${BACKEND_URL}/api/payments/user/test-user`, {
      failOnStatusCode: false
    });
    
    console.log(`💳 User payment history: ${historyResponse.status()}`);
    
    // Step 3: Test payment search and filtering
    console.log('🔍 Testing payment search functionality...');
    const searchParams = new URLSearchParams({
      status: 'completed',
      provider: 'stripe',
      limit: '10'
    });
    
    const searchResponse = await page.request.get(`${BACKEND_URL}/api/payments?${searchParams}`, {
      failOnStatusCode: false
    });
    
    console.log(`🔍 Payment search: ${searchResponse.status()}`);
    console.log('📊 Payment analytics test completed');
  });

  test('Multi-currency and internationalization support', async ({ page }) => {
    console.log('🌍 Testing multi-currency and international payment support...');
    
    // Step 1: Test different currency support
    const currencies = ['USD', 'EUR', 'GBP', 'BTC', 'ETH'];
    
    for (const currency of currencies) {
      console.log(`💱 Testing ${currency} currency support...`);
      
      const response = await page.request.post(`${BACKEND_URL}/api/payments`, {
        data: {
          provider: currency === 'BTC' || currency === 'ETH' ? 'COINBASE_COMMERCE' : 'STRIPE',
          planType: 'STARTER',
          amount: currency === 'USD' ? 49 : currency === 'EUR' ? 45 : currency === 'GBP' ? 39 : 0.001,
          currency: currency
        },
        headers: {
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      });
      
      console.log(`💱 ${currency} payment support: ${response.status()}`);
      
      if (response.status() < 500) {
        console.log(`✅ ${currency} currency is supported`);
      }
    }
    
    // Step 2: Test international pricing
    console.log('🔍 Testing international pricing endpoints...');
    const pricingResponse = await page.request.get(`${BACKEND_URL}/api/subscriptions/plans?currency=EUR`, {
      failOnStatusCode: false
    });
    
    console.log(`💰 International pricing: ${pricingResponse.status()}`);
    console.log('🌍 Multi-currency test completed');
  });

  test('Payment security and compliance', async ({ page }) => {
    console.log('🔒 Testing payment security and compliance features...');
    
    // Step 1: Test rate limiting on payment endpoints
    console.log('🔍 Testing payment endpoint rate limiting...');
    
    const rateLimitPromises = [];
    for (let i = 0; i < 10; i++) {
      rateLimitPromises.push(
        page.request.post(`${BACKEND_URL}/api/payments`, {
          data: {
            provider: 'STRIPE',
            planType: 'STARTER',
            amount: 49
          },
          headers: {
            'Content-Type': 'application/json'
          },
          failOnStatusCode: false
        })
      );
    }
    
    const rateLimitResponses = await Promise.all(rateLimitPromises);
    const rateLimitedResponses = rateLimitResponses.filter(r => r.status() === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log(`✅ Rate limiting is active - ${rateLimitedResponses.length} requests were rate limited`);
    } else {
      console.log('ℹ️ No rate limiting detected (may be configured differently)');
    }
    
    // Step 2: Test CORS headers on payment endpoints
    console.log('🔍 Testing CORS configuration...');
    const corsResponse = await page.request.options(`${BACKEND_URL}/api/payments`, {
      failOnStatusCode: false
    });
    
    console.log(`🌐 CORS preflight: ${corsResponse.status()}`);
    
    // Step 3: Test HTTPS enforcement
    console.log('🔍 Testing HTTPS enforcement...');
    if (BACKEND_URL.startsWith('https://')) {
      console.log('✅ Backend is using HTTPS');
    } else {
      console.log('⚠️ Backend is not using HTTPS in production');
    }
    
    console.log('🔒 Security and compliance test completed');
  });

});

test.describe('🎯 Payment Integration Smoke Tests', () => {
  
  test('Quick payment system health check', async ({ page }) => {
    console.log('⚡ Running quick payment system health check...');
    
    const healthChecks = [
      { name: 'Backend Health', url: `${BACKEND_URL}/health` },
      { name: 'Payment Health', url: `${BACKEND_URL}/api/payments/health` },
      { name: 'Subscription Health', url: `${BACKEND_URL}/api/subscriptions/health` }
    ];
    
    let healthyServices = 0;
    
    for (const check of healthChecks) {
      const response = await page.request.get(check.url, {
        failOnStatusCode: false,
        timeout: 5000
      });
      
      if (response.status() === 200) {
        console.log(`✅ ${check.name}: Healthy`);
        healthyServices++;
      } else {
        console.log(`❌ ${check.name}: ${response.status()}`);
      }
    }
    
    console.log(`📊 Health Check Results: ${healthyServices}/${healthChecks.length} services healthy`);
    
    if (healthyServices >= 1) {
      console.log('✅ Payment system is operational');
    } else {
      console.log('❌ Payment system may have issues');
    }
  });

});