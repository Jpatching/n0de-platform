# N0DE Environment Variables Management

This document describes the comprehensive environment management system for the N0DE platform.

## 🎯 Overview

The N0DE platform uses a multi-service architecture with environment variables managed across:
- **Railway** (Backend API)
- **Vercel** (Frontend)
- **Local Development**

## 📁 File Structure

```
.env.template          # Master template with all variables
.env                   # Local development (not in git)
scripts/
├── sync-railway-env.sh   # Sync variables to Railway
├── sync-vercel-env.sh    # Sync variables to Vercel  
└── validate-env.sh       # Validate environment setup
.github/workflows/
└── env-validation.yml    # CI/CD validation
```

## 🚀 Quick Start

### 1. Local Development Setup
```bash
# Copy template and fill in your values
cp .env.template .env
# Edit .env with your actual credentials
```

### 2. Railway Backend Setup
```bash
# Sync all environment variables to Railway
./scripts/sync-railway-env.sh
```

### 3. Vercel Frontend Setup
```bash
# Sync frontend environment variables to Vercel
./scripts/sync-vercel-env.sh
```

### 4. Validate Setup
```bash
# Validate Railway environment
./scripts/validate-env.sh railway

# Validate local environment
./scripts/validate-env.sh local

# Validate Vercel (manual check required)
./scripts/validate-env.sh vercel
```

## 🔧 Environment Variables

### Core Application
- `NODE_ENV` - Environment mode (production/development)
- `PORT` - Server port (3000)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

### URLs & Domains
- `FRONTEND_URL` - Frontend domain (https://www.n0de.pro)
- `BASE_URL` - Backend API base URL
- `CORS_ORIGINS` - Allowed CORS origins

### Authentication
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - Access token expiry (24h)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry (7d)
- `SESSION_SECRET` - Session signing secret
- `COOKIE_DOMAIN` - Cookie domain (.n0de.pro)

### OAuth Providers
#### Google OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_OAUTH_REDIRECT_URI` - OAuth callback URL

#### GitHub OAuth
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `GITHUB_OAUTH_REDIRECT_URI` - OAuth callback URL

### Payment Providers
#### Stripe
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret

#### Coinbase Commerce
- `COINBASE_COMMERCE_API_KEY` - Coinbase Commerce API key
- `COINBASE_COMMERCE_WEBHOOK_SECRET` - Coinbase webhook secret

#### NOWPayments
- `NOWPAYMENTS_API_KEY` - NOWPayments API key
- `NOWPAYMENTS_IPN_SECRET` - NOWPayments IPN secret

### Security & Rate Limiting
- `RATE_LIMIT_MAX` - Maximum requests per window
- `RATE_LIMIT_TTL` - Rate limit window (seconds)
- `OAUTH_SUCCESS_REDIRECT` - OAuth success redirect URL
- `OAUTH_FAILURE_REDIRECT` - OAuth failure redirect URL

## 🔒 Security Best Practices

### 1. Secret Management
- Never commit actual secrets to git
- Use strong, unique secrets for each environment
- Rotate secrets regularly
- Use Railway/Vercel secret management for production

### 2. Environment Separation
- Development: Local .env file
- Production Backend: Railway environment variables
- Production Frontend: Vercel environment variables

### 3. Variable Naming
- Backend variables: Standard names (e.g., `JWT_SECRET`)
- Frontend variables: `NEXT_PUBLIC_` prefix for public variables
- No secrets in frontend environment variables

## 🔄 Automation & CI/CD

### GitHub Actions Workflow
The `.github/workflows/env-validation.yml` workflow:
- Validates environment template completeness
- Checks script permissions and structure
- Tests sync script commands
- Validates environment setup

### Manual Validation
Run validation scripts before deployment:
```bash
# Check all required variables are set
./scripts/validate-env.sh railway

# Test backend health
curl https://n0de-backend-production-4e34.up.railway.app/health
```

## 🛠️ Troubleshooting

### Common Issues

**1. Invalid Stripe Key Error**
```bash
# Update Stripe key in Railway
railway variables --set "STRIPE_SECRET_KEY=sk_live_your_actual_key"
```

**2. OAuth Redirects Not Working**
- Check `GOOGLE_OAUTH_REDIRECT_URI` matches OAuth app configuration
- Verify `CORS_ORIGINS` includes your frontend domain

**3. Database Connection Issues**
- Verify `DATABASE_URL` is set correctly
- Check Railway PostgreSQL service is running

**4. Missing Environment Variables**
```bash
# Run validation to see what's missing
./scripts/validate-env.sh railway

# Fix missing variables using Railway CLI
railway variables --set "VARIABLE_NAME=value"
```

### Health Checks

**Backend Health Check:**
```bash
curl https://n0de-backend-production-4e34.up.railway.app/health
```

**OAuth Endpoints:**
```bash
# Should redirect to OAuth providers
curl -I https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google
curl -I https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github
```

## 📚 Additional Resources

- [Railway Variables Documentation](https://docs.railway.com/guides/variables)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [N0DE Platform Documentation](https://docs.n0de.pro)

## 🔄 Variable Updates

When updating environment variables:

1. Update `.env.template` with new variables
2. Update sync scripts with new variable assignments
3. Update validation script with new variable checks
4. Run validation before deployment
5. Update this documentation

## 🚨 Emergency Procedures

**Secret Compromise:**
1. Immediately rotate the compromised secret
2. Update environment variables in all environments
3. Redeploy applications
4. Monitor logs for unauthorized access

**Service Outage:**
1. Check environment variable validation
2. Verify all required variables are set
3. Check service health endpoints
4. Review Railway/Vercel deployment logs