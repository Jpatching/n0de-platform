# 🔑 N0DE Platform - CLI Deployment Keys Guide

**Get all required API keys and tokens using CLI commands for complete GitHub Actions setup.**

## 🚂 Railway Deployment Keys

### 1. Install Railway CLI
```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Alternative: Using curl
curl -fsSL https://railway.app/install.sh | sh
```

### 2. Get Railway Token
```bash
# Login to Railway (opens browser for authentication)
railway login

# Get your authentication token
railway whoami --json | jq -r '.token'
# ↑ This is your RAILWAY_TOKEN for GitHub Secrets
```

### 3. Get Railway Service ID
```bash
# Navigate to your project directory
cd /path/to/n0de-deploy

# Link to existing Railway project (if not already linked)
railway link

# Get service information
railway status --json | jq -r '.service.id'
# ↑ This is your RAILWAY_SERVICE_ID for GitHub Secrets

# Alternative: List all services
railway service list --json | jq -r '.[] | "\(.name): \(.id)"'
```

### 4. Set Railway Environment Variables (Optional)
```bash
# Set environment variables directly via CLI
railway variables set JWT_SECRET="your-super-secure-jwt-key"
railway variables set NODE_ENV="production"
railway variables set STRIPE_SECRET_KEY="your-stripe-key"

# List all current variables
railway variables
```

## 🌐 Vercel Deployment Keys

### 1. Install Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Alternative: Using npm exec
npx vercel --version
```

### 2. Get Vercel Token
```bash
# Method 1: Login and get token interactively
vercel login
# After login, create token at: https://vercel.com/account/tokens

# Method 2: Create token directly in dashboard
# Go to: https://vercel.com/account/tokens
# Create new token → Copy the token
# ↑ This is your VERCEL_TOKEN for GitHub Secrets
```

### 3. Get Vercel Organization ID
```bash
# Get your team/organization ID
vercel teams list --json | jq -r '.teams[] | "\(.name): \(.id)"'

# Or for personal account
vercel whoami --json | jq -r '.user.id'
# ↑ This is your VERCEL_ORG_ID for GitHub Secrets
```

### 4. Get Vercel Project IDs
```bash
# List all projects with their IDs
vercel projects list --json | jq -r '.[] | "\(.name): \(.id)"'

# Get specific project ID by name
vercel projects list --json | jq -r '.[] | select(.name=="n0de-website") | .id'
# ↑ This is your VERCEL_PROJECT_ID_MAIN

vercel projects list --json | jq -r '.[] | select(.name=="admin-dashboard") | .id'  
# ↑ This is your VERCEL_PROJECT_ID_ADMIN
```

### 5. Link Local Projects (If Needed)
```bash
# Link main website
cd frontend/n0de-website
vercel link
# Choose existing project or create new one

# Link admin dashboard  
cd ../admin-dashboard
vercel link
# Choose existing project or create new one
```

## 💳 Payment Provider Keys (Sandbox/Test Only)

### 🔵 Stripe Keys

#### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux/Windows
# Download from: https://github.com/stripe/stripe-cli/releases
```

#### Get Stripe Keys
```bash
# Login to Stripe
stripe login

# Get your test keys
stripe config --list
# Shows: test_mode_api_key (starts with sk_test_)
# ↑ This is your STRIPE_TEST_SECRET_KEY for GitHub Secrets

# Get webhook signing secret (after creating webhook endpoint)
stripe listen --print-secret
# ↑ This is your STRIPE_TEST_WEBHOOK_SECRET for GitHub Secrets
```

#### Create Stripe Webhook Endpoint
```bash
# Create webhook endpoint pointing to your Railway backend
stripe webhooks create \
  --url "https://n0de-backend-production-4e34.up.railway.app/api/payments/stripe/webhook" \
  --events "payment_intent.succeeded,invoice.payment_succeeded,customer.subscription.updated"
```

### 🟡 Coinbase Commerce Keys

**Note: Coinbase Commerce doesn't have CLI - use dashboard method:**

