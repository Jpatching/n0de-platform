# N0DE Payment System Testing Guide

## Quick Start Testing

### 1. Browser Testing (Easiest Method)

#### Test Stripe Payment:
1. Open your browser and go to: https://www.n0de.pro/checkout?plan=STARTER
2. Login with your account (or create a test account)
3. Click "Pay with Card" 
4. Use test card: `4242 4242 4242 4242`
5. Expiry: Any future date (e.g., 12/25)
6. CVC: Any 3 digits (e.g., 123)
7. Complete payment

#### Direct Stripe Test Links:
- **Starter Plan ($49)**: https://buy.stripe.com/test_4gM4gzflZ8Xt2n1epr5Rm00
- **Test Checkout Session**: Use the link from running `node scripts/test-payment-flow.js`

### 2. Database Monitoring

Open a terminal and monitor payment records in real-time:

```bash
# Watch for new payments
watch -n 2 'psql -U postgres -d n0de_production -h localhost -c "SELECT id, status, amount, provider, \"createdAt\" FROM payments ORDER BY \"createdAt\" DESC LIMIT 5;"'

# Monitor webhook events
watch -n 2 'psql -U postgres -d n0de_production -h localhost -c "SELECT id, provider, \"eventType\", processed, \"createdAt\" FROM webhook_events ORDER BY \"createdAt\" DESC LIMIT 5;"'

# Check subscription updates
psql -U postgres -d n0de_production -h localhost -c "SELECT * FROM subscriptions ORDER BY \"updatedAt\" DESC LIMIT 5;"
```

### 3. Backend Logs Monitoring

In another terminal, watch the backend logs:

```bash
# Watch live logs
pm2 logs n0de-backend --lines 50

# Or filter for payment-related logs
pm2 logs n0de-backend | grep -i "payment\|stripe\|webhook"
```

### 4. API Testing with cURL

First, get a JWT token (if you have a test user):

```bash
# Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@n0de.pro","password":"testpassword"}' \
  | jq -r '.access_token')

# Create a Stripe checkout session
curl -X POST http://localhost:4000/api/v1/payments/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "plan": "STARTER",
    "provider": "STRIPE"
  }'
```

### 5. Webhook Testing with Stripe CLI

Install Stripe CLI if not already installed:

```bash
# Download and install Stripe CLI
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

# Login to Stripe
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:4000/api/v1/payments/webhooks/stripe
```

### 6. Automated Testing Scripts

```bash
# Run health check
node /home/sol/n0de-deploy/scripts/payment-health-check.js

# Run payment flow test
node /home/sol/n0de-deploy/scripts/test-payment-flow.js
```

## Verification Checklist

### Frontend Verification:
- [ ] Checkout page loads at `/checkout`
- [ ] Payment methods display correctly
- [ ] Plan selection works
- [ ] Payment redirects to provider
- [ ] Success page shows after payment
- [ ] Dashboard shows updated subscription

### Backend Verification:
- [ ] API endpoint `/api/v1/payments/create-checkout` responds
- [ ] Payment record created in database
- [ ] Webhook endpoint receives events
- [ ] Webhook signature validates
- [ ] Payment status updates correctly
- [ ] Subscription activates after payment

### Database Verification:
- [ ] `payments` table has new record
- [ ] `webhook_events` table logs event
- [ ] `subscriptions` table updates
- [ ] `payment_history` tracks transaction
- [ ] User's plan upgrades

## Test Payment Credentials

### Stripe Test Cards:
- **Success**: 4242 4242 4242 4242
- **Requires Auth**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 9995

### Coinbase Commerce:
- Use sandbox mode for testing
- Any valid email works

### NOWPayments:
- Use sandbox API for testing
- Test with small amounts

## Troubleshooting

### Common Issues:

1. **Webhook Not Received**:
   - Check if backend is running: `pm2 status`
   - Verify webhook URL is accessible
   - Check webhook secret matches

2. **Payment Not Tracked**:
   - Check database connection: `psql -U postgres -d n0de_production -c "SELECT 1;"`
   - Verify payment service is configured
   - Check backend logs for errors

3. **Subscription Not Activated**:
   - Verify webhook processed successfully
   - Check subscription service logic
   - Ensure user ID matches

## SQL Queries for Verification

```sql
-- Check recent payments
SELECT 
  id,
  "userId",
  provider,
  status,
  amount,
  "planType",
  "createdAt"
FROM payments
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check webhook processing
SELECT 
  id,
  provider,
  "eventType",
  processed,
  "errorMessage",
  "createdAt"
FROM webhook_events
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;

-- Check user subscriptions
SELECT 
  u.email,
  s.type,
  s.status,
  s."startDate",
  s."endDate",
  s."updatedAt"
FROM subscriptions s
JOIN users u ON s."userId" = u.id
ORDER BY s."updatedAt" DESC
LIMIT 10;

-- Check payment history
SELECT 
  ph.*,
  u.email
FROM payment_history ph
JOIN users u ON ph."userId" = u.id
ORDER BY ph."createdAt" DESC
LIMIT 10;
```

## Live Testing URLs

- **Frontend**: https://www.n0de.pro
- **Checkout**: https://www.n0de.pro/checkout?plan=STARTER
- **Dashboard**: https://www.n0de.pro/dashboard/billing
- **API Health**: http://localhost:4000/health

## Support

If payments are not working:
1. Check backend logs: `pm2 logs n0de-backend`
2. Run health check: `node scripts/payment-health-check.js`
3. Verify environment variables in `/backend/.env`
4. Check database connectivity
5. Ensure Nginx is routing correctly to backend