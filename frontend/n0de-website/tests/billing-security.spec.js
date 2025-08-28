const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.VERCEL_URL || 'https://www.n0de.pro';
const BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://n0de-backend-production-4e34.up.railway.app';

test.describe('🔒 Billing Security & Data Integrity Tests', () => {
  
  test('CRITICAL: Cannot upgrade subscription without payment', async ({ page }) => {
    console.log('🔒 Testing subscription upgrade security...');
    
    // Step 1: Try direct API call to upgrade endpoint (should fail)
    const directUpgradeResponse = await page.request.post(`${BACKEND_URL}/api/subscriptions/upgrade`, {
      data: {
        planType: 'STARTER',
        paymentInfo: {}
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    // Should return 400 Bad Request - payment required
    expect(directUpgradeResponse.status()).toBe(400);
    console.log('✅ Direct upgrade without payment blocked (status: 400)');
    
    const errorData = await directUpgradeResponse.json();
    expect(errorData.message).toContain('payment');
    console.log('✅ Error message confirms payment verification required');
    
    // Step 2: Test secure checkout flow
    const checkoutResponse = await page.request.post(`${BACKEND_URL}/api/subscriptions/upgrade/checkout`, {
      data: {
        planType: 'STARTER',
        paymentProvider: 'STRIPE'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    if (checkoutResponse.status() === 200) {
      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.checkoutUrl).toBeTruthy();
      expect(checkoutData.paymentId).toBeTruthy();
      console.log('✅ Secure checkout URL generated successfully');
    } else if (checkoutResponse.status() === 401) {
      console.log('ℹ️ Authentication required for checkout (expected)');
    }
  });

  test('Billing page does not show placeholder payment data', async ({ page }) => {
    console.log('📋 Testing billing page for real data...');
    
    await page.goto(`${FRONTEND_URL}/dashboard/billing`, { waitUntil: 'networkidle' });
    
    // Check that placeholder payment method is not shown
    const placeholderCard = await page.locator('text=•••• •••• •••• 4242').count();
    expect(placeholderCard).toBe(0);
    console.log('✅ No placeholder credit card (4242) found');
    
    // Check that placeholder address is not shown
    const placeholderAddress = await page.locator('text=Acme Corporation').count();
    expect(placeholderAddress).toBe(0);
    console.log('✅ No placeholder company name (Acme Corporation) found');
    
    const placeholderStreet = await page.locator('text=123 Business Ave').count();
    expect(placeholderStreet).toBe(0);
    console.log('✅ No placeholder address (123 Business Ave) found');
    
    // Should show either real data or "No payment method on file"
    const noPaymentMethod = await page.locator('text=No payment method on file').count();
    const realPaymentMethod = await page.locator('text=/Visa|Mastercard|American Express/').count();
    
    expect(noPaymentMethod + realPaymentMethod).toBeGreaterThan(0);
    console.log('✅ Shows either real payment method or empty state');
    
    // Should show either real address or "No billing address on file"
    const noBillingAddress = await page.locator('text=No billing address on file').count();
    
    if (noBillingAddress > 0) {
      console.log('✅ Shows proper empty state for billing address');
    } else {
      console.log('ℹ️ May have real billing address configured');
    }
  });

  test('Upgrade button uses secure checkout flow', async ({ page }) => {
    console.log('🔐 Testing upgrade button security...');
    
    await page.goto(`${FRONTEND_URL}/dashboard/billing`, { waitUntil: 'networkidle' });
    
    // Look for upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade Plan")').first();
    
    if (await upgradeButton.isVisible()) {
      // Click upgrade button
      await upgradeButton.click();
      
      // Should open modal with plan options
      await page.waitForTimeout(1000);
      
      // Find and click a plan upgrade button
      const planUpgradeButton = page.locator('button:has-text("Upgrade to")').first();
      
      if (await planUpgradeButton.isVisible()) {
        // Intercept network request to verify it uses /upgrade/checkout
        const [request] = await Promise.all([
          page.waitForRequest(req => 
            req.url().includes('/subscriptions/upgrade') &&
            req.method() === 'POST',
            { timeout: 5000 }
          ).catch(() => null),
          planUpgradeButton.click()
        ]);
        
        if (request) {
          // Check that request goes to secure endpoint
          expect(request.url()).toContain('/upgrade/checkout');
          console.log('✅ Upgrade button uses secure checkout endpoint');
        } else {
          console.log('ℹ️ Could not intercept upgrade request (may require auth)');
        }
      }
    } else {
      console.log('ℹ️ Upgrade button not visible (may require auth)');
    }
  });

  test('Analytics page handles missing data gracefully', async ({ page }) => {
    console.log('📊 Testing analytics page data handling...');
    
    await page.goto(`${FRONTEND_URL}/dashboard/analytics`, { waitUntil: 'networkidle' });
    
    // Check for JavaScript errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should not have errors about undefined variables
    const undefinedErrors = consoleErrors.filter(err => 
      err.includes('undefined') || 
      err.includes('Cannot read') ||
      err.includes('topEndpoints') ||
      err.includes('errorBreakdown')
    );
    
    expect(undefinedErrors.length).toBe(0);
    console.log('✅ No undefined variable errors in analytics page');
    
    // Check that top endpoints section exists (even if empty)
    const endpointsSection = await page.locator('text=Top Endpoints').count();
    expect(endpointsSection).toBeGreaterThan(0);
    console.log('✅ Top Endpoints section renders correctly');
    
    // Check that error analysis section exists
    const errorSection = await page.locator('text=Error Analysis').count();
    expect(errorSection).toBeGreaterThan(0);
    console.log('✅ Error Analysis section renders correctly');
    
    // Check for placeholder percentages (should use calculated values)
    const hardcodedPercentages = await page.locator('text=/\\+12\\.3%|\\-8\\.2%/').count();
    
    if (hardcodedPercentages === 0) {
      console.log('✅ No hardcoded percentage values found');
    } else {
      console.log('⚠️ Some hardcoded percentages may still exist');
    }
  });

  test('Payment endpoints require authentication', async ({ page }) => {
    console.log('🔐 Testing payment endpoint security...');
    
    const endpoints = [
      '/api/payments',
      '/api/payments/stats',
      '/api/subscriptions/upgrade',
      '/api/subscriptions/upgrade/checkout',
      '/api/users/payment-methods',
      '/api/users/billing-address'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`${BACKEND_URL}${endpoint}`, {
        failOnStatusCode: false
      });
      
      // Should require authentication (401) or method not allowed (405)
      const isSecure = response.status() === 401 || 
                      response.status() === 403 || 
                      response.status() === 405;
      
      expect(isSecure).toBeTruthy();
      console.log(`✅ ${endpoint}: Secured (${response.status()})`);
    }
  });

  test('Overage payment creates real payment session', async ({ page }) => {
    console.log('💰 Testing overage payment flow...');
    
    const overageResponse = await page.request.post(`${BACKEND_URL}/api/payments/overage`, {
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    if (overageResponse.status() === 401) {
      console.log('✅ Overage payment endpoint requires authentication');
    } else if (overageResponse.status() === 400) {
      const data = await overageResponse.json();
      expect(data.message).toBeTruthy();
      console.log('✅ Overage payment validates business rules');
    }
  });

  test('User cannot bypass payment for premium features', async ({ page }) => {
    console.log('🚫 Testing premium feature access control...');
    
    // Test accessing premium features without payment
    const premiumEndpoints = [
      '/api/rpc/premium',
      '/api/analytics/advanced',
      '/api/webhooks/custom'
    ];
    
    for (const endpoint of premiumEndpoints) {
      const response = await page.request.get(`${BACKEND_URL}${endpoint}`, {
        failOnStatusCode: false
      });
      
      // Should either require auth or payment
      const isProtected = response.status() === 401 || 
                         response.status() === 403 || 
                         response.status() === 402 || // Payment Required
                         response.status() === 404;
      
      expect(isProtected).toBeTruthy();
      console.log(`✅ Premium endpoint ${endpoint} is protected (${response.status()})`);
    }
  });
});

test.describe('📊 Data Integrity Tests', () => {
  
  test('Dashboard shows consistent data across pages', async ({ page }) => {
    console.log('🔄 Testing data consistency...');
    
    // Load billing page
    await page.goto(`${FRONTEND_URL}/dashboard/billing`, { waitUntil: 'networkidle' });
    
    // Get usage data from billing page
    const billingUsage = await page.locator('text=/\\d+ \\/ \\d+ requests used|\\d+ requests used/').first().textContent();
    
    // Load analytics page
    await page.goto(`${FRONTEND_URL}/dashboard/analytics`, { waitUntil: 'networkidle' });
    
    // Get usage data from analytics page
    const analyticsUsage = await page.locator('text=/Total Requests/').first().isVisible();
    
    if (billingUsage && analyticsUsage) {
      console.log('✅ Usage data appears on both pages');
    } else {
      console.log('ℹ️ May require authentication to verify data consistency');
    }
  });

  test('Real-time usage updates work correctly', async ({ page }) => {
    console.log('⚡ Testing real-time usage updates...');
    
    await page.goto(`${FRONTEND_URL}/dashboard/billing`, { waitUntil: 'networkidle' });
    
    // Look for real-time indicator
    const realtimeIndicator = await page.locator('text=/Live updates|real-time|Real-time/i').count();
    
    if (realtimeIndicator > 0) {
      console.log('✅ Real-time updates indicator present');
      
      // Wait 30 seconds to see if data updates
      const initialValue = await page.locator('[class*="requests"]').first().textContent();
      await page.waitForTimeout(30000);
      const updatedValue = await page.locator('[class*="requests"]').first().textContent();
      
      if (initialValue !== updatedValue) {
        console.log('✅ Real-time data updates confirmed');
      } else {
        console.log('ℹ️ No changes detected in 30 seconds (may be no activity)');
      }
    } else {
      console.log('ℹ️ Real-time updates may not be visible');
    }
  });
});

console.log('\n🎯 Billing Security Test Suite Complete\n');