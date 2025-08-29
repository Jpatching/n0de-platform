# N0DE Platform - Playwright MCP Testing Guide

## Overview
This guide provides comprehensive testing scenarios for the N0DE platform using Microsoft's Playwright MCP server. The tests are designed for headless server environments and use accessibility tree parsing for deterministic, fast testing.

## Playwright MCP Configuration

### Optimal Settings for Headless Server Environment
```bash
# Configure Playwright MCP with optimal settings for server
npx @playwright/mcp@latest \
  --headless \
  --no-sandbox \
  --viewport-size "1920,1080" \
  --isolated \
  --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
```

### Available Playwright MCP Tools
- **`browser_navigate`** - Navigate to URLs with accessibility snapshots
- **`browser_fill_form`** - Fill forms (textbox, checkbox, radio, combobox, slider)
- **`browser_mouse_click_xy`** - Click at specific coordinates
- **`browser_mouse_move_xy`** - Move mouse to coordinates
- **`browser_screenshot`** - Take full page or element screenshots
- **`browser_navigate_back`** - Go back to previous page
- **`browser_wait`** - Wait for elements or conditions

## Phase 1: Authentication Flow Testing

### 1.1 Google OAuth Flow Test
```bash
# Step 1: Navigate to N0DE homepage
browser_navigate: https://www.n0de.pro

# Step 2: Take screenshot for verification
browser_screenshot: 
  type: "png"
  filename: "n0de-homepage.png"
  fullPage: true

# Step 3: Click "Sign in with Google" button
browser_fill_form:
  fields: []  # Use if form fields are present

# Step 4: Verify redirect to Google OAuth
# Expected: URL should contain "accounts.google.com"

# Step 5: Test OAuth callback
# Expected: Redirect back to https://www.n0de.pro/auth/callback
```

### 1.2 GitHub OAuth Flow Test
```bash
# Step 1: Navigate to N0DE login
browser_navigate: https://www.n0de.pro

# Step 2: Click "Sign in with GitHub"
# Step 3: Verify redirect to GitHub OAuth
# Expected: URL should contain "github.com/login/oauth"

# Step 4: Test OAuth callback
# Expected: Redirect back to N0DE with auth token
```

### 1.3 Session Management Test
```bash
# Test login persistence
# Navigate to dashboard after login
browser_navigate: https://www.n0de.pro/dashboard

# Verify authenticated user state
# Take screenshot to confirm dashboard access
browser_screenshot:
  type: "png"
  filename: "dashboard-authenticated.png"
```

## Phase 2: Payment Flow Testing

### 2.1 Stripe Checkout Flow - STARTER Plan ($49)
```bash
# Step 1: Navigate to pricing/checkout
browser_navigate: https://www.n0de.pro/checkout?plan=STARTER

# Step 2: Take screenshot of checkout page
browser_screenshot:
  type: "png"
  filename: "checkout-starter-plan.png"
  fullPage: true

# Step 3: Fill payment form
browser_fill_form:
  fields:
    - name: "Email"
      type: "textbox"
      ref: "[data-testid='email-input']"
      value: "test@n0de.pro"
    - name: "Card Number"
      type: "textbox"
      ref: "[data-testid='card-number']"
      value: "4242424242424242"  # Test card
    - name: "Expiry"
      type: "textbox"
      ref: "[data-testid='card-expiry']"
      value: "12/28"
    - name: "CVC"
      type: "textbox"
      ref: "[data-testid='card-cvc']"
      value: "123"

# Step 4: Submit payment form
# Expected: Redirect to success page or dashboard
```

### 2.2 PROFESSIONAL Plan ($299) Test
```bash
# Same flow as above but with PROFESSIONAL plan
browser_navigate: https://www.n0de.pro/checkout?plan=PROFESSIONAL

# Verify plan details and pricing display
browser_screenshot:
  type: "png"
  filename: "checkout-professional-plan.png"
```

## Phase 3: Dashboard Functionality Testing

### 3.1 Analytics Page Test
```bash
# Navigate to analytics dashboard
browser_navigate: https://www.n0de.pro/dashboard/analytics

# Wait for metrics to load
browser_wait: 
  selector: "[data-testid='metrics-chart']"
  timeout: 5000

# Take screenshot of loaded analytics
browser_screenshot:
  type: "png"
  filename: "dashboard-analytics.png"
  fullPage: true

# Test metric interactions
browser_mouse_click_xy:
  element: "Time range selector"
  x: 800
  y: 200
```

### 3.2 API Keys Management Test
```bash
# Navigate to API keys page
browser_navigate: https://www.n0de.pro/dashboard/api-keys

# Test API key generation
browser_fill_form:
  fields:
    - name: "API Key Name"
      type: "textbox"
      ref: "[data-testid='api-key-name']"
      value: "Test API Key"
    - name: "Permissions"
      type: "checkbox"
      ref: "[data-testid='read-permission']"
      value: "true"

# Submit form to create API key
# Verify key is generated and displayed
```

