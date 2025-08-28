# 🚀 N0DE Platform - Professional Solana RPC Infrastructure

**The fastest, most reliable Solana RPC infrastructure with enterprise-grade subscription management and comprehensive payment processing.**

## 🏗️ Architecture Overview

### Backend API (NestJS)
- **Live URL**: https://n0de-backend-production-4e34.up.railway.app  
- **Platform**: Railway
- **Features**: RPC Proxy, Subscriptions, Payment Processing (Stripe/Coinbase/NOWPayments), JWT Authentication, WebSocket Support

### Frontend Applications

#### 1. Main Website (n0de-website)
- **Live URL**: https://www.n0de.pro
- **Platform**: Vercel  
- **Purpose**: Landing page, subscription management, developer portal, billing dashboard

#### 2. Admin Dashboard (admin-dashboard)  
- **Live URL**: https://admin-n0de.vercel.app
- **Platform**: Vercel
- **Purpose**: Administrative interface, user management, analytics, system monitoring

## 💳 Payment Systems Integration

### Supported Payment Providers
- ✅ **Stripe** - Credit card processing with subscription management
- ✅ **Coinbase Commerce** - Bitcoin, Ethereum, and major cryptocurrencies  
- ✅ **NOWPayments** - 200+ cryptocurrency payment options

### Subscription Tiers
- 🆓 **FREE** - 100K requests/month, community support
- 🚀 **STARTER** - $49/month, 1M requests, priority support  
- 💼 **PROFESSIONAL** - $299/month, 10M requests, advanced analytics
- 🏢 **ENTERPRISE** - $999/month, unlimited requests, dedicated infrastructure

## 🚀 Quick Start

### Complete Platform Setup
1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/your-repo/n0de-platform.git
   cd n0de-deploy
   npm install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and database URLs
   ```

3. **Database setup:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npm run seed
   ```

4. **Development server:**
   ```bash
   npm run start:dev
   ```

5. **Production deployment:**
   ```bash
   npm run build
   railway up  # Backend deployment
   ```

### Frontend Development
```bash
# Main website
cd frontend/n0de-website
npm install
npm run dev

# Admin dashboard  
cd frontend/admin-dashboard
npm install
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user account
- `POST /api/auth/login` - User authentication
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### API Key Management
- `GET /api/api-keys` - List user's API keys
- `POST /api/api-keys` - Generate new API key
- `DELETE /api/api-keys/:id` - Revoke API key

### Subscription Management
- `GET /api/subscriptions/plans` - List available plans
- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/upgrade` - Upgrade subscription plan
- `POST /api/subscriptions/cancel` - Cancel subscription

### Payment Processing
- `POST /api/payments` - Create payment session
- `GET /api/payments/history` - Payment history
- `POST /api/payments/stripe/webhook` - Stripe webhook handler
- `POST /api/payments/coinbase/webhook` - Coinbase webhook handler

### RPC Proxy Endpoints
- `POST /api/rpc/mainnet` - Mainnet RPC proxy
- `POST /api/rpc/devnet` - Devnet RPC proxy  
- `POST /api/rpc/testnet` - Testnet RPC proxy
- `GET /api/rpc/health` - RPC endpoint health check

### Usage Analytics
- `GET /api/usage/stats` - Usage statistics and limits
- `GET /api/usage/history` - Historical usage data
- `GET /api/metrics/performance` - Performance metrics

### System Health
- `GET /health` - System health check
- `GET /health/db` - Database connectivity
- `GET /health/cache` - Redis cache status

## 🏗️ Tech Stack

### Backend Infrastructure
- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis for sessions and rate limiting
- **Authentication:** JWT with secure session management
- **API Documentation:** Swagger/OpenAPI
- **Deployment:** Railway with automated CI/CD

### Frontend Stack
- **Framework:** Next.js 14 with TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** React Context + Custom Hooks
- **Payment Integration:** Stripe Elements, Coinbase SDK
- **Deployment:** Vercel with automatic deployments

## 🔧 Environment Configuration

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@host:5432/n0de_db"
REDIS_URL="redis://localhost:6379"

# JWT Security
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Solana RPC Configuration  
SOLANA_MAINNET_RPC="https://api.mainnet-beta.solana.com"
SOLANA_DEVNET_RPC="https://api.devnet.solana.com"
SOLANA_TESTNET_RPC="https://api.testnet.solana.com"