1. **Go to:** [Coinbase Commerce Dashboard](https://commerce.coinbase.com/)
2. **Navigate to:** Settings → API Keys  
3. **Create new API key** (sandbox/test mode)
4. **Copy the API key** → This is your `COINBASE_TEST_API_KEY`
5. **Create webhook endpoint:**
   - URL: `https://n0de-backend-production-4e34.up.railway.app/api/payments/coinbase/webhook`
   - Copy webhook secret → This is your `COINBASE_TEST_WEBHOOK_SECRET`

### 🟢 NOWPayments Keys

**Note: NOWPayments doesn't have CLI - use dashboard method:**

1. **Go to:** [NOWPayments Dashboard](https://nowpayments.io/)
2. **Navigate to:** Account → API Keys
3. **Copy sandbox API key** → This is your `NOWPAYMENTS_TEST_API_KEY`
4. **Navigate to:** Account → IPN Settings
5. **Set IPN URL:** `https://n0de-backend-production-4e34.up.railway.app/api/payments/nowpayments/webhook`
6. **Copy IPN secret** → This is your `NOWPAYMENTS_TEST_IPN_SECRET`

## ⚙️ GitHub Secrets Setup

### Add All Secrets to GitHub Repository

1. **Go to your GitHub repository**
2. **Click:** Settings → Secrets and variables → Actions
3. **Click:** "New repository secret"
4. **Add these secrets one by one:**

```bash
# Railway Deployment
RAILWAY_TOKEN=rw_xxx_your_token_here
RAILWAY_SERVICE_ID=your-service-id-here

# Vercel Deployment  
VERCEL_TOKEN=your-vercel-token-here
VERCEL_ORG_ID=your-org-id-here
VERCEL_PROJECT_ID_MAIN=your-main-project-id
VERCEL_PROJECT_ID_ADMIN=your-admin-project-id

# Payment Providers (TEST KEYS ONLY)
STRIPE_TEST_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_TEST_WEBHOOK_SECRET=whsec_your_webhook_secret
COINBASE_TEST_API_KEY=your_coinbase_test_key
COINBASE_TEST_WEBHOOK_SECRET=your_coinbase_webhook_secret
NOWPAYMENTS_TEST_API_KEY=your_nowpayments_test_key
NOWPAYMENTS_TEST_IPN_SECRET=your_nowpayments_ipn_secret

# Optional: Health monitoring alerts
HEALTH_ALERT_WEBHOOK=https://hooks.slack.com/your/webhook/url
```

## 🔄 Workflow Approach vs Incremental

### ✅ **Recommended: Use GitHub Actions Workflows**

**Advantages:**
- ✅ **Automated testing** prevents broken deployments  
- ✅ **Simultaneous deployment** reduces downtime
- ✅ **Payment validation** catches issues before users see them
- ✅ **Environment synchronization** prevents configuration drift
- ✅ **24/7 monitoring** with automatic alerts
- ✅ **Rollback capability** if issues are detected
- ✅ **Comprehensive logging** for debugging

**Why it's better than incremental:**
- **Reliability:** Automated testing catches issues humans miss
- **Speed:** Parallel deployment of all services
- **Consistency:** Same process every time, no human error
- **Monitoring:** Continuous health validation
- **Peace of mind:** Know immediately if something breaks

### ❌ **Incremental Approach Risks:**
- ❌ **Manual errors** in deployment steps
- ❌ **No payment testing** before users encounter issues  
- ❌ **Configuration drift** between services
- ❌ **No early warning** when systems fail
- ❌ **Downtime** during sequential deployments
- ❌ **Debugging difficulty** without comprehensive logs

## 🚀 Quick Setup Commands

### Complete Setup in 5 Minutes
```bash
# 1. Install CLI tools
npm install -g @railway/cli vercel

# 2. Get Railway credentials
railway login
echo "RAILWAY_TOKEN: $(railway whoami --json | jq -r '.token')"
echo "RAILWAY_SERVICE_ID: $(railway status --json | jq -r '.service.id')"

# 3. Get Vercel credentials  
vercel login
vercel projects list --json | jq -r '.[] | "VERCEL_PROJECT_ID_\(.name | ascii_upcase): \(.id)"'
vercel teams list --json | jq -r '.teams[] | "VERCEL_ORG_ID: \(.id)"'

# 4. Manual: Add payment provider keys from dashboards
# 5. Manual: Add all secrets to GitHub repository settings
```

## 🎯 Verification Commands

### Test Your Deployment Setup
```bash
# Test Railway connection
railway status

# Test Vercel connection
vercel projects list

# Test GitHub Actions (after setting up secrets)
# Push a small change and watch the workflow run
git add . && git commit -m "test deployment" && git push origin main
```

## 📞 Support

### If You Get Stuck:

1. **Railway Issues:** Check `railway status` and `railway logs`
2. **Vercel Issues:** Check `vercel --debug` output  
3. **Payment Issues:** Verify test keys (not production keys)
4. **GitHub Actions Issues:** Check the Actions tab for detailed logs

### Quick Troubleshooting:
```bash
# Railway not working?
railway logout && railway login

# Vercel not working?  
vercel logout && vercel login

# Wrong project linked?
rm -rf .vercel && vercel link
```

---

## 🎉 Final Result

Once all keys are configured, your GitHub Actions will provide:

✅ **Automated deployment** on every push  
✅ **Real payment testing** with every deployment  
✅ **Health monitoring** running 24/7  
✅ **Synchronized services** that never go out of sync  
✅ **Professional reliability** for your RPC platform  

**Time to setup:** ~15 minutes  
**Time saved per deployment:** ~30 minutes  
**Issues prevented:** Countless  

**🚀 Your N0DE Platform will be production-ready with enterprise-grade reliability!**