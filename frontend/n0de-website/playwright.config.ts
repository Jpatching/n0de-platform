import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60000, // 60 seconds timeout for payment flows
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  reporter: process.env.CI ? [
    ['html', { open: 'never' }],
    ['github'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ] : [
    ['html'],
    ['list']
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.VERCEL_URL || 'https://www.n0de.pro',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    extraHTTPHeaders: {
      'Accept': 'application/json, text/html',
      'User-Agent': 'N0DE-Testing-Bot/1.0'
    },
  },

  projects: [
    // Payment Flow Tests - Critical Priority
    {
      name: 'payment-flows-chrome',
      testMatch: '**/payment-flows.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      },
    },

    // Subscription Lifecycle Tests
    {
      name: 'subscription-lifecycle-chrome',
      testMatch: '**/subscription-lifecycle.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      },
    },

    // Integration Tests - Existing
    {
      name: 'integration-chrome',
      testMatch: '**/integration.test.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // User Flow Tests - Existing  
    {
      name: 'user-flows-chrome',
      testMatch: '**/user-flows.test.js',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Cross-browser testing for critical payment flows
    {
      name: 'payment-flows-firefox',
      testMatch: '**/payment-flows.spec.js',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['payment-flows-chrome'],
    },

    // Mobile payment testing
    {
      name: 'payment-flows-mobile',
      testMatch: '**/payment-flows.spec.js',
      use: { 
        ...devices['iPhone 13'],
        ignoreHTTPSErrors: true,
      },
      dependencies: ['payment-flows-chrome'],
    },

    // Safari testing for subscription flows
    {
      name: 'subscription-safari',
      testMatch: '**/subscription-lifecycle.spec.js',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['subscription-lifecycle-chrome'],
    },

    // API-only testing (headless)
    {
      name: 'api-tests',
      testMatch: '**/api-*.spec.js',
      use: {
        baseURL: process.env.RAILWAY_BACKEND_URL || 'https://n0de-backend-production-4e34.up.railway.app',
        ignoreHTTPSErrors: true,
      },
    },
  ],

  // Web server configuration for local testing
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global setup for environment validation
  globalSetup: './tests/global-setup.ts',
  
  // Global teardown for cleanup
  globalTeardown: './tests/global-teardown.ts',
});