# Payment Provider Configuration
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
COINBASE_COMMERCE_API_KEY="..."
COINBASE_COMMERCE_WEBHOOK_SECRET="..."
NOWPAYMENTS_API_KEY="..."
NOWPAYMENTS_IPN_SECRET="..."

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=1000

# CORS Configuration
CORS_ORIGINS="https://www.n0de.pro,https://admin-n0de.vercel.app"

# Service URLs
FRONTEND_URL="https://www.n0de.pro"
ADMIN_URL="https://admin-n0de.vercel.app"
```

## 🚀 Deployment

### Railway Backend Deployment
1. **Connect repository to Railway**
2. **Add PostgreSQL and Redis services**
3. **Configure environment variables**
4. **Deploy with automatic CI/CD**

```bash
railway login
railway init
railway up
```

### Vercel Frontend Deployment
```bash
# Main website
cd frontend/n0de-website
vercel --prod

# Admin dashboard
cd frontend/admin-dashboard  
vercel --prod
```

### GitHub Actions CI/CD
Automated workflows handle:
- ✅ Comprehensive testing (unit, integration, E2E)
- ✅ Payment system validation
- ✅ Synchronized multi-service deployment
- ✅ Health monitoring and alerts
- ✅ Environment configuration validation

## 📊 Monitoring & Analytics

### Health Monitoring
- **System Health:** Database, Redis, API response times
- **Payment Health:** All payment providers, webhook status
- **Performance Metrics:** Request latency, throughput, error rates
- **Usage Analytics:** API key usage, subscription metrics

### Logging & Security
- **Structured JSON logging** with request tracing
- **Security event logging** for authentication and authorization
- **Audit trails** for all subscription and payment changes
- **Rate limiting** and DDoS protection

## 🔒 Security Features

### Authentication & Authorization
- **bcrypt password hashing** (12 rounds)
- **JWT tokens** with secure expiration handling
- **Redis session management** for scalability
- **API key authentication** with granular permissions

### API Security
- **Input validation** and sanitization on all endpoints
- **CORS protection** with whitelist configuration
- **Rate limiting** per user and API key
- **Security headers** with Helmet middleware
- **SQL injection protection** with Prisma ORM

### Payment Security
- **PCI DSS compliance** through Stripe
- **Webhook signature verification** for all providers
- **Secure credential storage** with environment variables
- **Payment audit logging** for compliance

## 📈 Performance Optimizations

### Backend Optimizations
- **Redis caching** for sessions and frequently accessed data
- **Database connection pooling** for optimal resource usage
- **Response compression** to reduce bandwidth
- **Efficient database queries** with Prisma optimization
- **Horizontal scaling** ready architecture

### Frontend Optimizations
- **Next.js SSR/SSG** for optimal loading performance
- **Code splitting** and lazy loading
- **Image optimization** with automatic WebP conversion
- **CDN distribution** through Vercel Edge Network

## 🧪 Testing Strategy

```bash
# Backend testing
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report

# Frontend testing
cd frontend/n0de-website
npm run test           # Jest unit tests
npx playwright test    # E2E payment flow tests
```

### Test Coverage
- ✅ **Payment Flow Testing** - Complete user journey validation
- ✅ **API Integration Testing** - All endpoints and error conditions
- ✅ **Authentication Testing** - Security and session management
- ✅ **Subscription Testing** - Plan upgrades, cancellations, billing
- ✅ **Performance Testing** - Load testing for high-traffic scenarios

## 📞 Support & Documentation

### Developer Resources
- **API Documentation:** Available at `/api/docs` (Swagger UI)
- **Postman Collection:** Complete API collection for testing
- **SDK Examples:** Code examples in multiple languages
- **Rate Limit Guide:** Best practices for API usage

### Support Channels
- **Technical Documentation:** Comprehensive guides and tutorials
- **Developer Support:** Priority email support for subscribers
- **System Status:** Real-time status page for all services
- **Community Forum:** Developer community and discussions

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Run tests:** `npm run test && npm run test:e2e`
5. **Submit pull request**

## 📄 License

**Private - N0DE Team Only**

---

## 🎯 Getting Started Checklist

- [ ] Clone repository and install dependencies
- [ ] Configure environment variables  
- [ ] Set up PostgreSQL and Redis databases
- [ ] Run database migrations
- [ ] Configure payment provider webhooks
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Test payment flows end-to-end
- [ ] Configure monitoring and alerts

**Built with ❤️ for the Solana ecosystem**