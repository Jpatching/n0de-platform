# GitHub Secrets Configuration for N0DE Platform

## Required Secrets for Automated Deployment

### Railway Integration
- **RAILWAY_TOKEN**: `97d008df-9146-4746-85f0-65269a21c3b4`
  - Used for: Backend deployment to Railway
  - Required for: `.github/workflows/deploy.yml`

### Vercel Integration  
- **VERCEL_TOKEN**: `<needs_to_be_generated>`
  - Generate at: https://vercel.com/account/tokens
  - Used for: Frontend deployment to Vercel

- **VERCEL_ORG_ID**: `<needs_to_be_found>`
  - Find in: Vercel project settings → General
  - Used for: Identifying your Vercel organization

- **VERCEL_PROJECT_ID**: `<needs_to_be_found>`  
  - Find in: Vercel project settings → General
  - Used for: Identifying the n0de-website project

## How to Add Secrets to GitHub

### Method 1: GitHub Web Interface
1. Go to: https://github.com/Jpatching/n0de-platform/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret with the name and value above

### Method 2: GitHub CLI (if available)
```bash
gh secret set RAILWAY_TOKEN --body "97d008df-9146-4746-85f0-65269a21c3b4"
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "your-org-id"  
gh secret set VERCEL_PROJECT_ID --body "your-project-id"
```

### Method 3: GitHub MCP (via Claude)
Claude can use the GitHub MCP to add secrets programmatically.

## Auto-Deployment Triggers

Once secrets are configured:

### Railway Backend
- **Trigger**: Push to `main` branch
- **Process**: GitHub Actions → Railway deployment
- **Health Check**: Automated endpoint verification
- **Logs**: Collected and stored as GitHub Actions artifacts

### Vercel Frontend  
- **Trigger**: Push to `main` branch  
- **Process**: GitHub Actions → Vercel deployment
- **URL**: https://www.n0de.pro
- **Logs**: Collected and stored as GitHub Actions artifacts

## Claude Log Access

### Immediate Status Check
```bash
./deployment-status.sh
```

### Comprehensive Log Collection
```bash
./collect-logs.sh
```

### Specific Service Logs
```bash
./collect-logs.sh railway  # Railway only
./collect-logs.sh vercel   # Vercel only
./collect-logs.sh github   # Git/GitHub only
./collect-logs.sh local    # System status only
```

## Infrastructure Memory for Claude

✅ **Vercel**: Frontend deployment platform (Next.js)  
✅ **Railway**: Backend + databases (NestJS, PostgreSQL, Redis)  
✅ **Prisma**: Database ORM and schema management  
✅ **Redis**: Caching layer (Railway hosted)  
✅ **PostgreSQL**: Primary database (Railway hosted)  
✅ **Stripe**: Payment processing (MCP integration available)  
✅ **GitHub**: Source control + automated CI/CD triggers