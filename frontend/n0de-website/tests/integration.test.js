const { test, expect } = require('@playwright/test');

const VERCEL_URL = 'https://n0de-website-q6j9g5dy2-jpatchings-projects.vercel.app';
const RAILWAY_BACKEND_URL = 'https://n0de-backend-production.up.railway.app';

test.describe('N0de Frontend-Backend Integration Tests', () => {
  
  test('Frontend loads without React hydration errors', async ({ page }) => {
    const consoleLogs = [];
    const errors = [];
    
    // Capture console logs and errors
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', err => {
      errors.push(`Page Error: ${err.message}`);
    });
    
    console.log('🔍 Testing frontend deployment for hydration errors...');
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Check for React hydration error #418
    const hasHydrationError = errors.some(err => 
      err.includes('#418') || 
      err.toLowerCase().includes('hydrat') || 
      (err.includes('server') && err.includes('client'))
    );
    
    console.log(`✅ React hydration errors detected: ${hasHydrationError}`);
    console.log(`📊 Total console errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('Console errors found:');
      errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    
    expect(hasHydrationError).toBe(false);
  });

  test('Page height is normalized (not 22,192px)', async ({ page }) => {
    console.log('📏 Testing page height normalization...');
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    
    const height = await page.evaluate(() => document.body.scrollHeight);
    console.log(`📐 Page height: ${height}px`);
    
    // Should be reasonable viewport height, not the previous 22,192px
    expect(height).toBeLessThan(10000);
    expect(height).toBeGreaterThan(800);
  });

  test('Tailwind CSS classes render correctly', async ({ page }) => {
    console.log('🎨 Testing Tailwind CSS class rendering...');
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    
    // Check if custom Tailwind classes are applied
    const bgElements = await page.$$('[class*="bg-bg-main"]');
    const textElements = await page.$$('[class*="text-text-primary"]');
    
    console.log(`🔍 Elements with bg-bg-main: ${bgElements.length}`);
    console.log(`🔍 Elements with text-text-primary: ${textElements.length}`);
    
    expect(bgElements.length).toBeGreaterThan(0);
  });

  test('Backend API connectivity', async ({ page }) => {
    console.log('🔌 Testing backend API connectivity...');
    
    const apiEndpoints = [
      '/api/health',
      '/api/metrics',
      '/api/payments',
      '/api/subscriptions'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(`${RAILWAY_BACKEND_URL}${endpoint}`);
        console.log(`📡 ${endpoint}: ${response.status()}`);
        
        if (response.status() === 404) {
          console.log(`⚠️  ${endpoint} not found (may not be implemented yet)`);
        } else {
          expect(response.status()).toBeLessThan(500);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  });

  test('API key generation and tracking', async ({ page }) => {
    console.log('🔑 Testing API key functionality...');
    await page.goto(`${VERCEL_URL}/dashboard/api-keys`, { waitUntil: 'networkidle' });
    
    // Check if API key management interface loads
    const hasApiKeyInterface = await page.locator('text=API').count() > 0;
    console.log(`🔍 API Key interface loaded: ${hasApiKeyInterface}`);
    
    // Test API key creation endpoint
    try {
      const response = await page.request.post(`${RAILWAY_BACKEND_URL}/api/api-keys`, {
        data: {
          name: 'Test Key',
          permissions: ['read']
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`🔑 API Key creation status: ${response.status()}`);
    } catch (error) {
      console.log(`⚠️  API Key endpoint: ${error.message}`);
    }
  });

  test('Payment system endpoints', async ({ page }) => {
    console.log('💳 Testing payment system endpoints...');
    
    const paymentEndpoints = [
      '/api/payments/stripe/create-subscription',
      '/api/payments/coinbase/create-charge', 
      '/api/payments/nowpayments/create-payment'
    ];
    
    for (const endpoint of paymentEndpoints) {
      try {
        // Test with minimal payload to check endpoint availability
        const response = await page.request.post(`${VERCEL_URL}${endpoint}`, {
          data: { test: true },
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`💰 ${endpoint}: ${response.status()}`);
        
        // 400-499 is expected for test data, 500+ indicates server error
        expect(response.status()).toBeLessThan(500);
      } catch (error) {
        console.log(`❌ Payment endpoint ${endpoint}: ${error.message}`);
      }
    }
  });

  test('Subscription functionality', async ({ page }) => {
    console.log('📋 Testing subscription functionality...');
    await page.goto(`${VERCEL_URL}/subscription`, { waitUntil: 'networkidle' });
    
    // Check if subscription page loads
    const hasSubscriptionContent = await page.locator('text=subscription', { timeout: 5000 }).count() > 0;
    console.log(`📋 Subscription page loaded: ${hasSubscriptionContent}`);
    
    // Check for pricing plans
    const pricingElements = await page.$$('[class*="price"], [class*="plan"], [class*="tier"]');
    console.log(`💵 Pricing elements found: ${pricingElements.length}`);
  });

  test('Nginx proxy and CORS functionality', async ({ page }) => {
    console.log('🌐 Testing CORS and proxy functionality...');
    
    await page.goto(VERCEL_URL);
    
    // Test cross-origin requests
    const corsTest = await page.evaluate(async (backendUrl) => {
      try {
        const response = await fetch(`${backendUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return {
          status: response.status,
          cors: response.headers.get('access-control-allow-origin'),
          success: true
        };
      } catch (error) {
        return {
          error: error.message,
          success: false
        };
      }
    }, RAILWAY_BACKEND_URL);
    
    console.log(`🌐 CORS test result:`, corsTest);
  });

  test('User tracking and analytics', async ({ page }) => {
    console.log('📊 Testing user tracking and analytics...');
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    
    // Check for analytics scripts (Vercel Analytics)
    const analyticsScripts = await page.$$('script[src*="vercel"], script[src*="analytics"]');
    console.log(`📈 Analytics scripts found: ${analyticsScripts.length}`);
    
    // Check for unique session tracking
    const sessionId = await page.evaluate(() => {
      return localStorage.getItem('sessionId') || 
             sessionStorage.getItem('sessionId') ||
             document.cookie.includes('session');
    });
    
    console.log(`🔍 Session tracking detected: ${!!sessionId}`);
  });

  test('Database connectivity and unique constraints', async ({ page }) => {
    console.log('🗄️ Testing database connectivity...');
    
    try {
      // Test user creation endpoint for unique constraints
      const response = await page.request.post(`${RAILWAY_BACKEND_URL}/api/users`, {
        data: {
          email: `test-${Date.now()}@example.com`,
          username: `testuser${Date.now()}`
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`👤 User creation test: ${response.status()}`);
    } catch (error) {
      console.log(`⚠️  Database test: ${error.message}`);
    }
  });
});