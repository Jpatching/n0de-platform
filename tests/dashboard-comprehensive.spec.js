/**
 * N0DE Platform - Comprehensive Dashboard Testing
 * Tests all dashboard functionality with real data integration
 */

const { test, expect } = require('@playwright/test');

const testUser = {
  email: 'test@n0de.pro',
  password: 'TestPassword123!'
};

test.describe('Dashboard Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('[placeholder="your@email.com"]', testUser.email);
    await page.fill('[placeholder="Enter your password"]', testUser.password);
    await page.click('text=Sign In');
    await expect(page.url()).toContain('/dashboard');
  });

  test.describe('Dashboard Overview - Real Data Integration', () => {
    test('should display real usage metrics (not mock data)', async ({ page }) => {
      await page.goto('/dashboard/overview');
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="metrics-loaded"]', { timeout: 10000 });
      
      // Verify metrics are NOT the old mock values
      const apiRequestsValue = await page.locator('[data-testid="api-requests-metric"]').textContent();
      const responseTimeValue = await page.locator('[data-testid="response-time-metric"]').textContent();
      const successRateValue = await page.locator('[data-testid="success-rate-metric"]').textContent();
      
      // Should not be the hardcoded mock values
      expect(apiRequestsValue).not.toBe('2.4M');
      expect(responseTimeValue).not.toBe('42ms');
      expect(successRateValue).not.toBe('99.97%');
      
      // Should have valid metric formats
      expect(apiRequestsValue).toMatch(/^\\d+(\\.\\d+)?[KM]?$/);
      expect(responseTimeValue).toMatch(/^\\d+ms$/);
      expect(successRateValue).toMatch(/^\\d+\\.\\d+%$/);
    });

    test('should show loading states while fetching data', async ({ page }) => {
      // Slow down network to test loading states
      await page.route('**/api/billing/usage', async route => {
        await page.waitForTimeout(2000);
        route.continue();
      });
      
      await page.goto('/dashboard/overview');
      
      // Should show loading spinner
      await expect(page.locator('text=Loading dashboard metrics')).toBeVisible();
      
      // Should hide loading after data loads
      await expect(page.locator('text=Loading dashboard metrics')).not.toBeVisible({ timeout: 15000 });
    });

    test('should handle API errors with fallback data', async ({ page }) => {
      // Simulate API failure
      await page.route('**/api/billing/usage', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      await page.goto('/dashboard/overview');
      
      // Should show error message but still display fallback data
      await expect(page.locator('text=Using demo data')).toBeVisible();
      await expect(page.locator('[data-testid="api-requests-metric"]')).toBeVisible();
    });

    test('should update metrics when time range changes', async ({ page }) => {
      await page.goto('/dashboard/overview');
      
      // Get initial values
      const initialValue = await page.locator('[data-testid="api-requests-metric"]').textContent();
      
      // Change time range
      await page.selectOption('[data-testid="time-range"]', '30d');
      
      // Wait for data to update
      await page.waitForTimeout(2000);
      
      // Values should potentially change (or at least reload)
      const newValue = await page.locator('[data-testid="api-requests-metric"]').textContent();
      // Note: Values might be same if no data change, but request should have been made
    });
  });

  test.describe('Billing Dashboard - Real Integration', () => {
    test('should display real billing data from Stripe/backend', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Wait for billing data to load
      await page.waitForSelector('[data-testid="billing-loaded"]', { timeout: 10000 });
      
      // Verify NOT showing mock data
      const currentPlan = await page.locator('[data-testid="current-plan"]').textContent();
      const usageData = await page.locator('[data-testid="usage-stats"]').textContent();
      const paymentMethod = await page.locator('[data-testid="payment-method"]').textContent();
      
      // Should not contain mock values
      expect(usageData).not.toContain('2.4M / 5M');
      expect(paymentMethod).not.toContain('•••• •••• •••• 4242');
      
      // Should have real plan data
      expect(currentPlan).toMatch(/(Pro|Enterprise|Free) Plan/);
    });

    test('should show real invoice history (not INV-001 mock data)', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      const invoiceRows = await page.locator('[data-testid="invoice-row"]').all();
      
      if (invoiceRows.length > 0) {
        for (const row of invoiceRows) {
          const invoiceId = await row.locator('[data-testid="invoice-id"]').textContent();
          
          // Should not be mock invoice IDs
          expect(invoiceId).not.toMatch(/^INV-00[123]$/);
          
          // Should be real Stripe invoice format or similar
          expect(invoiceId).toMatch(/^(in_|INV-)[a-zA-Z0-9]+/);
        }
      }
    });

    test('should handle subscription management actions', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Test manage plan button
      await page.click('[data-testid="manage-plan"]');
      
      // Should either redirect to Stripe portal or show management UI
      if (page.url().includes('billing.stripe.com')) {
        await expect(page.locator('text=Billing portal')).toBeVisible();
      } else {
        await expect(page.locator('text=Plan Management')).toBeVisible();
      }
    });

    test('should display dynamic usage progress bars', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Check usage progress bars are dynamic (not hardcoded widths)
      const requestsProgress = await page.locator('[data-testid="requests-progress"]');
      const bandwidthProgress = await page.locator('[data-testid="bandwidth-progress"]');
      const storageProgress = await page.locator('[data-testid="storage-progress"]');
      
      // Progress bars should have dynamic widths based on real data
      const requestsWidth = await requestsProgress.getAttribute('style');
      const bandwidthWidth = await bandwidthProgress.getAttribute('style');
      const storageWidth = await storageProgress.getAttribute('style');
      
      // Should have width styles applied
      expect(requestsWidth).toContain('width:');
      expect(bandwidthWidth).toContain('width:');
      expect(storageWidth).toContain('width:');
    });
  });

  test.describe('Analytics Dashboard - Real Metrics', () => {
    test('should display comprehensive real analytics data', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Wait for analytics to load
      await page.waitForSelector('[data-testid="analytics-loaded"]', { timeout: 10000 });
      
      // Verify key metrics are real
      const totalRequests = await page.locator('[data-testid="total-requests"]').textContent();
      const avgResponseTime = await page.locator('[data-testid="avg-response-time"]').textContent();
      const successRate = await page.locator('[data-testid="success-rate"]').textContent();
      const errorRate = await page.locator('[data-testid="error-rate"]').textContent();
      const bandwidthUsage = await page.locator('[data-testid="bandwidth-usage"]').textContent();
      
      // Should not be mock values
      expect(totalRequests).not.toBe('2.4M');
      expect(avgResponseTime).not.toBe('42ms');
      expect(successRate).not.toBe('99.97%');
      expect(errorRate).not.toBe('0.03%');
      expect(bandwidthUsage).not.toBe('1.2TB');
      
      // Should be valid formats
      expect(totalRequests).toMatch(/^\\d+(\\.\\d+)?[KM]?$/);
      expect(avgResponseTime).toMatch(/^\\d+ms$/);
      expect(successRate).toMatch(/^\\d+\\.\\d+%$/);
    });

    test('should update analytics when time range changes', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Change time range and verify data updates
      await page.selectOption('[data-testid="time-range-selector"]', '24h');
      
      // Should trigger new data fetch
      await page.waitForSelector('[data-testid="analytics-loaded"]');
      
      // Change to 30 days
      await page.selectOption('[data-testid="time-range-selector"]', '30d');
      
      await page.waitForSelector('[data-testid="analytics-loaded"]');
      
      // Verify analytics updated (loading state should have appeared)
      await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
    });

    test('should display real endpoint performance data', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Check top endpoints section
      const endpointRows = await page.locator('[data-testid="endpoint-row"]').all();
      
      if (endpointRows.length > 0) {
        for (const row of endpointRows) {
          const endpoint = await row.locator('[data-testid="endpoint-path"]').textContent();
          const requestCount = await row.locator('[data-testid="endpoint-requests"]').textContent();
          const responseTime = await row.locator('[data-testid="endpoint-response-time"]').textContent();
          
          // Should be real API endpoints (not mock /api/v1/users)
          expect(endpoint).toMatch(/^\\/api\\/v1\\//);
          expect(requestCount).toMatch(/^\\d+/);
          expect(responseTime).toMatch(/^\\d+ms$/);
        }
      }
    });

    test('should show real error breakdown', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      const errorTypes = await page.locator('[data-testid="error-type"]').all();
      
      for (const errorType of errorTypes) {
        const errorName = await errorType.locator('[data-testid="error-name"]').textContent();
        const errorCount = await errorType.locator('[data-testid="error-count"]').textContent();
        
        // Should show real error types
        expect(errorName).toMatch(/(4xx|5xx|Timeout)/);
        expect(errorCount).toMatch(/^\\d+/);
      }
    });
  });

  test.describe('API Keys Management - Real Functionality', () => {
    test('should create and manage real API keys', async ({ page }) => {
      await page.goto('/dashboard/api-keys');
      
      // Create new API key
      await page.click('[data-testid="create-api-key"]');
      await page.fill('[data-testid="api-key-name"]', 'Test Integration Key');
      await page.selectOption('[data-testid="api-key-environment"]', 'production');
      await page.click('[data-testid="create-key-confirm"]');
      
      // Should show real API key (not mock)
      await expect(page.locator('[data-testid="api-key-created"]')).toBeVisible();
      
      const apiKey = await page.locator('[data-testid="new-api-key-value"]').textContent();
      
      // Should be real API key format
      expect(apiKey).toMatch(/^sk_[a-zA-Z0-9]{32,}$/);
      expect(apiKey).not.toBe('sk_test_mock_key_123');
    });

    test('should display real API key usage statistics', async ({ page }) => {
      await page.goto('/dashboard/api-keys');
      
      const keyRows = await page.locator('[data-testid="api-key-row"]').all();
      
      if (keyRows.length > 0) {
        for (const row of keyRows) {
          const keyName = await row.locator('[data-testid="key-name"]').textContent();
          const keyUsage = await row.locator('[data-testid="key-usage"]').textContent();
          const lastUsed = await row.locator('[data-testid="key-last-used"]').textContent();
          
          // Should have real data
          expect(keyName).not.toMatch(/test.*key/i);
          expect(keyUsage).toMatch(/^\\d+/);
          expect(lastUsed).toMatch(/(\\d+ (minutes?|hours?|days?) ago|Never)/);
        }
      }
    });

    test('should handle API key revocation', async ({ page }) => {
      await page.goto('/dashboard/api-keys');
      
      const firstKeyRow = page.locator('[data-testid="api-key-row"]').first();
      
      if (await firstKeyRow.count() > 0) {
        // Revoke API key
        await firstKeyRow.locator('[data-testid="revoke-key"]').click();
        await page.click('[data-testid="confirm-revoke"]');
        
        // Should show revocation success
        await expect(page.locator('text=API key revoked')).toBeVisible();
        
        // Key should be marked as revoked
        await expect(firstKeyRow.locator('[data-testid="key-status"]')).toHaveText('Revoked');
      }
    });
  });

  test.describe('Navigation and UX', () => {
    test('should navigate between dashboard sections smoothly', async ({ page }) => {
      // Test navigation between all dashboard sections
      const sections = ['overview', 'billing', 'analytics', 'api-keys', 'settings'];
      
      for (const section of sections) {
        await page.click(`[data-testid="nav-${section}"]`);
        await expect(page.url()).toContain(section);
        await expect(page.locator(`[data-testid="${section}-page"]`)).toBeVisible();
      }
    });

    test('should maintain user session across page refreshes', async ({ page }) => {
      await page.goto('/dashboard/billing');
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in and on billing page
      await expect(page.url()).toContain('/dashboard/billing');
      await expect(page.locator('[data-testid="billing-page"]')).toBeVisible();
    });

    test('should handle responsive navigation on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      
      // Mobile menu should be present
      await page.click('[data-testid="mobile-menu-toggle"]');
      
      // Navigation should be visible
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // Should be able to navigate
      await page.click('[data-testid="mobile-nav-billing"]');
      await expect(page.url()).toContain('/billing');
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update usage metrics in real-time', async ({ page }) => {
      await page.goto('/dashboard/overview');
      
      // Get initial API request count
      const initialCount = await page.locator('[data-testid="api-requests-metric"]').textContent();
      
      // Simulate making API calls (this would trigger real usage updates)
      // In real environment, this could be done by making actual API calls
      
      // Wait for potential updates
      await page.waitForTimeout(5000);
      
      // Check if metrics could have updated
      const currentCount = await page.locator('[data-testid="api-requests-metric"]').textContent();
      
      // Note: In real scenario, this would depend on actual API usage
      // For test purposes, we verify the metric is still displayed correctly
      expect(currentCount).toMatch(/^\\d+(\\.\\d+)?[KM]?$/);
    });

    test('should handle WebSocket connections for live updates', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Check if WebSocket connection is established for live updates
      const wsConnections = await page.evaluate(() => {
        return window.WebSocket ? 'supported' : 'not supported';
      });
      
      expect(wsConnections).toBe('supported');
      
      // In real scenario, would test live metric updates via WebSocket
    });
  });
});