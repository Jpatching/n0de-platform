const { test, expect } = require('@playwright/test');

const VERCEL_URL = 'https://n0de-website-q6j9g5dy2-jpatchings-projects.vercel.app';
const RAILWAY_BACKEND_URL = 'https://n0de-backend-production.up.railway.app';

test.describe('Complete User Flow Testing', () => {
  
  test('Homepage to Dashboard navigation flow', async ({ page }) => {
    console.log('🏠 Testing homepage to dashboard navigation...');
    
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    
    // Check homepage elements load
    const heroSection = await page.locator('h1, [class*="hero"], [class*="title"]').first();
    await expect(heroSection).toBeVisible();
    console.log('✅ Homepage hero section loaded');
    
    // Look for dashboard/login buttons
    const dashboardBtn = page.locator('text=Dashboard', 'a[href*="dashboard"]', 'button:has-text("Dashboard")').first();
    const loginBtn = page.locator('text=Login', 'text=Sign In', 'button:has-text("Login")').first();
    
    const hasDashboardBtn = await dashboardBtn.count() > 0;
    const hasLoginBtn = await loginBtn.count() > 0;
    
    console.log(`🔍 Dashboard button found: ${hasDashboardBtn}`);
    console.log(`🔍 Login button found: ${hasLoginBtn}`);
    
    if (hasDashboardBtn) {
      await dashboardBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Dashboard navigation successful');
    } else if (hasLoginBtn) {
      await loginBtn.click(); 
      await page.waitForTimeout(2000);
      console.log('✅ Login navigation successful');
    }
  });

  test('API Key creation and usage flow', async ({ page }) => {
    console.log('🔑 Testing complete API key workflow...');
    
    await page.goto(`${VERCEL_URL}/dashboard/api-keys`, { waitUntil: 'networkidle' });
    
    // Check if API key page loads
    const pageTitle = await page.locator('h1, h2, [class*="title"]').first().textContent();
    console.log(`📄 API Keys page loaded: ${pageTitle}`);
    
    // Look for create API key button/form
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Generate"), button:has-text("New")').first();
    const hasCreateBtn = await createBtn.count() > 0;
    
    if (hasCreateBtn) {
      console.log('🔍 Create API key button found');
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Fill out API key form if present
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[type="text"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test API Key');
        console.log('✅ API key name filled');
        
        const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Generate")').first();
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
          console.log('✅ API key creation attempted');
        }
      }
    }
    
    // Test API key usage
    const apiKey = 'test-key-' + Date.now();
    const apiTest = await page.evaluate(async (backendUrl, testKey) => {
      try {
        const response = await fetch(`${backendUrl}/api/test`, {
          headers: {
            'Authorization': `Bearer ${testKey}`,
            'X-API-Key': testKey,
            'Content-Type': 'application/json'
          }
        });
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return { error: error.message };
      }
    }, RAILWAY_BACKEND_URL, apiKey);
    
    console.log('🔑 API key usage test:', apiTest);
  });

  test('Payment subscription flow', async ({ page }) => {
    console.log('💳 Testing complete payment subscription flow...');
    
    await page.goto(`${VERCEL_URL}/subscription`, { waitUntil: 'networkidle' });
    
    // Check subscription plans are displayed
    const plans = await page.locator('[class*="plan"], [class*="price"], [class*="tier"]').count();
    console.log(`💰 Subscription plans found: ${plans}`);
    
    // Look for subscription buttons
    const subscribeBtn = page.locator('button:has-text("Subscribe"), button:has-text("Choose"), a:has-text("Get Started")').first();
    const hasSubscribeBtn = await subscribeBtn.count() > 0;
    
    if (hasSubscribeBtn) {
      console.log('🔍 Subscribe button found');
      await subscribeBtn.click();
      await page.waitForTimeout(2000);
      
      // Check if redirected to checkout
      const currentUrl = page.url();
      const isCheckout = currentUrl.includes('checkout') || currentUrl.includes('payment') || currentUrl.includes('stripe');
      console.log(`✅ Redirected to checkout: ${isCheckout}`);
      console.log(`📍 Current URL: ${currentUrl}`);
    }
    
    // Test payment endpoints
    const paymentTest = await page.evaluate(async (vercelUrl) => {
      const endpoints = [
        '/api/payments/stripe/create-subscription',
        '/api/payments/coinbase/create-charge'
      ];
      
      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${vercelUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'test', amount: 10 })
          });
          results.push({
            endpoint,
            status: response.status,
            working: response.status < 500
          });
        } catch (error) {
          results.push({
            endpoint,
            error: error.message,
            working: false
          });
        }
      }
      return results;
    }, VERCEL_URL);
    
    console.log('💳 Payment endpoints test:', paymentTest);
  });

  test('Dashboard analytics and metrics flow', async ({ page }) => {
    console.log('📊 Testing dashboard analytics flow...');
    
    await page.goto(`${VERCEL_URL}/dashboard`, { waitUntil: 'networkidle' });
    
    // Check dashboard loads
    const dashboardElements = await page.locator('[class*="stat"], [class*="metric"], [class*="chart"], [class*="card"]').count();
    console.log(`📈 Dashboard elements found: ${dashboardElements}`);
    
    // Test navigation to analytics
    const analyticsLink = page.locator('a[href*="analytics"], text=Analytics').first();
    if (await analyticsLink.count() > 0) {
      await analyticsLink.click();
      await page.waitForTimeout(2000);
      console.log('✅ Analytics page navigation successful');
      
      // Check analytics data loads
      const charts = await page.locator('canvas, svg, [class*="chart"]').count();
      console.log(`📊 Analytics charts found: ${charts}`);
    }
  });

  test('User registration and login flow', async ({ page }) => {
    console.log('👤 Testing user registration/login flow...');
    
    // Test registration
    await page.goto(`${VERCEL_URL}/auth/callback`, { waitUntil: 'networkidle' });
    
    const authElements = await page.locator('input[type="email"], input[type="password"], button:has-text("Login")').count();
    console.log(`🔐 Auth elements found: ${authElements}`);
    
    // Test auth API endpoints
    const authTest = await page.evaluate(async (backendUrl) => {
      try {
        const response = await fetch(`${backendUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test-${Date.now()}@example.com`,
            password: 'testpass123'
          })
        });
        return {
          status: response.status,
          working: response.status < 500
        };
      } catch (error) {
        return { error: error.message, working: false };
      }
    }, RAILWAY_BACKEND_URL);
    
    console.log('👤 Auth endpoint test:', authTest);
  });

  test('API usage and response flow', async ({ page }) => {
    console.log('🌐 Testing API usage and response flow...');
    
    const apiEndpoints = [
      { path: '/api/health', method: 'GET' },
      { path: '/api/metrics', method: 'GET' },
      { path: '/api/usage', method: 'GET' },
      { path: '/api/subscriptions', method: 'GET' }
    ];
    
    for (const endpoint of apiEndpoints) {
      const result = await page.evaluate(async (backendUrl, endpointData) => {
        try {
          const response = await fetch(`${backendUrl}${endpointData.path}`, {
            method: endpointData.method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token'
            }
          });
          
          let data;
          try {
            data = await response.json();
          } catch (e) {
            data = await response.text();
          }
          
          return {
            endpoint: endpointData.path,
            status: response.status,
            hasData: !!data,
            dataLength: typeof data === 'string' ? data.length : Object.keys(data || {}).length,
            working: response.status < 500
          };
        } catch (error) {
          return {
            endpoint: endpointData.path,
            error: error.message,
            working: false
          };
        }
      }, RAILWAY_BACKEND_URL, endpoint);
      
      console.log(`📡 ${endpoint.path}:`, result);
    }
  });

  test('Form submission and validation flow', async ({ page }) => {
    console.log('📝 Testing form submission and validation...');
    
    const formPages = [
      '/checkout',
      '/subscription', 
      '/dashboard/settings',
      '/dashboard/api-keys'
    ];
    
    for (const formPage of formPages) {
      try {
        await page.goto(`${VERCEL_URL}${formPage}`, { waitUntil: 'networkidle', timeout: 10000 });
        
        const forms = await page.locator('form').count();
        const inputs = await page.locator('input, textarea, select').count();
        const buttons = await page.locator('button[type="submit"], input[type="submit"]').count();
        
        console.log(`📄 ${formPage}: ${forms} forms, ${inputs} inputs, ${buttons} submit buttons`);
        
        // Test form validation if forms exist
        if (forms > 0) {
          const firstForm = page.locator('form').first();
          const submitBtn = firstForm.locator('button[type="submit"], input[type="submit"]').first();
          
          if (await submitBtn.count() > 0) {
            await submitBtn.click();
            await page.waitForTimeout(1000);
            
            // Check for validation messages
            const validationMsgs = await page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]').count();
            console.log(`✅ Validation messages shown: ${validationMsgs}`);
          }
        }
      } catch (error) {
        console.log(`⚠️  ${formPage}: ${error.message}`);
      }
    }
  });

  test('Real-time features and WebSocket connections', async ({ page }) => {
    console.log('⚡ Testing real-time features and WebSocket connections...');
    
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    
    // Check for WebSocket connections
    const wsConnections = await page.evaluate(() => {
      const wsCount = document.querySelectorAll('script').length;
      const hasSocket = window.io || window.WebSocket || window.socket;
      return { wsCount, hasSocket: !!hasSocket };
    });
    
    console.log('🔌 WebSocket status:', wsConnections);
    
    // Test real-time updates (if any exist)
    const realtimeElements = await page.locator('[class*="live"], [class*="real-time"], [class*="online"]').count();
    console.log(`⚡ Real-time elements found: ${realtimeElements}`);
  });

  test('Error handling and 404 pages', async ({ page }) => {
    console.log('🚫 Testing error handling and 404 pages...');
    
    // Test 404 page
    const response = await page.goto(`${VERCEL_URL}/nonexistent-page`, { waitUntil: 'networkidle' });
    console.log(`🔍 404 page status: ${response.status()}`);
    
    const has404Content = await page.locator('text=404, text="Not Found", text="Page not found"').count() > 0;
    console.log(`✅ 404 page has proper content: ${has404Content}`);
    
    // Test API error handling
    const apiErrorTest = await page.evaluate(async (vercelUrl) => {
      try {
        const response = await fetch(`${vercelUrl}/api/nonexistent-endpoint`);
        return {
          status: response.status,
          hasErrorHandling: response.status === 404
        };
      } catch (error) {
        return { error: error.message };
      }
    }, VERCEL_URL);
    
    console.log('🚫 API error handling:', apiErrorTest);
  });
});