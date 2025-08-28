# 🚀 N0DE Platform - Complete RPC & Gaming Ecosystem

The fastest, most reliable Solana RPC infrastructure with integrated gaming platform, full payment processing, and multi-application deployment system.

## 🏗️ Architecture Overview

### Backend API (NestJS)
- **Live URL**: https://n0de-backend-production-4e34.up.railway.app  
- **Platform**: Railway
- **Features**: Subscriptions, Payments (Stripe/Coinbase/NOWPayments), WebSockets, Authentication

### Frontend Applications

#### 1. Main Website (n0de-website)
- **Live URL**: https://www.n0de.pro
- **Platform**: Vercel  
- **Purpose**: Primary landing page, subscription management, billing

#### 2. Gaming Platform (frontend)
- **Live URL**: https://pv3-production.vercel.app
- **Platform**: Vercel
- **Purpose**: Interactive gaming platform with real-time features

#### 3. Admin Dashboard (admin-dashboard)  
- **Live URL**: https://admin-n0de.vercel.app
- **Platform**: Vercel
- **Purpose**: Administrative interface for platform management

## 🚀 Complete Deployment

### Deploy Entire Ecosystem
```bash
# Deploy all services simultaneously  
./deploy-all.sh
```

### Individual Service Deployment
```bash
# Backend only
railway up

# Main website
cd frontend/n0de-website && vercel --prod

# Gaming platform  
cd frontend/frontend && vercel --prod

# Admin dashboard
cd frontend/admin-dashboard && vercel --prod
```

### Synchronize Environment Variables
```bash
./sync-env-vars.sh
```

### Test Deployment
```bash
./test-deployment.sh
```

## 💰 Payment Systems Integration

### Supported Payment Providers
- ✅ **Stripe** - Credit card processing
- ✅ **Coinbase Commerce** - Major cryptocurrencies  
- ✅ **NOWPayments** - 200+ cryptocurrency support

### Revenue Features
- 📊 Real-time subscription tracking
- 💳 Seamless plan upgrades between FREE/STARTER/PROFESSIONAL/ENTERPRISE
- 🔄 WebSocket billing updates
- 📈 Usage-based billing alerts

## 🚀 Quick Start

### Complete Ecosystem Setup
1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd n0de-deploy
   npm install
   ```

2. **Environment setup:**
   ```bash
   ./sync-env-vars.sh
   # Edit .env with your actual API keys
   ```

3. **Database setup:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run seed
   ```

4. **Deploy everything:**
   ```bash
   ./deploy-all.sh
   ```

5. **Test deployment:**
   ```bash
   ./test-deployment.sh
   ```

### Railway Deployment

1. **Create Railway project:**
   ```bash
   railway login
   railway init
   ```

2. **Add services:**
   - PostgreSQL database
   - Redis cache
   - Web service (this backend)

3. **Set environment variables:**
   ```bash
   railway variables set JWT_SECRET=your-super-secret-jwt-key
   railway variables set NODE_ENV=production
   # Add other variables from env.example
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update profile
- `PUT /api/v1/auth/change-password` - Change password

### API Key Management
- `GET /api/v1/api-keys` - List user's API keys
- `POST /api/v1/api-keys` - Create new API key
- `GET /api/v1/api-keys/:id` - Get specific API key
- `PUT /api/v1/api-keys/:id` - Update API key
- `DELETE /api/v1/api-keys/:id` - Delete API key

### Usage Statistics
- `GET /api/v1/stats/usage` - Get usage statistics
- `GET /api/v1/stats/history` - Get usage history

### Support System
- `GET /api/v1/support/tickets` - List support tickets
- `POST /api/v1/support/tickets` - Create support ticket
- `GET /api/v1/support/tickets/:id` - Get specific ticket
- `PUT /api/v1/support/tickets/:id` - Update ticket

### RPC Proxy
- `POST /api/v1/rpc/test` - Test RPC calls
- `POST /api/v1/rpc/mainnet` - Mainnet RPC proxy
- `POST /api/v1/rpc/devnet` - Devnet RPC proxy
- `POST /api/v1/rpc/testnet` - Testnet RPC proxy

### Performance Metrics
- `GET /api/v1/metrics/performance` - Get performance metrics
- `GET /api/v1/metrics/regions` - Get regional metrics

### System Health
- `GET /health` - System health check

## 🏗️ Architecture

### Tech Stack
- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis for sessions and rate limiting
- **Authentication:** JWT with session validation
- **Documentation:** Swagger/OpenAPI
- **Deployment:** Railway with Docker

### Database Schema
- **Users:** User accounts and profiles
- **API Keys:** API key management with permissions
- **Usage Stats:** Request tracking and analytics
- **Support Tickets:** Customer support system
- **System Metrics:** Performance monitoring
- **Audit Logs:** Security and change tracking

### Security Features
- Password hashing with bcrypt
- JWT token authentication
- Session validation with Redis
- Rate limiting per API key
- Audit logging for all actions
- Input validation and sanitization
- CORS protection
- Helmet security headers

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/n0de_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# API
API_PORT=3000
NODE_ENV=production

# Solana RPC
SOLANA_MAINNET_RPC="https://api.mainnet-beta.solana.com"
SOLANA_DEVNET_RPC="https://api.devnet.solana.com"
SOLANA_TESTNET_RPC="https://api.testnet.solana.com"

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=1000

# CORS
CORS_ORIGINS="https://n0de.com,https://www.n0de.com"
```

### Railway Variables
Set these in your Railway project:
- `DATABASE_URL` (auto-provided by PostgreSQL service)
- `REDIS_URL` (auto-provided by Redis service)
- `JWT_SECRET`
- `NODE_ENV=production`
- `CORS_ORIGINS`
- All other environment variables

## 🚀 Deployment

### Railway Deployment Steps
1. Connect GitHub repository to Railway
2. Add PostgreSQL and Redis services
3. Set environment variables
4. Deploy automatically on push

### Custom Domain Setup
1. Add custom domain in Railway dashboard
2. Update CORS_ORIGINS environment variable
3. Update frontend API_URL to point to your domain

## 📊 Monitoring

### Health Checks
- Database connectivity
- Redis connectivity
- Memory usage
- Response times
- System uptime

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking with stack traces
- Security event logging
- Performance metrics logging

### Metrics
- API request counts
- Response times
- Error rates
- Database query performance
- Cache hit rates

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📈 Performance

### Optimizations
- Redis caching for sessions and API keys
- Database connection pooling
- Response compression
- Rate limiting to prevent abuse
- Efficient database queries with Prisma

### Scaling
- Horizontal scaling ready
- Stateless design
- Redis for shared state
- Database connection pooling
- Load balancer compatible

## 🔒 Security

### Best Practices
- Password hashing with bcrypt (12 rounds)
- JWT tokens with expiration
- Session validation
- Input validation and sanitization
- CORS protection
- Rate limiting
- Audit logging
- Security headers with Helmet

### API Key Security
- Hashed storage in database
- Preview-only display in UI
- Permission-based access control
- Rate limiting per key
- Usage tracking and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

Private - n0de Team Only

---

**Built with ❤️ by the n0de team**