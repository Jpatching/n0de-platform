/**
 * N0DE Platform - User Registration Flow Test
 * Tests complete user registration process with email verification
 */

const { test, expect } = require('@playwright/test');

test.describe('User Registration Flow', () => {
  const testUser = {
    email: `test+${Date.now()}@n0de.test`,
    password: 'TestPassword123!',
    name: 'Test User',
    company: 'N0DE Test Co'
  };

  test('should complete full registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/');
    await page.click('text=Get Started');
    
    // Fill registration form
    await page.fill('[placeholder="your@email.com"]', testUser.email);
    await page.fill('[placeholder="Enter your password"]', testUser.password);
    await page.fill('[placeholder="Confirm your password"]', testUser.password);
    await page.fill('[placeholder="Your Name"]', testUser.name);
    await page.fill('[placeholder="Company (Optional)"]', testUser.company);
    
    // Accept terms and submit
    await page.check('[type="checkbox"]');
    await page.click('text=Create Account');
    
    // Verify registration success
    await expect(page.locator('text=Account Created')).toBeVisible();
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should handle registration validation errors', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    
    // Try to submit empty form
    await page.click('text=Create Account');
    
    // Verify validation messages appear
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    
    // Test weak password
    await page.fill('[placeholder="your@email.com"]', testUser.email);
    await page.fill('[placeholder="Enter your password"]', '123');
    
    // Verify password strength indicator
    await expect(page.locator('text=Password too weak')).toBeVisible();
    
    // Test strong password
    await page.fill('[placeholder="Enter your password"]', testUser.password);
    await expect(page.locator('text=Password strength: Strong')).toBeVisible();
  });

  test('should redirect to dashboard after email verification', async ({ page }) => {
    // Simulate email verification link click
    await page.goto('/auth/verify?token=mock-verification-token');
    
    // Should redirect to dashboard
    await expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=Welcome to N0DE')).toBeVisible();
  });

  test('should handle duplicate email registration', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    
    // Try to register with existing email
    await page.fill('[placeholder="your@email.com"]', 'existing@n0de.pro');
    await page.fill('[placeholder="Enter your password"]', testUser.password);
    await page.fill('[placeholder="Confirm your password"]', testUser.password);
    
    await page.click('text=Create Account');
    
    // Verify error message
    await expect(page.locator('text=Email already registered')).toBeVisible();
  });
});

test.describe('OAuth Registration', () => {
  test('should handle GitHub OAuth registration', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    
    // Click GitHub OAuth button
    await page.click('[data-testid="github-oauth"]');
    
    // Should redirect to GitHub (in test environment, mock this)
    // In real tests, this would need GitHub OAuth mocking
    await expect(page.url()).toContain('github.com/login/oauth');
  });

  test('should handle Google OAuth registration', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    
    // Click Google OAuth button
    await page.click('[data-testid="google-oauth"]');
    
    // Should redirect to Google OAuth
    await expect(page.url()).toContain('accounts.google.com');
  });
});