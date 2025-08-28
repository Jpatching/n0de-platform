# 🚀 Coinbase Commerce Integration Setup

## **Production-Ready Fiat → SOL Deposit System**

This integration allows users to deposit fiat (USD) via credit/debit cards and receive SOL directly in their session vaults with a **3% service fee**.

---

## **🔧 Required Environment Variables**

Add these to your backend `.env` file:

```bash
# Coinbase Commerce API Configuration
COINBASE_COMMERCE_API_KEY=your_api_key_here
COINBASE_COMMERCE_WEBHOOK_SECRET=your_webhook_secret_here

# Frontend URL for redirects
FRONTEND_URL=https://your-domain.com
```

---

## **📋 Coinbase Commerce Account Setup**

### **1. Create Coinbase Commerce Account**
1. Go to [commerce.coinbase.com](https://commerce.coinbase.com)
2. Sign up with your business email
3. Complete business verification (required for production)

### **2. Get API Credentials**
1. Navigate to **Settings** → **API Keys**
2. Create a new API key
3. Copy the **API Key** → Set as `COINBASE_COMMERCE_API_KEY`
4. Copy the **Webhook Secret** → Set as `COINBASE_COMMERCE_WEBHOOK_SECRET`

### **3. Configure Settlement Currency**
1. Go to **Settings** → **Preferences**
2. Set **Settlement Currency** to **SOL (Solana)**
3. Add your **SOL treasury wallet address** for settlements

### **4. Set Up Webhook Endpoint**
1. Go to **Settings** → **Webhook subscriptions**
2. Add webhook URL: `https://your-api-domain.com/api/v1/payments/coinbase/webhook`
3. Subscribe to events:
   - `charge:confirmed`
   - `charge:failed` 
   - `charge:delayed`

---

## **💰 Fee Structure**

| Fee Type | Amount | Description |
|----------|--------|-------------|
| **PV3 Service Fee** | 3.0% | Our revenue from fiat deposits |
| **Coinbase Fee** | ~1% + $0.30 | Coinbase Commerce processing |
| **Total Fees** | ~4% + $0.30 | Total user pays |

**Example:**
- User pays: $100 USD
- Coinbase fee: $1.30
- PV3 service fee: $3.00
- Net for SOL: $95.70
- SOL received: ~0.4 SOL (at $240/SOL)

---

## **🔄 User Flow**

1. **User clicks "Buy SOL with Card"**
2. **Enters USD amount** ($1 - $10,000)
3. **Sees fee breakdown** and SOL estimate
4. **Clicks "Pay with Card"**
5. **Redirected to Coinbase Commerce** (new tab)
6. **Completes payment** (card/bank/crypto)
7. **Coinbase settles in SOL** to our treasury
8. **Webhook triggers** SOL deposit to user vault
9. **User sees SOL** in vault within minutes

---

## **🛡️ Security Features**

- ✅ **Webhook signature verification**
- ✅ **User session validation**
- ✅ **Wallet ownership verification**
- ✅ **Amount limits** ($1 - $10,000)
- ✅ **Payment tracking** and history
- ✅ **Error handling** and retries

---

## **🧪 Testing**

### **Sandbox Mode**
1. Use Coinbase Commerce **sandbox** environment
2. Test with fake credit cards
3. Verify webhook delivery
4. Test SOL vault deposits

### **Production Checklist**
- [ ] Business verification completed
- [ ] SOL settlement address configured
- [ ] Webhook endpoint responding
- [ ] SSL certificate valid
- [ ] Fee calculations accurate
- [ ] Error handling tested

---

## **📊 Monitoring**

### **Key Metrics to Track**
- Payment success rate
- Average deposit amount
- Fee revenue generated
- SOL settlement delays
- Webhook delivery failures

### **Logs to Monitor**
- Payment creation requests
- Webhook events received
- SOL vault deposits
- Failed transactions
- Fee calculations

---

## **🚨 Important Notes**

1. **SOL Settlement**: Coinbase must settle in SOL, not USD
2. **Webhook Security**: Always verify webhook signatures
3. **Fee Transparency**: Show exact fees before payment
4. **Compliance**: Ensure business verification for production
5. **Backup Plan**: Have manual SOL deposit process for failures

---

## **🔗 Useful Links**

- [Coinbase Commerce Docs](https://commerce.coinbase.com/docs/)
- [API Reference](https://commerce.coinbase.com/docs/api/)
- [Webhook Guide](https://commerce.coinbase.com/docs/api/#webhooks)
- [Settlement Guide](https://commerce.coinbase.com/docs/api/#settlements)

---

**Ready to launch! 🚀 Users can now deposit fiat and get SOL instantly with our 3% service fee.** 