### 3.3 Billing Page Test
```bash
# Navigate to billing page
browser_navigate: https://www.n0de.pro/dashboard/billing

# Verify subscription status display
browser_screenshot:
  type: "png"
  filename: "dashboard-billing.png"

# Test usage metrics display
# Verify invoice access
# Test payment method management
```

## Phase 4: API Integration Testing

### 4.1 RPC Playground Test
```bash
# Navigate to playground
browser_navigate: https://www.n0de.pro/dashboard/playground

# Test RPC call interface
browser_fill_form:
  fields:
    - name: "RPC Method"
      type: "combobox"
      ref: "[data-testid='rpc-method-select']"
      value: "getAccountInfo"
    - name: "Parameters"
      type: "textbox"
      ref: "[data-testid='rpc-params']"
      value: '{"pubkey": "11111111111111111111111111111112"}'

# Submit RPC call
# Verify response display
browser_screenshot:
  type: "png"
  filename: "rpc-playground-response.png"
```

### 4.2 WebSocket Connection Test
```bash
# Navigate to live metrics page
browser_navigate: https://www.n0de.pro/dashboard/overview

# Wait for WebSocket connection to establish
browser_wait:
  selector: "[data-testid='live-metrics']"
  timeout: 3000

# Verify real-time updates
# Take screenshot showing live data
browser_screenshot:
  type: "png"
  filename: "websocket-live-metrics.png"
```

## Phase 5: Cross-Browser Testing

### 5.1 Browser Engine Testing
```bash
# Test with different engines:
# - Chromium (default)
# - Firefox: --browser firefox
# - WebKit: --browser webkit

# Run same test suites across all browsers
# Compare screenshots for consistency
```

### 5.2 Mobile Viewport Testing
```bash
# Test mobile responsiveness
npx @playwright/mcp@latest \
  --viewport-size "375,667" \
  --device "iPhone 15"

# Run key user flows on mobile viewports
```

## Phase 6: Performance & Error Testing

### 6.1 Page Load Performance
```bash
# Measure navigation time
browser_navigate: https://www.n0de.pro
# Note: MCP tools can measure page load completion

# Test with slow network conditions
# Verify loading states and spinners
```

### 6.2 Error Handling Test
```bash
# Test 404 page
browser_navigate: https://www.n0de.pro/nonexistent-page

# Test API error handling
# Navigate to dashboard without authentication
browser_navigate: https://www.n0de.pro/dashboard
# Should redirect to login

# Test payment failures
# Use declined test card: 4000000000000002
```

## Usage Examples

### Complete User Journey Test
```bash
# 1. Homepage → Signup → Payment → Dashboard
browser_navigate: https://www.n0de.pro
browser_screenshot: type="png", filename="step-1-homepage.png"

# 2. Sign up with Google OAuth
# Click sign up button, follow OAuth flow

# 3. Complete subscription
browser_navigate: https://www.n0de.pro/checkout?plan=STARTER
# Fill payment form, submit

# 4. Access dashboard features
browser_navigate: https://www.n0de.pro/dashboard
browser_screenshot: type="png", filename="step-4-dashboard.png"

# 5. Create API key and test RPC call
browser_navigate: https://www.n0de.pro/dashboard/playground
# Generate key, test RPC call

# 6. Verify billing and usage tracking
browser_navigate: https://www.n0de.pro/dashboard/billing
browser_screenshot: type="png", filename="step-6-billing.png"
```

### Automated Test Execution
```bash
# Run comprehensive test suite
# 1. Execute authentication tests
# 2. Run payment flow tests
# 3. Verify dashboard functionality
# 4. Test API integrations
# 5. Generate test report with screenshots
```

## Best Practices

1. **Use Headless Mode**: Always run with `--headless` for server environments
2. **Isolated Sessions**: Use `--isolated` to prevent state persistence
3. **Accessibility First**: Leverage accessibility tree for reliable element selection
4. **Screenshot Verification**: Take screenshots at key points for visual verification
5. **Error Handling**: Test both success and failure scenarios
6. **Performance Testing**: Monitor page load times and API response times
7. **Cross-Browser**: Test on Chromium, Firefox, and WebKit engines

## Troubleshooting

- **MCP Connection Issues**: Verify server is running with `claude mcp list`
- **Element Selection**: Use accessibility-based selectors when possible
- **Network Issues**: Configure proxy settings if behind corporate firewall
- **Permissions**: Ensure `--no-sandbox` for containerized environments

This guide provides a comprehensive framework for testing the N0DE platform using Playwright MCP tools effectively in a headless server environment.