# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for your n0de RPC service.

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete your account verification
3. Navigate to the Dashboard

## 2. Get API Keys

### Test Mode (Development)
1. In your Stripe Dashboard, ensure "Test mode" is ON (toggle in left sidebar)
2. Go to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key**: `pk_test_...` (for frontend)
   - **Secret key**: `sk_test_...` (for backend)

### Live Mode (Production)
1. Complete Stripe account activation
2. Switch to "Live mode" 
3. Get your live keys:
   - **Publishable key**: `pk_live_...`
   - **Secret key**: `sk_live_...`

## 3. Environment Variables

Add these to your backend `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 4. Configure Webhooks

### Create Webhook Endpoint
1. In Stripe Dashboard: **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-backend-domain.com/api/v1/payments/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`

### Get Webhook Secret
1. After creating the webhook, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add it to your `STRIPE_WEBHOOK_SECRET` environment variable

## 5. Test the Integration

### Using Test Cards
Stripe provides test card numbers:

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000000000003220`

Use any future expiry date and any 3-digit CVC.

### Test Flow
1. Go to your checkout page
2. Select "Credit Card" payment method
3. Click "Secure Checkout"
4. Use test card: `4242424242424242`
5. Complete payment
6. Verify webhook received and subscription activated

## 6. Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint URL to production
- [ ] Test with real card (small amount)
- [ ] Verify webhook signature validation
- [ ] Test subscription flows
- [ ] Monitor Stripe Dashboard for payments

## 7. Supported Features

✅ **One-time payments**
✅ **Recurring subscriptions** 
✅ **Webhook verification**
✅ **Multiple currencies** (USD, EUR, GBP, etc.)
✅ **3D Secure authentication**
✅ **Mobile-friendly checkout**

## 8. API Endpoints

### Create Payment
```bash
POST /api/v1/payments
{
  "provider": "STRIPE",
  "planType": "STARTER",
  "amount": 49,
  "currency": "USD"
}
```

### Webhook Handler
```bash
POST /api/v1/payments/webhooks/stripe
# Handled automatically by Stripe
```

## 9. Troubleshooting

### Common Issues

**"Invalid API Key"**
- Check your `STRIPE_SECRET_KEY` is correct
- Ensure you're using the right mode (test vs live)

**"Webhook signature verification failed"**
- Verify `STRIPE_WEBHOOK_SECRET` matches your webhook
- Check webhook endpoint URL is correct

**"Payment not completing"**
- Check webhook events are being received
- Verify webhook endpoint is accessible (not blocked by firewall)

### Logs
Check your application logs for Stripe-related errors:
```bash
# Backend logs
tail -f logs/stripe.log

# Railway logs (if using Railway)
railway logs
```

## 10. Security Best Practices

- Never expose secret keys in frontend code
- Use webhook signatures to verify authenticity
- Validate all payment amounts server-side
- Log all payment events for audit trail
- Use HTTPS for all payment endpoints
- Implement proper error handling

---

Need help? Check the [Stripe Documentation](https://stripe.com/docs) or contact support.