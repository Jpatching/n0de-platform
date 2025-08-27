# 🚀 n0de Platform

Enterprise-level Solana RPC infrastructure service with comprehensive analytics, user management, and payment processing.

## 🌟 Features

- **Admin Dashboard**: Real-time statistics, user management, revenue tracking
- **User API**: Account management, usage analytics, plan upgrades  
- **Payment Service**: Crypto payments via Coinbase Commerce & NOWPayments
- **Database Integration**: PostgreSQL + Redis for high-performance data management
- **Authentication**: API key-based auth with rate limiting
- **Multi-Plan Support**: Free, Starter, Pro, Enterprise tiers

## 🏗️ Architecture

### Services
- **Admin Dashboard** (Port 3002): Internal management interface
- **User API** (Port 3004): External user-facing API
- **Payment Service** (Port 3005): Crypto payment processing
- **Database Layer**: PostgreSQL for persistence, Redis for caching

### Tech Stack
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 17 + Redis 8
- **Authentication**: JWT + API Keys
- **Payments**: Coinbase Commerce, NOWPayments
- **Deployment**: Railway + GitHub Actions
- **Frontend**: Vercel (separate repository)

## 🚀 Deployment

### Railway (Production)
- Connected to GitHub repository for automated deployments
- PostgreSQL and Redis services configured
- Environment variables managed via Railway dashboard

### Local Development
```bash
# Start all services
DB_TYPE=postgresql node start-production.js

# Individual services
DB_TYPE=postgresql node src/dashboard/admin-dashboard.js
DB_TYPE=postgresql USER_DASHBOARD_PORT=3004 node src/dashboard/user-dashboard.js  
DB_TYPE=postgresql PAYMENT_SERVICE_PORT=3005 node src/payments/payment-service.js
```

## 📊 API Endpoints

### Admin Dashboard (localhost:3002)
- `GET /api/stats` - User and revenue statistics
- `GET /api/users` - List all users
- `GET /health` - Service health check

### User API (localhost:3004)  
- `GET /api/user/profile` - User profile (requires API key)
- `GET /api/user/analytics` - Usage analytics
- `POST /api/user/upgrade` - Plan upgrade request
- `GET /health` - Service health check

### Payment Service (localhost:3005)
- `POST /api/payments/create` - Create payment request
- `GET /api/payments/status/:id` - Check payment status
- `POST /api/payments/*/webhook` - Payment webhooks
- `GET /health` - Service health check

## 🧪 Testing

- **GitHub Actions**: Automated testing with PostgreSQL + Redis
- **Health Checks**: Service availability monitoring  
- **Integration Tests**: API endpoint validation
- **Playwright Tests**: Browser automation (configured for SSH servers)

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
DB_TYPE=postgresql

# Authentication  
JWT_SECRET=your_jwt_secret

# Payment Processing
COINBASE_COMMERCE_API_KEY=your_coinbase_key
COINBASE_COMMERCE_WEBHOOK_SECRET=your_webhook_secret
NOWPAYMENTS_API_KEY=your_nowpayments_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
```

## 📈 Monitoring

- Real-time user statistics and revenue tracking
- API usage analytics with rate limiting
- Payment processing status monitoring
- Database performance metrics

---

**Live Services:**
- 🌐 Frontend: [n0de-website-umber.vercel.app](https://n0de-website-umber.vercel.app)
- 🚂 Backend: [Railway Service](https://n0de-backend-production-4e34.up.railway.app)

Built with ❤️ for high-performance Solana RPC infrastructure.