# Railway Backend Environment Variables Configuration

## 🚨 **CRITICAL: Set These in Railway Dashboard**

### **Step 1: Access Railway Variables**
1. Go to [Railway Dashboard](https://railway.app)
2. Navigate to your n0de-backend-production project
3. Click on **Variables** tab
4. Add/Update the following environment variables:

### **Step 2: Core Application Settings**
```bash
# Node Environment
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=<your_postgres_connection_string>
REDIS_URL=<your_redis_connection_string>

# Frontend Configuration
FRONTEND_URL=https://n0de.pro
CORS_ORIGIN=https://n0de.pro,https://n0de-website-oil2qn97u-jpatchings-projects.vercel.app
```

### **Step 3: OAuth Configuration - CRITICAL FIX**
```bash
# Google OAuth - CURRENT CLIENT ID: 562429757888-af5gje3397ue5c72tn5dkv0f6q8rk.apps.googleusercontent.com
GOOGLE_CLIENT_ID=562429757888-af5gje3397ue5c72tn5dkv0f6q8rk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GOOGLE_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback

# GitHub OAuth - CURRENT CLIENT ID: Ov23liiMzWVaA2FznWex  
GITHUB_CLIENT_ID=Ov23liiMzWVaA2FznWex
GITHUB_CLIENT_SECRET=<your_github_client_secret>
GITHUB_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback

# OAuth Base URLs
OAUTH_SUCCESS_REDIRECT=https://n0de.pro/auth/callback
OAUTH_FAILURE_REDIRECT=https://n0de.pro?auth=error
```

### **Step 4: JWT & Session Configuration**
```bash
# JWT Configuration
JWT_SECRET=<your_jwt_secret_key>
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=<your_jwt_refresh_secret>
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration  
SESSION_SECRET=<your_session_secret>
COOKIE_DOMAIN=.n0de.pro
```

### **Step 5: Payment Gateway Configuration**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>

# Coinbase Commerce
COINBASE_API_KEY=<your_coinbase_api_key>
COINBASE_WEBHOOK_SECRET=<your_coinbase_webhook_secret>

# NowPayments
NOWPAYMENTS_API_KEY=<your_nowpayments_api_key>
NOWPAYMENTS_IPN_SECRET=<your_nowpayments_ipn_secret>
```

### **Step 6: Application Features**
```bash
# RPC Configuration
SOLANA_MAINNET_RPC=<your_solana_mainnet_rpc>
SOLANA_DEVNET_RPC=<your_solana_devnet_rpc>
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Email Configuration (if using)
SMTP_HOST=<your_smtp_host>
SMTP_PORT=587
SMTP_USER=<your_smtp_user>
SMTP_PASS=<your_smtp_password>
FROM_EMAIL=noreply@n0de.pro

# Monitoring & Logging
SENTRY_DSN=<your_sentry_dsn>
LOG_LEVEL=info
```

## 🔄 **After Setting Variables**

### **Step 7: Redeploy Backend**
1. In Railway Dashboard, click **Deploy**
2. Wait for deployment to complete
3. Check logs for any errors

### **Step 8: Verify Configuration**
Test the updated OAuth endpoints:

```bash
# Should redirect to Google with correct callback
curl -I https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google

# Should redirect to GitHub with correct callback  
curl -I https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github
```

## ✅ **Success Indicators**

After setting these variables, you should see:
- OAuth redirects use production backend URLs (not localhost)
- CORS allows requests from n0de.pro
- JWT tokens work with production domain
- Payment webhooks resolve correctly

## 🚨 **Security Notes**

- **NEVER** commit secrets to git
- Use strong, unique values for all secrets
- Rotate keys regularly
- Enable 2FA on all OAuth providers
- Set up monitoring for failed auth attempts

---

**Priority:** Set OAuth redirect URIs first - they're blocking authentication entirely!