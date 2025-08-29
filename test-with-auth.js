const { chromium } = require('playwright');

// Mock auth token for testing (you'll need to provide a real one)
const AUTH_TOKEN = process.env.N0DE_AUTH_TOKEN || '';

async function testN0deUpgradeWithAuth() {
  console.log('Testing N0DE Upgrade Flow with Authentication');
  console.log('==============================================\n');

  if (!AUTH_TOKEN) {
    console.log('⚠️  No auth token provided. Set N0DE_AUTH_TOKEN environment variable.');
    console.log('   You can get this from browser DevTools after logging in.');
    console.log('   Look for "n0de_token" in localStorage.\n');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Monitor API calls
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('api/v1')) {
        apiCalls.push({
          method: request.method(),
          url: request.url(),
          data: request.postData()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('api/v1') && response.status() >= 400) {
        console.log(`❌ API Error: ${response.status()} - ${response.url()}`);
      }
    });

    // Step 1: Go to homepage and inject auth token
    console.log('1. Setting up authentication...');
    await page.goto('https://www.n0de.pro');
    
    if (AUTH_TOKEN) {
      // Inject auth token into localStorage
      await page.evaluate((token) => {
        localStorage.setItem('n0de_token', token);
        localStorage.setItem('n0de_token_timestamp', Date.now().toString());
      }, AUTH_TOKEN);
      console.log('   ✓ Auth token injected\n');
    } else {
      console.log('   ⚠️  No auth token - continuing without authentication\n');
    }

    // Step 2: Navigate to dashboard
    console.log('2. Navigating to dashboard...');
    await page.goto('https://www.n0de.pro/dashboard', { waitUntil: 'networkidle' });
    const dashboardUrl = page.url();
    
    if (dashboardUrl.includes('auth') || dashboardUrl.includes('login')) {
      console.log('   ❌ Redirected to login - authentication failed\n');
    } else {
      console.log('   ✓ Dashboard loaded\n');
      await page.screenshot({ path: 'dashboard.png' });
    }

    // Step 3: Go to billing page
    console.log('3. Navigating to billing page...');
    await page.goto('https://www.n0de.pro/dashboard/billing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'billing.png' });
    console.log('   ✓ Billing page loaded\n');

    // Step 4: Look for upgrade buttons
    console.log('4. Looking for upgrade buttons...');
    const upgradeButtons = await page.$$eval(
      'button',
      buttons => buttons
        .filter(btn => btn.textContent.toLowerCase().includes('upgrade'))
        .map(btn => btn.textContent)
    );
    
    if (upgradeButtons.length > 0) {
      console.log(`   ✓ Found ${upgradeButtons.length} upgrade button(s):`);
      upgradeButtons.forEach(text => console.log(`     - "${text}"`));
      
      // Try clicking the first upgrade button
      console.log('\n5. Attempting to click upgrade button...');
      const button = await page.$('button:has-text("Upgrade")');
      if (button) {
        await button.click();
        await page.waitForTimeout(3000);
        
        // Check where we ended up
        const afterClickUrl = page.url();
        console.log(`   After click URL: ${afterClickUrl}`);
        
        if (afterClickUrl.includes('checkout')) {
          console.log('   ✓ Redirected to checkout page - CORRECT BEHAVIOR');
        } else if (afterClickUrl.includes('stripe')) {
          console.log('   ✓ Redirected to Stripe - CORRECT BEHAVIOR');
        } else {
          console.log('   ⚠️  Unexpected redirect');
        }
        
        await page.screenshot({ path: 'after-upgrade-click.png' });
      }
    } else {
      console.log('   ❌ No upgrade buttons found\n');
    }

    // Step 5: Test direct API call
    console.log('\n6. Testing direct API endpoints...');
    
    // Test the wrong endpoint (should fail)
    console.log('   Testing /subscriptions/upgrade (should fail)...');
    const wrongResponse = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('n0de_token');
        const response = await fetch('https://n0de-backend-production-4e34.up.railway.app/api/v1/subscriptions/upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ planType: 'STARTER' })
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (wrongResponse.status === 400) {
      console.log('   ✓ Correct: Endpoint blocked upgrade without payment');
      console.log(`   Message: "${wrongResponse.data.message}"`);
    } else {
      console.log('   Response:', wrongResponse);
    }

    // Test the correct endpoint
    console.log('\n   Testing /payments/subscription/upgrade/checkout (correct)...');
    const correctResponse = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('n0de_token');
        const response = await fetch('https://n0de-backend-production-4e34.up.railway.app/api/v1/payments/subscription/upgrade/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ planType: 'STARTER' })
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (correctResponse.status === 200) {
      console.log('   ✓ Success: Checkout endpoint returned URL');
      if (correctResponse.data.checkoutUrl) {
        console.log(`   Checkout URL: ${correctResponse.data.checkoutUrl.substring(0, 50)}...`);
      }
    } else if (correctResponse.status === 401) {
      console.log('   ⚠️  Authentication required');
    } else {
      console.log('   Response:', correctResponse);
    }

    // Summary
    console.log('\n==============================================');
    console.log('SUMMARY OF API CALLS:');
    apiCalls.forEach(call => {
      console.log(`${call.method} ${call.url}`);
      if (call.data) {
        console.log(`  Data: ${call.data}`);
      }
    });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Instructions
console.log('To run this test with authentication:');
console.log('1. Login to https://www.n0de.pro in your browser');
console.log('2. Open DevTools (F12) and go to Application > Local Storage');
console.log('3. Copy the value of "n0de_token"');
console.log('4. Run: N0DE_AUTH_TOKEN="your-token" node test-with-auth.js\n');

// Run test
testN0deUpgradeWithAuth().catch(console.error);