# PV3 Backend - Railway Deployment Guide

## Prerequisites
1. Railway account (https://railway.app)
2. Railway CLI installed: `npm install -g @railway/cli`
3. GitHub repository connected

## Quick Deploy Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Railway Project
```bash
cd backend
railway init
```

### 3. Add PostgreSQL Database
```bash
railway add postgresql
```

### 4. Set Environment Variables
```bash
# Set in Railway dashboard or via CLI:
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set SOLANA_RPC_URL=https://api.devnet.solana.com
railway variables set SOLANA_NETWORK=devnet
```

The `DATABASE_URL` will be automatically set by Railway when you add PostgreSQL.

### 5. Deploy
```bash
railway up
```

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `production` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_NETWORK` | Solana network | `devnet` |

## Build Configuration

Railway will automatically:
1. Run `npm ci` to install dependencies
2. Run `prisma generate` (via postinstall script)
3. Run `npm run build` to compile TypeScript
4. Start the app with `npm start`

## Database Setup

After deployment, the Prisma schema will automatically sync with your PostgreSQL database using `prisma db push` during the build process.

## Health Check

The backend includes a health check endpoint at `/health` that Railway can use to monitor the service.

## CORS Configuration

The backend is pre-configured to accept requests from:
- Vercel preview deployments matching `/^https:\/\/pv3-gaming-.*\.vercel\.app$/`
- Production domains: `pv3.gaming`, `www.pv3.gaming`
- Development: `localhost:3000`, `localhost:3001`

## Post-Deployment

1. Note your Railway backend URL (e.g., `https://your-app.railway.app`)
2. Update your frontend's API configuration to use this URL
3. Test the `/health` endpoint to ensure the backend is running
4. Test database connectivity through your API endpoints

## Troubleshooting

- Check Railway logs: `railway logs`
- Verify environment variables: `railway variables`
- Test database connection: Check if Prisma can connect
- Monitor health endpoint: `curl https://your-app.railway.app/health` 