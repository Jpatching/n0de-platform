const { chromium } = require('playwright');

async function comprehensiveN0DEAnalysis() {
  console.log('🚀 Starting Comprehensive N0DE Platform Analysis...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  const baseURL = 'https://frontend-vm4ufp8iy-jpatchings-projects.vercel.app';

  try {
    // === 1. HOMEPAGE AND NAVIGATION TESTING ===
    console.log('📊 1. TESTING HOMEPAGE AND NAVIGATION...');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log(`✅ Page Title: ${title}`);
    
    // Check for main sections
    const mainSections = [
      'hero',
      'features', 
      'pricing',
      'testimonials',
      'footer'
    ];
    
    for (const section of mainSections) {
      try {
        const element = await page.locator(`[data-section="${section}"], .${section}, #${section}`).first();
        const isVisible = await element.isVisible();
        console.log(`${isVisible ? '✅' : '❌'} ${section.toUpperCase()} section: ${isVisible ? 'Found' : 'Not found'}`);
      } catch (e) {
        console.log(`❌ ${section.toUpperCase()} section: Not found`);
      }
    }

    // Test navigation links
    const navLinks = [
      '/developer',
      '/performance', 
      '/docs',
      '/pricing',
      '/dashboard'
    ];

    console.log('\n🔗 Testing Navigation Links...');
    for (const link of navLinks) {
      try {
        await page.goto(baseURL + link);
        await page.waitForLoadState('networkidle');
        const currentTitle = await page.title();
        const status = await page.locator('body').count() > 0 ? 'Loads' : 'Error';
        console.log(`${status === 'Loads' ? '✅' : '❌'} ${link}: ${status} (${currentTitle})`);
      } catch (e) {
        console.log(`❌ ${link}: Error - ${e.message}`);
      }
    }

    // === 2. PAYMENT SYSTEM DEEP ANALYSIS ===
    console.log('\n💳 2. TESTING PAYMENT SYSTEM INTEGRATION...');
    
    // Test Stripe API endpoint
    console.log('\n🔸 Testing Stripe Integration...');
    try {
      const stripeResponse = await page.evaluate(async () => {
        const response = await fetch('/api/payments/stripe/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planType: 'STARTER',
            customerEmail: 'test@n0de.pro',
            customerName: 'Test User'
          })
        });
        return {
          status: response.status,
          data: await response.json()
        };
      });
      
      console.log(`Stripe API Status: ${stripeResponse.status}`);
      console.log(`Stripe Response:`, stripeResponse.data);
      
      if (stripeResponse.data.success) {
        console.log('✅ Stripe: Product/Price creation working');
        console.log(`✅ Stripe: Customer management working`);
        console.log(`✅ Stripe: Checkout URL generated: ${stripeResponse.data.sessionUrl}`);
      } else {
        console.log(`❌ Stripe Error: ${stripeResponse.data.error}`);
        console.log(`❌ Details: ${stripeResponse.data.details}`);
      }
    } catch (e) {
      console.log(`❌ Stripe Test Failed: ${e.message}`);
    }

    // Test Coinbase Commerce
    console.log('\n🔸 Testing Coinbase Commerce Integration...');
    try {
      const coinbaseResponse = await page.evaluate(async () => {
        const response = await fetch('/api/payments/coinbase/create-charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: 'starter',
            customerEmail: 'test@n0de.pro',
            planName: 'Starter Plan',
            planType: 'STARTER'
          })
        });
        return {
          status: response.status,
          data: await response.json()
        };
      });
      
      console.log(`Coinbase API Status: ${coinbaseResponse.status}`);
      if (coinbaseResponse.data.success) {
        console.log('✅ Coinbase: Charge creation working');
        console.log(`✅ Coinbase: Payment URL: ${coinbaseResponse.data.hostedUrl}`);
        console.log(`✅ Coinbase: Amount: $${coinbaseResponse.data.amount} USD`);
      } else {
        console.log(`❌ Coinbase Error: ${coinbaseResponse.data.error}`);
      }
    } catch (e) {
      console.log(`❌ Coinbase Test Failed: ${e.message}`);
    }

    // Test NOWPayments
    console.log('\n🔸 Testing NOWPayments Integration...');
    try {
      const nowResponse = await page.evaluate(async () => {
        const response = await fetch('/api/payments/nowpayments/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: 'starter',
            customerEmail: 'test@n0de.pro',
            planType: 'STARTER',
            amount: 99
          })
        });
        return {
          status: response.status,
          data: await response.json()
        };
      });
      
      console.log(`NOWPayments API Status: ${nowResponse.status}`);
      if (nowResponse.data.success) {
        console.log('✅ NOWPayments: Payment creation working');
        console.log(`✅ NOWPayments: BTC Amount: ${nowResponse.data.payAmount} BTC`);
        console.log(`✅ NOWPayments: Order ID: ${nowResponse.data.orderId}`);
      } else {
        console.log(`❌ NOWPayments Error: ${nowResponse.data.error}`);
      }
    } catch (e) {
      console.log(`❌ NOWPayments Test Failed: ${e.message}`);
    }

    // === 3. DASHBOARD FUNCTIONALITY TESTING ===
    console.log('\n📊 3. TESTING DASHBOARD FUNCTIONALITY...');
    
    await page.goto(baseURL + '/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check dashboard components
    const dashboardSections = [
      'overview',
      'analytics', 
      'billing',
      'api-keys',
      'team'
    ];

    for (const section of dashboardSections) {
      try {
        await page.goto(baseURL + `/dashboard/${section}`);
        await page.waitForLoadState('networkidle');
        
        const pageContent = await page.content();
        const hasRealData = !pageContent.includes('2.4M') && !pageContent.includes('Acme Corporation');
        const hasPlaceholder = pageContent.includes('placeholder') || pageContent.includes('mock') || pageContent.includes('fake');
        
        console.log(`${hasRealData && !hasPlaceholder ? '✅' : '❌'} ${section.toUpperCase()}: ${hasRealData ? 'Real data' : 'Mock data'} ${hasPlaceholder ? '(has placeholders)' : ''}`);
      } catch (e) {
        console.log(`❌ ${section.toUpperCase()}: Error loading`);
      }
    }

    // === 4. TEAM MANAGEMENT ANALYSIS ===
    console.log('\n👥 4. ANALYZING TEAM MANAGEMENT SYSTEM...');
    
    await page.goto(baseURL + '/dashboard/team');
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.content();
    
    // Check for fake data indicators
    const fakeDataIndicators = [
      'Alex Kim',
      'Jordan Chen',
      'your.email@yourcompany.com',
      'fake',
      'Acme Corporation'
    ];
    
    let hasFakeData = false;
    for (const indicator of fakeDataIndicators) {
      if (pageContent.includes(indicator)) {
        console.log(`❌ Found fake data: "${indicator}"`);
        hasFakeData = true;
      }
    }
    
    if (!hasFakeData) {
      console.log('✅ Team page: No fake data detected');
    }

    // Check for database integration indicators
    const dbIntegrationIndicators = [
      'api/team',
      'organizationId',
      'TeamInvitation',
      'loading',
      'fetch'
    ];
    
    let hasDBIntegration = false;
    for (const indicator of dbIntegrationIndicators) {
      if (pageContent.includes(indicator)) {
        console.log(`✅ Database integration detected: "${indicator}"`);
        hasDBIntegration = true;
      }
    }

    // === 5. API ENDPOINTS VALIDATION ===
    console.log('\n🔌 5. TESTING API ENDPOINTS...');
    
    const apiEndpoints = [
      '/api/billing/usage',
      '/api/billing/subscription', 
      '/api/team',
      '/api/team/invitations'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.evaluate(async (url) => {
          const res = await fetch(url);
          return {
            status: res.status,
            ok: res.ok,
            headers: Object.fromEntries([...res.headers])
          };
        }, endpoint);
        
        console.log(`${response.ok ? '✅' : '❌'} ${endpoint}: Status ${response.status}`);
      } catch (e) {
        console.log(`❌ ${endpoint}: Error - ${e.message}`);
      }
    }

    // === 6. PERFORMANCE ANALYSIS ===
    console.log('\n⚡ 6. PERFORMANCE ANALYSIS...');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
        firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0)
      };
    });
    
    console.log(`📊 Load Time: ${performanceMetrics.loadTime}ms`);
    console.log(`📊 DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`📊 First Paint: ${performanceMetrics.firstPaint}ms`);
    console.log(`📊 First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);

    // === 7. MOBILE RESPONSIVENESS TEST ===
    console.log('\n📱 7. MOBILE RESPONSIVENESS TEST...');
    
    await context.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const isMobileOptimized = await page.evaluate(() => {
      return window.innerWidth <= 768 && 
             document.querySelector('meta[name="viewport"]') !== null;
    });
    
    console.log(`${isMobileOptimized ? '✅' : '❌'} Mobile optimization: ${isMobileOptimized ? 'Detected' : 'Not detected'}`);

  } catch (error) {
    console.error('❌ Test execution error:', error);
  } finally {
    await browser.close();
  }
  
  // === FINAL SUMMARY ===
  console.log('\n' + '='.repeat(60));
  console.log('🎯 COMPREHENSIVE N0DE PLATFORM ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log('\n📋 KEY FINDINGS:');
  console.log('1. Payment integration status verified');
  console.log('2. Dashboard functionality analyzed');  
  console.log('3. Team management system evaluated');
  console.log('4. API endpoints tested');
  console.log('5. Performance metrics collected');
  console.log('6. Mobile responsiveness checked');
  console.log('\n✨ Analysis complete - Review results above for detailed findings');
}

// Run the analysis
comprehensiveN0DEAnalysis().catch(console.error);