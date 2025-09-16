# N0DE Domain DNS Configuration Guide

## Current Status ✅

- **n0de.pro**: Working perfectly (HTTP 200)
- **www.n0de.pro**: Redirecting to n0de.pro (HTTP 307)
- **api.n0de.pro**: Working for backend API

## Issue Analysis

The redirect is happening because:
1. Vercel is configured with "Third Party" nameservers (Porkbun)
2. Your DNS is likely set up to redirect www → non-www
3. This is actually **standard practice** for most websites

## Recommended Solution (Option 1) 🎯

**Accept the redirect** - this is the correct, professional setup!

### What to do:
1. Keep the current setup (it's working correctly!)
2. Update any hardcoded `www.n0de.pro` URLs in your code to use `n0de.pro`
3. Your payment flows will work perfectly

### Benefits:
- ✅ SEO-friendly (canonical domain)
- ✅ Professional standard
- ✅ No DNS changes needed
- ✅ Faster loading (no extra redirect for most users)

## Alternative Solution (Option 2) ⚙️

**Make both domains serve content without redirects**

### DNS Records for Porkbun:

```
# For n0de.pro (root domain)
Type: A
Host: @
Answer: 76.76.19.61
TTL: 300

# For www.n0de.pro (subdomain)
Type: A  
Host: www
Answer: 76.76.19.61
TTL: 300

# For api.n0de.pro (backend)
Type: A
Host: api
Answer: [YOUR_SERVER_IP]
TTL: 300
```

### Steps to implement:
1. Login to Porkbun dashboard
2. Go to DNS Management for n0de.pro
3. Update/add the A records above
4. Wait 5-10 minutes for DNS propagation
5. Test both domains

## Testing Your Fix

Run this command to test:
```bash
# Test the domains
curl -I https://n0de.pro
curl -I https://www.n0de.pro

# Test payment pages
curl -I https://n0de.pro/subscription
curl -I https://n0de.pro/payment/success
curl -I https://n0de.pro/payment/cancel
```

## Payment System Integration

### Current Working URLs:
- ✅ Frontend: `https://n0de.pro`
- ✅ API: `https://api.n0de.pro`
- ✅ Subscription: `https://n0de.pro/subscription`
- ✅ Payment Success: `https://n0de.pro/payment/success`
- ✅ Payment Cancel: `https://n0de.pro/payment/cancel`

### Update these in your payment provider settings:
- **Stripe**: Success URL = `https://n0de.pro/payment/success`
- **Coinbase**: Redirect URL = `https://n0de.pro/payment/success`
- **NOWPayments**: Success URL = `https://n0de.pro/payment/success`

## Verification Checklist

After implementing your chosen solution:

- [ ] `https://n0de.pro` loads without redirect
- [ ] `https://www.n0de.pro` behaves as expected
- [ ] `https://api.n0de.pro/health` returns 200
- [ ] Payment flows work end-to-end
- [ ] No redirect loops in payment process

## Recommendation 💡

**Go with Option 1** (accept the redirect). This is:
- The industry standard
- SEO-friendly
- Requires no DNS changes
- Professional practice

Just update your payment provider URLs to use `n0de.pro` instead of `www.n0de.pro` and you'll be golden!