/**
 * N0DE Platform - Complete Payment Flow Testing
 * Tests all three payment methods: Stripe, Coinbase Commerce, NOWPayments
 */

const { test, expect } = require('@playwright/test');

// Test user with authentication
const testUser = {
  email: 'test@n0de.pro',
  password: 'TestPassword123!'
};

test.describe('Payment Methods - Complete Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each payment test
    await page.goto('/auth/login');
    await page.fill('[placeholder="your@email.com"]', testUser.email);
    await page.fill('[placeholder="Enter your password"]', testUser.password);
    await page.click('text=Sign In');
    
    // Verify login success
    await expect(page.url()).toContain('/dashboard');
  });

  test.describe('Stripe Payment Flow', () => {
    test('should complete Pro Plan subscription with Stripe', async ({ page }) => {
      // Navigate to subscription page
      await page.goto('/subscription');
      
      // Select Pro Plan
      await page.click('[data-testid="pro-plan-select"]');
      await expect(page.locator('text=$49/month')).toBeVisible();
      
      // Click Subscribe
      await page.click('text=Subscribe to Pro');
      
      // Should redirect to Stripe checkout
      await expect(page.url()).toContain('checkout.stripe.com');
      
      // Fill Stripe test card details
      await page.fill('[data-testid="cardNumber"]', '4242424242424242');
      await page.fill('[data-testid="cardExpiry"]', '12/25');
      await page.fill('[data-testid="cardCvc"]', '123');
      await page.fill('[data-testid="billingName"]', 'Test User');
      
      // Complete payment
      await page.click('[data-testid="submit"]');
      
      // Verify success redirect
      await expect(page.url()).toContain('/payment/success');
      await expect(page.locator('text=Payment Successful')).toBeVisible();
      
      // Navigate to billing to verify subscription
      await page.goto('/dashboard/billing');
      await expect(page.locator('text=Pro Plan')).toBeVisible();
      await expect(page.locator('text=Active')).toBeVisible();
    });

    test('should handle Stripe payment decline', async ({ page }) => {
      await page.goto('/subscription');
      await page.click('[data-testid="pro-plan-select"]');
      await page.click('text=Subscribe to Pro');
      
      // Use declined test card
      await page.fill('[data-testid="cardNumber"]', '4000000000000002');
      await page.fill('[data-testid="cardExpiry"]', '12/25');
      await page.fill('[data-testid="cardCvc"]', '123');
      await page.fill('[data-testid="billingName"]', 'Test User');
      
      await page.click('[data-testid="submit"]');
      
      // Verify error message
      await expect(page.locator('text=Your card was declined')).toBeVisible();
    });
  });

  test.describe('Coinbase Commerce Payment Flow', () => {
    test('should complete payment with Coinbase Commerce', async ({ page }) => {
      // Navigate to payment page
      await page.goto('/payment');
      
      // Select cryptocurrency payment
      await page.click('[data-testid="crypto-payment"]');
      
      // Select Pro Plan with crypto
      await page.click('[data-testid="pro-plan-crypto"]');
      
      // Fill customer details
      await page.fill('[placeholder="your@email.com"]', testUser.email);
      await page.fill('[placeholder="John Smith"]', 'Test Crypto User');
      
      // Proceed to Coinbase Commerce
      await page.click('text=Pay with Cryptocurrency');
      
      // Should redirect to Coinbase Commerce
      await expect(page.url()).toContain('commerce.coinbase.com');
      
      // Verify payment details on Coinbase page
      await expect(page.locator('text=N0DE Pro Plan')).toBeVisible();
      await expect(page.locator('text=$299')).toBeVisible(); // Pro plan price
      
      // Select payment method (Bitcoin)
      await page.click('[data-testid="bitcoin-payment"]');
      
      // Verify QR code and payment address are displayed
      await expect(page.locator('[data-testid="payment-qr"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-address"]')).toBeVisible();
      
      // In test environment, simulate payment completion
      // (Real tests would need blockchain transaction simulation)
      await page.evaluate(() => {
        window.postMessage({ type: 'COINBASE_PAYMENT_SUCCESS' }, '*');
      });
      
      // Verify success redirect back to N0DE
      await page.waitForURL('**/payment/success', { timeout: 30000 });
      await expect(page.locator('text=Crypto Payment Confirmed')).toBeVisible();
    });

    test('should handle Coinbase Commerce timeout', async ({ page }) => {
      await page.goto('/payment');
      await page.click('[data-testid="crypto-payment"]');
      await page.click('[data-testid="pro-plan-crypto"]');
      await page.fill('[placeholder="your@email.com"]', testUser.email);
      await page.click('text=Pay with Cryptocurrency');
      
      // Simulate timeout (no payment within timeframe)
      await page.waitForTimeout(60000); // Wait for payment timeout
      
      // Should show timeout message
      await expect(page.locator('text=Payment timeout')).toBeVisible();
      await expect(page.locator('text=Create new payment')).toBeVisible();
    });
  });

  test.describe('NOWPayments Flow', () => {
    test('should complete payment with NOWPayments', async ({ page }) => {
      // Navigate to alternative crypto payment
      await page.goto('/payment');
      await page.click('[data-testid="alt-crypto-payment"]');
      
      // Select plan
      await page.click('[data-testid="enterprise-plan-crypto"]');
      
      // Fill details for NOWPayments
      await page.fill('[placeholder="your@email.com"]', testUser.email);
      await page.fill('[placeholder="Company Name"]', 'Test Enterprise');
      
      // Proceed with NOWPayments
      await page.click('text=Pay with NOWPayments');
      
      // Should redirect to NOWPayments checkout
      await expect(page.url()).toContain('nowpayments.io');
      
      // Select cryptocurrency (Ethereum)
      await page.click('[data-testid="ethereum-option"]');
      
      // Verify payment details
      await expect(page.locator('text=N0DE Enterprise Plan')).toBeVisible();
      
      // Get payment address
      const paymentAddress = await page.locator('[data-testid="payment-address"]').textContent();
      expect(paymentAddress).toMatch(/^0x[a-fA-F0-9]{40}$/); // Ethereum address format
      
      // Simulate payment completion
      await page.evaluate(() => {
        window.postMessage({ type: 'NOWPAYMENTS_SUCCESS' }, '*');
      });
      
      // Verify success
      await page.waitForURL('**/payment/success');
      await expect(page.locator('text=Enterprise Plan Activated')).toBeVisible();
    });

    test('should handle NOWPayments currency conversion', async ({ page }) => {
      await page.goto('/payment');
      await page.click('[data-testid="alt-crypto-payment"]');
      
      // Test currency conversion display
      await page.click('[data-testid="bitcoin-currency"]');
      
      // Should show USD to BTC conversion
      await expect(page.locator('[data-testid="usd-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="btc-amount"]')).toBeVisible();
      
      // Conversion rate should be displayed
      await expect(page.locator('text=Exchange Rate:')).toBeVisible();
    });
  });

  test.describe('Payment Management', () => {
    test('should display payment history correctly', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Verify payment history section
      await expect(page.locator('text=Recent Invoices')).toBeVisible();
      
      // Check for real payment data (not mock INV-001, etc.)
      const invoiceElements = await page.locator('[data-testid="invoice-row"]').all();
      
      for (const invoice of invoiceElements) {
        // Verify invoice has real ID format
        const invoiceId = await invoice.locator('[data-testid="invoice-id"]').textContent();
        expect(invoiceId).not.toMatch(/^INV-00[123]$/); // Should not be mock data
        
        // Verify download link works
        const downloadButton = invoice.locator('[data-testid="download-invoice"]');
        await expect(downloadButton).toBeVisible();
      }
    });

    test('should handle subscription cancellation', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Click manage subscription
      await page.click('text=Manage Plan');
      
      // Cancel subscription
      await page.click('text=Cancel Subscription');
      
      // Confirm cancellation
      await page.click('[data-testid="confirm-cancel"]');
      
      // Verify cancellation success
      await expect(page.locator('text=Subscription Cancelled')).toBeVisible();
      await expect(page.locator('text=Active until')).toBeVisible(); // Shows end date
    });

    test('should update payment method successfully', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Update payment method
      await page.click('text=Update Payment Method');
      
      // Should redirect to Stripe billing portal or show update form
      if (page.url().includes('billing.stripe.com')) {
        // Stripe billing portal
        await expect(page.locator('text=Update payment method')).toBeVisible();
      } else {
        // In-app payment method update
        await page.fill('[data-testid="new-card-number"]', '4242424242424242');
        await page.fill('[data-testid="new-card-expiry"]', '12/26');
        await page.fill('[data-testid="new-card-cvc"]', '456');
        
        await page.click('text=Update Card');
        
        // Verify success
        await expect(page.locator('text=Payment method updated')).toBeVisible();
      }
    });
  });

  test.describe('Payment Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept and fail payment requests
      await page.route('**/api/payments/**', route => {
        route.abort();
      });
      
      await page.goto('/payment');
      await page.click('[data-testid="crypto-payment"]');
      
      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible();
      await expect(page.locator('text=Please try again')).toBeVisible();
    });

    test('should validate payment amounts', async ({ page }) => {
      await page.goto('/payment');
      
      // Try to modify payment amount (should be prevented)
      await page.evaluate(() => {
        document.querySelector('[data-testid="payment-amount"]').value = '1';
      });
      
      await page.click('text=Proceed to Payment');
      
      // Should show validation error
      await expect(page.locator('text=Invalid payment amount')).toBeVisible();
    });
  });
});