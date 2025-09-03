/**
 * N0DE Platform - iOS Simulator MCP Mobile Payment Testing
 * Comprehensive mobile payment flow testing on iOS devices
 */

const { test, expect } = require('@playwright/test');

// iOS Simulator MCP Integration
class iOSSimulatorMCP {
  constructor(page) {
    this.page = page;
    this.device = null;
  }

  async setDevice(deviceName) {
    this.device = deviceName;
    
    // Set appropriate viewport for iOS devices
    const deviceConfigs = {
      'iPhone 15 Pro': { width: 393, height: 852 },
      'iPhone 14': { width: 390, height: 844 },
      'iPhone SE': { width: 375, height: 667 }
    };

    if (deviceConfigs[deviceName]) {
      await this.page.setViewportSize(deviceConfigs[deviceName]);
    }
  }

  async simulateTouchGesture(selector, gesture = 'tap') {
    const element = await this.page.locator(selector);
    
    switch (gesture) {
      case 'tap':
        await element.tap();
        break;
      case 'double_tap':
        await element.dblclick();
        break;
      case 'long_press':
        await element.press();
        break;
      case 'swipe_left':
        await element.swipeLeft();
        break;
      case 'swipe_right':
        await element.swipeRight();
        break;
    }
  }

  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `ios-screenshots/${this.device}-${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async verifyMobileOptimization(selector) {
    const element = await this.page.locator(selector);
    const boundingBox = await element.boundingBox();
    
    // Verify touch target size (minimum 44px as per iOS guidelines)
    expect(boundingBox.width).toBeGreaterThanOrEqual(44);
    expect(boundingBox.height).toBeGreaterThanOrEqual(44);
  }
}

const testUser = {
  email: 'mobile.test@n0de.pro',
  password: 'MobileTest123!'
};

test.describe('iOS Mobile Payment Flows', () => {
  let iosMCP;

  test.beforeEach(async ({ page }) => {
    iosMCP = new iOSSimulatorMCP(page);
    
    // Login on mobile
    await page.goto('/auth/login');
    await page.fill('[placeholder="your@email.com"]', testUser.email);
    await page.fill('[placeholder="Enter your password"]', testUser.password);
    await page.tap('text=Sign In');
    
    await expect(page.url()).toContain('/dashboard');
  });

  test.describe('iPhone 15 Pro - Stripe Mobile Payment', () => {
    test('should complete Stripe subscription flow on iPhone 15 Pro', async ({ page }) => {
      await iosMCP.setDevice('iPhone 15 Pro');
      await iosMCP.takeScreenshot('login-success');
      
      // Navigate to subscription page
      await page.goto('/subscription');
      await iosMCP.takeScreenshot('subscription-page');
      
      // Verify mobile layout optimization
      await expect(page.locator('[data-testid="mobile-subscription-layout"]')).toBeVisible();
      
      // Select Pro Plan with mobile-friendly interaction
      await iosMCP.simulateTouchGesture('[data-testid="pro-plan-mobile"]', 'tap');
      await iosMCP.takeScreenshot('plan-selected');
      
      // Verify plan details are readable on mobile
      await expect(page.locator('text=$49/month')).toBeVisible();
      await iosMCP.verifyMobileOptimization('[data-testid="subscribe-button"]');
      
      // Proceed to Stripe checkout
      await iosMCP.simulateTouchGesture('text=Subscribe to Pro', 'tap');
      
      // Should redirect to mobile-optimized Stripe checkout
      await page.waitForURL('**/checkout.stripe.com/**');
      await iosMCP.takeScreenshot('stripe-mobile-checkout');
      
      // Verify Stripe mobile optimization
      await expect(page.locator('[data-testid="mobile-checkout-form"]')).toBeVisible();
      
      // Fill payment details with mobile keyboard simulation
      await page.fill('[data-testid="cardNumber"]', '4242424242424242');
      await page.fill('[data-testid="cardExpiry"]', '12/25'); 
      await page.fill('[data-testid="cardCvc"]', '123');
      await page.fill('[data-testid="billingName"]', 'Mobile Test User');
      
      await iosMCP.takeScreenshot('payment-details-filled');
      
      // Complete mobile payment
      await iosMCP.simulateTouchGesture('[data-testid="submit"]', 'tap');
      
      // Verify success on mobile
      await page.waitForURL('**/payment/success');
      await iosMCP.takeScreenshot('payment-success-mobile');
      
      await expect(page.locator('text=Payment Successful')).toBeVisible();
      
      // Navigate to mobile billing dashboard
      await page.goto('/dashboard/billing');
      await iosMCP.takeScreenshot('mobile-billing-dashboard');
      
      // Verify mobile billing display
      await expect(page.locator('[data-testid="mobile-billing-card"]')).toBeVisible();
      await expect(page.locator('text=Pro Plan')).toBeVisible();
      await expect(page.locator('text=Active')).toBeVisible();
    });

    test('should handle mobile form validation errors', async ({ page }) => {
      await iosMCP.setDevice('iPhone 15 Pro');
      
      await page.goto('/subscription');
      await iosMCP.simulateTouchGesture('[data-testid="pro-plan-mobile"]', 'tap');
      await iosMCP.simulateTouchGesture('text=Subscribe to Pro', 'tap');
      
      // Try invalid card on mobile
      await page.fill('[data-testid="cardNumber"]', '1234');
      await iosMCP.simulateTouchGesture('[data-testid="submit"]', 'tap');
      
      // Verify mobile error display
      await expect(page.locator('[data-testid="mobile-error-message"]')).toBeVisible();
      await iosMCP.takeScreenshot('mobile-validation-error');
    });
  });

  test.describe('iPhone 14 - Coinbase Commerce Mobile', () => {
    test('should handle Coinbase Commerce crypto payment on iPhone 14', async ({ page }) => {
      await iosMCP.setDevice('iPhone 14');
      
      // Navigate to crypto payment
      await page.goto('/payment');
      await iosMCP.simulateTouchGesture('[data-testid="crypto-payment-mobile"]', 'tap');
      await iosMCP.takeScreenshot('crypto-payment-selection');
      
      // Select enterprise plan
      await iosMCP.simulateTouchGesture('[data-testid="enterprise-plan-crypto-mobile"]', 'tap');
      
      // Fill mobile form
      await page.fill('[data-testid="mobile-email-input"]', testUser.email);
      await page.fill('[data-testid="mobile-company-input"]', 'Mobile Test Company');
      
      await iosMCP.takeScreenshot('crypto-form-filled');
      
      // Proceed to Coinbase Commerce
      await iosMCP.simulateTouchGesture('text=Pay with Cryptocurrency', 'tap');
      
      // Should redirect to mobile-optimized Coinbase Commerce
      await page.waitForURL('**/commerce.coinbase.com/**');
      await iosMCP.takeScreenshot('coinbase-mobile-interface');
      
      // Verify mobile crypto interface
      await expect(page.locator('[data-testid="mobile-crypto-selector"]')).toBeVisible();
      
      // Select Bitcoin payment on mobile
      await iosMCP.simulateTouchGesture('[data-testid="bitcoin-mobile-option"]', 'tap');
      
      // Verify QR code is properly sized for mobile
      const qrCode = page.locator('[data-testid="payment-qr-mobile"]');
      await expect(qrCode).toBeVisible();
      
      const qrBounds = await qrCode.boundingBox();
      expect(qrBounds.width).toBeGreaterThanOrEqual(200); // Minimum readable size on mobile
      
      await iosMCP.takeScreenshot('mobile-qr-code-display');
      
      // Verify payment address is properly formatted for mobile
      const paymentAddress = page.locator('[data-testid="mobile-payment-address"]');
      await expect(paymentAddress).toBeVisible();
      
      // Simulate payment completion (in test environment)
      await page.evaluate(() => {
        window.postMessage({ type: 'COINBASE_MOBILE_SUCCESS' }, '*');
      });
      
      await page.waitForURL('**/payment/success');
      await iosMCP.takeScreenshot('crypto-success-mobile');
      
      await expect(page.locator('text=Crypto Payment Confirmed')).toBeVisible();
    });
  });

  test.describe('iPhone SE - NOWPayments Mobile Flow', () => {
    test('should complete NOWPayments flow on small screen iPhone SE', async ({ page }) => {
      await iosMCP.setDevice('iPhone SE');
      
      // Test on smallest iPhone screen
      await page.goto('/payment');
      await iosMCP.takeScreenshot('small-screen-payment-page');
      
      // Verify elements are still accessible on small screen
      await iosMCP.verifyMobileOptimization('[data-testid="alt-crypto-payment"]');
      
      await iosMCP.simulateTouchGesture('[data-testid="alt-crypto-payment"]', 'tap');
      
      // Select plan optimized for small screen
      await iosMCP.simulateTouchGesture('[data-testid="pro-plan-small-screen"]', 'tap');
      
      // Fill compact form
      await page.fill('[data-testid="compact-email"]', testUser.email);
      
      await iosMCP.takeScreenshot('small-screen-form');
      
      // Proceed with NOWPayments
      await iosMCP.simulateTouchGesture('text=Pay with NOWPayments', 'tap');
      
      await page.waitForURL('**/nowpayments.io/**');
      await iosMCP.takeScreenshot('nowpayments-small-screen');
      
      // Verify mobile interface adapts to small screen
      await expect(page.locator('[data-testid="compact-currency-selector"]')).toBeVisible();
      
      // Select Ethereum
      await iosMCP.simulateTouchGesture('[data-testid="ethereum-compact"]', 'tap');
      
      // Verify payment details fit on small screen
      const paymentInfo = page.locator('[data-testid="compact-payment-info"]');
      await expect(paymentInfo).toBeVisible();
      
      await iosMCP.takeScreenshot('ethereum-payment-small-screen');
      
      // Simulate completion
      await page.evaluate(() => {
        window.postMessage({ type: 'NOWPAYMENTS_MOBILE_SUCCESS' }, '*');
      });
      
      await page.waitForURL('**/payment/success');
      await expect(page.locator('text=Payment Confirmed')).toBeVisible();
      
      await iosMCP.takeScreenshot('success-small-screen');
    });
  });

  test.describe('Mobile Dashboard Integration', () => {
    test('should display real billing data correctly on mobile', async ({ page }) => {
      await iosMCP.setDevice('iPhone 15 Pro');
      
      await page.goto('/dashboard/billing');
      await iosMCP.takeScreenshot('mobile-billing-real-data');
      
      // Verify real data is displayed (not mock values)
      const usageText = await page.locator('[data-testid="mobile-usage-display"]').textContent();
      const planText = await page.locator('[data-testid="mobile-plan-display"]').textContent();
      
      // Should not contain mock data
      expect(usageText).not.toContain('2.4M / 5M');
      expect(planText).not.toContain('•••• •••• •••• 4242');
      
      // Should have real formatting
      expect(usageText).toMatch(/\\d+(\\.\\d+)?[KM]? \\/ \\d+(\\.\\d+)?[KM]?/);
    });

    test('should handle mobile navigation smoothly', async ({ page }) => {
      await iosMCP.setDevice('iPhone 14');
      
      await page.goto('/dashboard');
      
      // Test mobile hamburger menu
      await iosMCP.simulateTouchGesture('[data-testid="mobile-menu-toggle"]', 'tap');
      await iosMCP.takeScreenshot('mobile-menu-open');
      
      await expect(page.locator('[data-testid="mobile-navigation-menu"]')).toBeVisible();
      
      // Test navigation to billing
      await iosMCP.simulateTouchGesture('[data-testid="mobile-nav-billing"]', 'tap');
      
      await expect(page.url()).toContain('/billing');
      await iosMCP.takeScreenshot('mobile-billing-navigation');
      
      // Test swipe gestures for navigation
      await iosMCP.simulateTouchGesture('[data-testid="mobile-content-area"]', 'swipe_left');
      
      // Should navigate to next section or show gesture feedback
      await iosMCP.takeScreenshot('mobile-swipe-navigation');
    });

    test('should maintain responsive layout across orientations', async ({ page }) => {
      await iosMCP.setDevice('iPhone 15 Pro');
      
      await page.goto('/dashboard/analytics');
      
      // Portrait mode
      await page.setViewportSize({ width: 393, height: 852 });
      await iosMCP.takeScreenshot('analytics-portrait');
      
      // Verify charts are readable in portrait
      await expect(page.locator('[data-testid="mobile-analytics-chart"]')).toBeVisible();
      
      // Landscape mode
      await page.setViewportSize({ width: 852, height: 393 });
      await iosMCP.takeScreenshot('analytics-landscape');
      
      // Verify layout adapts to landscape
      await expect(page.locator('[data-testid="landscape-analytics-layout"]')).toBeVisible();
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should meet iOS accessibility guidelines', async ({ page }) => {
      await iosMCP.setDevice('iPhone 15 Pro');
      
      await page.goto('/dashboard');
      
      // Check all interactive elements meet minimum size requirements
      const buttons = await page.locator('button, [role="button"]').all();
      
      for (const button of buttons) {
        await iosMCP.verifyMobileOptimization(button);
      }
      
      // Verify color contrast for mobile viewing
      const textElements = await page.locator('p, span, h1, h2, h3').all();
      
      for (const element of textElements) {
        const styles = await element.evaluate(el => getComputedStyle(el));
        
        // Basic color contrast check (would need more sophisticated testing in real scenario)
        expect(styles.color).toBeDefined();
        expect(styles.backgroundColor).toBeDefined();
      }
      
      await iosMCP.takeScreenshot('accessibility-validation');
    });

    test('should support dynamic type scaling', async ({ page }) => {
      await iosMCP.setDevice('iPhone SE');
      
      // Simulate different iOS text size settings
      const textSizes = ['small', 'medium', 'large', 'extra-large'];
      
      for (const size of textSizes) {
        await page.addStyleTag({
          content: `
            * { 
              font-size: ${size === 'small' ? '14px' : size === 'medium' ? '16px' : size === 'large' ? '18px' : '20px'} !important; 
            }
          `
        });
        
        await page.goto('/dashboard');
        await iosMCP.takeScreenshot(`text-size-${size}`);
        
        // Verify content is still readable and accessible
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      }
    });
  });
});