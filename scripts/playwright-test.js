const { chromium } = require('playwright');

async function testN0deUpgradeFlow() {
  console.log('Starting N0DE Platform Upgrade Flow Test');
  console.log('=========================================');
  
  // Launch browser in headless mode
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Console Error:', msg.text());
      }
    });
    
    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('upgrade') || request.url().includes('subscription')) {
        console.log('API Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('upgrade') || response.url().includes('subscription')) {
        console.log('API Response:', response.status(), response.url());
      }
    });
    
    // Step 1: Navigate to the site
    console.log('\n1. Navigating to https://www.n0de.pro...');
    await page.goto('https://www.n0de.pro', { waitUntil: 'networkidle' });
    console.log('   ✓ Page loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'n0de-homepage.png' });
    console.log('   ✓ Screenshot saved: n0de-homepage.png');
    
    // Step 2: Look for login/signup button
    console.log('\n2. Looking for authentication options...');
    const authButton = await page.$('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Get Started")');
    if (authButton) {
      console.log('   ✓ Found auth button');
      const buttonText = await authButton.textContent();
      console.log('   Button text:', buttonText);
    } else {
      console.log('   ! No auth button found on homepage');
    }
    
    // Step 3: Check for dashboard link
    console.log('\n3. Checking for dashboard access...');
    const dashboardLink = await page.$('a[href*="dashboard"], a:has-text("Dashboard")');
    if (dashboardLink) {
      console.log('   ✓ Dashboard link found');
    } else {
      console.log('   ! No dashboard link found');
    }
    
    // Step 4: Navigate to subscription page directly
    console.log('\n4. Navigating to subscription page...');
    await page.goto('https://www.n0de.pro/subscription', { waitUntil: 'networkidle' });
    
    // Check if redirected to login
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    if (currentUrl.includes('auth') || currentUrl.includes('login')) {
      console.log('   ! Redirected to login page - authentication required');
    } else {
      console.log('   ✓ On subscription page');
      await page.screenshot({ path: 'n0de-subscription.png' });
      console.log('   ✓ Screenshot saved: n0de-subscription.png');
      
      // Look for upgrade buttons
      const upgradeButtons = await page.$$('button:has-text("Upgrade"), button:has-text("Select Plan")');
      console.log('   Found', upgradeButtons.length, 'upgrade buttons');
    }
    
    // Step 5: Try checkout page
    console.log('\n5. Testing checkout page...');
    await page.goto('https://www.n0de.pro/checkout?plan=STARTER', { waitUntil: 'networkidle' });
    const checkoutUrl = page.url();
    console.log('   Current URL:', checkoutUrl);
    
    if (checkoutUrl.includes('checkout')) {
      console.log('   ✓ On checkout page');
      await page.screenshot({ path: 'n0de-checkout.png' });
      console.log('   ✓ Screenshot saved: n0de-checkout.png');
    }
    
    console.log('\n=========================================');
    console.log('Test completed. Screenshots saved.');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testN0deUpgradeFlow().catch(console.error);