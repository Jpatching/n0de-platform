# Playwright MCP Quick Reference for N0DE Platform

## Setup & Configuration ✅
```bash
# Current status
cd /home/sol/n0de-deploy
claude mcp list
# ✓ playwright: npx @playwright/mcp@latest - Connected
```

## Essential Commands

### Navigation & Screenshots
```bash
browser_navigate: https://www.n0de.pro
browser_screenshot: type="png", filename="test.png", fullPage=true
browser_navigate_back:
```

### Form Interactions
```bash
browser_fill_form:
  fields:
    - name: "Email"
      type: "textbox" 
      ref: "[data-testid='email']"
      value: "user@n0de.pro"
```

### Mouse Actions
```bash
browser_mouse_click_xy: element="Login Button", x=400, y=200
browser_mouse_move_xy: element="Menu", x=100, y=50
```

## N0DE Platform Specific Tests

### 🔐 Authentication Quick Test
```bash
browser_navigate: https://www.n0de.pro
# Click Google OAuth → Test redirect → Verify callback
```

### 💳 Payment Quick Test  
```bash
browser_navigate: https://www.n0de.pro/checkout?plan=STARTER
# Fill Stripe form → Test card 4242424242424242 → Submit
```

### 📊 Dashboard Quick Test
```bash
browser_navigate: https://www.n0de.pro/dashboard/analytics
# Wait for charts → Take screenshot → Verify metrics
```

### 🔑 API Key Quick Test
```bash
browser_navigate: https://www.n0de.pro/dashboard/api-keys
# Create new key → Copy value → Test in playground
```

## Optimal Configuration for N0DE Testing
```bash
npx @playwright/mcp@latest \
  --headless \
  --no-sandbox \
  --viewport-size "1920,1080" \
  --isolated \
  --ignore-https-errors
```

## Key URLs for Testing
- **Homepage**: https://www.n0de.pro
- **Auth Callback**: https://www.n0de.pro/auth/callback  
- **Checkout**: https://www.n0de.pro/checkout
- **Dashboard**: https://www.n0de.pro/dashboard
- **Analytics**: https://www.n0de.pro/dashboard/analytics
- **Billing**: https://www.n0de.pro/dashboard/billing
- **API Keys**: https://www.n0de.pro/dashboard/api-keys
- **Playground**: https://www.n0de.pro/dashboard/playground

## Test Data
- **Test Email**: test@n0de.pro
- **Stripe Test Card**: 4242424242424242
- **Expiry**: 12/28, CVC: 123
- **Test Plans**: STARTER ($49), PROFESSIONAL ($299)

## Common Selectors
```css
[data-testid='email-input']
[data-testid='sign-in-google']
[data-testid='sign-in-github'] 
[data-testid='checkout-form']
[data-testid='api-key-create']
[data-testid='rpc-playground']
```

## Troubleshooting
- **No MCP tools**: Check `claude mcp list`, restart if needed
- **Network errors**: Add `--ignore-https-errors` 
- **Element not found**: Use accessibility tree inspection
- **Performance**: Use `--isolated` for clean sessions

## Success Indicators
✅ OAuth redirects work (Google/GitHub)  
✅ Payment forms submit successfully  
✅ Dashboard loads with user data  
✅ API calls return valid responses  
✅ WebSocket connections establish  
✅ Screenshots capture correctly  

The Playwright MCP setup is now optimized for comprehensive N0DE platform testing in this headless server environment!