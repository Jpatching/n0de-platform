# N0DE Platform Upgrade Flow Fix

## Issue
When users click upgrade buttons, they get the error: "Plan upgrades require payment verification. Use /upgrade/checkout endpoint"

## Root Cause
The backend's `/api/v1/subscriptions/upgrade` endpoint intentionally blocks direct upgrades for security. All upgrades must go through the payment verification flow.

## Solution

### 1. Ensure all upgrade buttons redirect to checkout
All upgrade buttons should redirect to `/checkout?plan=PLANNAME` instead of calling API directly.

### 2. The checkout page should:
- Call `/api/v1/payments/subscription/upgrade/checkout` 
- Receive a checkout URL
- Redirect to Stripe payment page

### 3. API Flow
```javascript
// Correct flow
const handleUpgrade = async (planType) => {
  // Option 1: Redirect to checkout page
  router.push(`/checkout?plan=${planType}`);
  
  // Option 2: Call checkout API directly
  const result = await api.post('/payments/subscription/upgrade/checkout', {
    planType
  });
  
  if (result.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
};
```

## Files to Check/Update

1. `/app/subscription/page.tsx` - Already redirects to checkout ✓
2. `/app/dashboard/billing/page.tsx` - Already uses correct endpoint ✓
3. `/app/dashboard/overview/page.tsx` - Need to verify
4. `/components/Dashboard.tsx` - Need to verify

## Testing Steps

1. Login to the platform
2. Navigate to subscription/billing page
3. Click upgrade button
4. Should redirect to checkout or Stripe
5. Complete payment
6. Verify subscription is upgraded