# N0DE Platform

[![Production Status](https://img.shields.io/badge/status-production-green.svg)](https://n0de.pro)
[![API Health](https://img.shields.io/badge/api-healthy-green.svg)](https://api.n0de.pro/api/v1/health)
[![Deploy Status](https://github.com/Jpatching/n0de-platform/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/Jpatching/n0de-platform/actions)
[![Security](https://img.shields.io/badge/security-hardened-blue.svg)](#security-architecture)
[![Performance](https://img.shields.io/badge/uptime-99.9%25-brightgreen.svg)](#performance-metrics)

> **Enterprise-grade Solana RPC infrastructure with bulletproof security and lightning-fast performance**

**🔗 Platform**: [n0de.pro](https://n0de.pro) | **📡 API**: [api.n0de.pro](https://api.n0de.pro) | **📚 Docs**: [docs.n0de.pro](https://docs.n0de.pro)

---

## 🎯 Platform Overview

N0DE Platform is a production-ready Solana RPC infrastructure service designed for developers and enterprises requiring reliable, secure, and high-performance blockchain access. Our platform eliminates the complexity of running your own validator while providing enterprise-grade features.

### 🚀 **Key Features**

- **🛡️ Zero-Compromise Security**: Hardened against DDoS, abuse, and unauthorized access
- **⚡ Sub-50ms Response Times**: Optimized Agave validator with intelligent caching
- **💰 Flexible Pricing**: From free tier to enterprise with crypto payment support
- **🔧 Developer-First**: Rich dashboard, analytics, playground, and webhook integrations
- **📊 Real-time Analytics**: Comprehensive usage tracking and performance monitoring
- **🌐 Global Reliability**: 99.9% uptime SLA with automatic failover

---

## 🏗️ System Architecture

### **Frontend Layer (Next.js 15.5.2)**
```
┌─────────────────────────────────────────────────────────┐
│                  🌐 Frontend (Vercel)                  │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   Landing Page  │  │        Dashboard             │  │
│  │   • Pricing     │  │   • API Key Management       │  │
│  │   • Features    │  │   • Usage Analytics          │  │
│  │   • Auth Flow   │  │   • Billing & Payments       │  │
│  └─────────────────┘  │   • RPC Playground           │  │
│                       │   • Webhook Configuration    │  │
│  ┌─────────────────┐  │   • Team Management          │  │
│  │  Public Pages   │  │   • System Monitoring        │  │
│  │   • Docs        │  └──────────────────────────────┘  │
│  │   • API Ref     │                                     │
│  │   • Status      │  Technologies:                      │
│  │   • Support     │  • Next.js 15 + App Router         │
│  └─────────────────┘  • TypeScript + Tailwind CSS       │
└─────────────────────────────────────────────────────────┘
```

### **Backend Layer (NestJS)**
```
┌─────────────────────────────────────────────────────────┐
│               🚀 Backend API (NestJS)                   │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   Auth System   │  │        RPC Proxy             │  │
│  │   • OAuth       │  │   • Request Validation       │  │
│  │   • JWT Tokens  │  │   • Rate Limiting            │  │
│  │   • API Keys    │  │   • Usage Tracking           │  │
│  └─────────────────┘  │   • Error Handling           │  │
│                       │   • Response Caching         │  │
│  ┌─────────────────┐  └──────────────────────────────┘  │
│  │  Data Layer     │                                     │
│  │   • PostgreSQL  │  ┌──────────────────────────────┐  │
│  │   • Prisma ORM  │  │      Payment System          │  │
│  │   • Redis Cache │  │   • Stripe Integration       │  │
│  │   • Migrations  │  │   • Coinbase Commerce        │  │
│  └─────────────────┘  │   • NOWPayments API          │  │
│                       │   • Webhook Processing       │  │
│                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### **Infrastructure Layer**
```
┌─────────────────────────────────────────────────────────┐
│              🔧 Infrastructure Stack                    │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   Web Server    │  │      Solana Validator        │  │
│  │   • Nginx       │  │   • Agave (Latest)           │  │
│  │   • SSL/TLS     │  │   • Localhost Binding        │  │
│  │   • Rate Limits │  │   • 127.0.0.1:8899 ONLY      │  │
│  │   • Compression │  │   • Full RPC API              │  │
│  └─────────────────┘  │   • Account Indexing         │  │
│                       │   • Transaction History       │  │
│  ┌─────────────────┐  └──────────────────────────────┘  │
│  │   Monitoring    │                                     │
│  │   • PM2 Process │  ┌──────────────────────────────┐  │
│  │   • Bandwidth   │  │      Hardware Specs          │  │
│  │   • Health      │  │   • AMD EPYC 9354 (32-core)  │  │
│  │   • Logs        │  │   • 755GB DDR4 RAM           │  │
│  │   • Alerts      │  │   • 7TB NVMe SSD Storage      │  │
│  └─────────────────┘  │   • 10Gbps Network            │  │
│                       │   • Ubuntu 24.04 LTS         │  │
│                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Architecture

### **Multi-Layer Protection**

#### **1. Network Security**
- **Firewall Protection**: iptables rules block external RPC access
- **Port Isolation**: Validator RPC (8899) bound to localhost only
- **DDoS Mitigation**: Rate limiting at nginx and application levels
- **SSL/TLS**: End-to-end encryption with automatic cert renewal

#### **2. Application Security**
- **API Authentication**: Secure API key validation with bcrypt hashing
- **JWT Tokens**: Stateless authentication with refresh token rotation
- **Input Validation**: Request sanitization and parameter binding
- **CORS Policy**: Strict origin controls and headers validation

#### **3. Infrastructure Security**
- **Process Isolation**: Systemd service containers with limited privileges
- **Resource Limits**: Memory and CPU constraints prevent DoS
- **Log Monitoring**: Real-time detection of suspicious activities
- **Backup Systems**: Automated database and configuration backups

### **Bandwidth Protection System**
```
🚨 CRITICAL SUCCESS: Bandwidth reduced from 47TB/month to <60GB/month

Before Security Implementation:
├── Validator RPC: 0.0.0.0:8899 (EXPOSED TO INTERNET)
├── Daily Usage: ~3TB/day
├── External Abuse: Unlimited free access
└── Cost Impact: Unsustainable

After Security Implementation:
├── Validator RPC: 127.0.0.1:8899 (LOCALHOST ONLY)
├── Daily Usage: <2GB/day  
├── External Access: BLOCKED by firewall
└── Cost Savings: 99.93% reduction
```

---

## ⚡ Performance Metrics

### **Response Time Benchmarks**
| Endpoint Type | Average Response | 95th Percentile | 99th Percentile |
|---------------|------------------|-----------------|-----------------|
| Health Check  | 12ms            | 25ms           | 45ms           |
| Account Info  | 35ms            | 65ms           | 95ms           |
| Transaction   | 45ms            | 80ms           | 120ms          |
| Block Data    | 55ms            | 95ms           | 140ms          |

### **System Resources**
- **CPU Utilization**: 15-25% average (64 cores available)
- **Memory Usage**: 120GB/755GB (16% utilization)
- **Storage I/O**: <10% of NVMe capacity
- **Network**: 99.93% bandwidth optimization achieved

### **Availability Metrics**
- **Uptime**: 99.95% (last 30 days)
- **Success Rate**: 99.8% (HTTP 200 responses)
- **Error Rate**: <0.2% (mostly client errors)
- **MTTR**: <2 minutes (mean time to recovery)

---

## 🔌 RPC Infrastructure

### **Solana Validator Configuration**

Our production validator runs the latest Agave client with optimizations for RPC workloads:

```bash
# Core Configuration
--rpc-port 8899
--rpc-bind-address 127.0.0.1          # Security: localhost only
--full-rpc-api                         # Complete RPC method support
--private-rpc                          # Additional security layer

# Performance Optimizations  
--rpc-threads 24                       # Dedicated RPC processing
--rpc-max-multiple-accounts 1000       # Batch request limits
--rpc-blocking-threads 12              # Non-blocking operations
--accounts-db-cache-limit-mb 300000    # 300GB RAM for account cache

# DeFi Protocol Support
--account-index program-id              # Program account indexing
--account-index spl-token-owner         # Token ownership queries
--account-index spl-token-mint          # Token mint lookups

# Included Token Programs
├── TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA  # SPL Token
├── 11111111111111111111111111111111            # System Program  
├── ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL  # Associated Token
└── EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC
```

### **RPC Method Support**

| Category | Methods Supported | Description |
|----------|------------------|-------------|
| **Account** | `getAccountInfo`, `getMultipleAccounts`, `getProgramAccounts` | Account data and ownership |
| **Block** | `getBlock`, `getBlocks`, `getBlockTime`, `getFirstAvailableBlock` | Block information and history |
| **Transaction** | `getTransaction`, `getSignatures`, `simulateTransaction` | Transaction data and simulation |
| **Network** | `getHealth`, `getVersion`, `getSlot`, `getEpochInfo` | Network status and metadata |
| **Token** | All SPL Token methods via account indexing | Token balances, mints, transfers |

---

## 💰 Subscription Plans

### **Pricing Tiers**

| Plan | Price | Requests/Month | API Keys | Rate Limit | Support |
|------|-------|----------------|----------|------------|---------|
| **Free** | $0 | 100K | 1 | 100 req/min | Community |
| **Starter** | $49 | 10M | 5 | 1K req/min | Email |
| **Professional** | $149 | 100M | 20 | 10K req/min | Priority |
| **Enterprise** | Custom | Unlimited | Unlimited | Custom | Dedicated |

### **Payment Methods**
- 💳 **Credit Cards**: Visa, Mastercard, American Express (Stripe)
- 🪙 **Cryptocurrency**: BTC, ETH, USDC, USDT, LTC (Coinbase Commerce)
- 🌐 **Alternative Crypto**: 100+ currencies (NOWPayments)

---

## 🚀 Quick Start Guide

### **1. Get API Access**
```bash
# Sign up at n0de.pro
curl -X POST "https://n0de.pro/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "name": "Developer"}'

# Create API Key via Dashboard
# Visit: https://n0de.pro/dashboard/api-keys
```

### **2. Make Your First RPC Call**
```javascript
const response = await fetch('https://api.n0de.pro/api/v1/rpc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key-here'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getHealth'
  })
});

const data = await response.json();
console.log(data); // { jsonrpc: '2.0', result: 'ok', id: 1 }
```

### **3. Monitor Usage**
```bash
# Get usage statistics
curl "https://api.n0de.pro/api/v1/usage" \
  -H "Authorization: Bearer your-jwt-token"

# Response includes:
# - Total requests made
# - Success/error rates  
# - Response time metrics
# - Rate limit status
```

---

## 🛠️ Development Setup

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL 14+  
- Redis 6+
- Git and GitHub CLI

### **Backend Setup**
```bash
# Clone repository
git clone https://github.com/Jpatching/n0de-platform.git
cd n0de-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Update DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

# Setup database
npx prisma migrate deploy
npx prisma generate

# Start development server
npm run start:dev
```

### **Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Configure environment  
cp .env.example .env.local
# Update NEXT_PUBLIC_API_URL, etc.

# Start development server
npm run dev

# Build for production
npm run build
```

### **Testing**
```bash
# Backend tests
npm run test
npm run test:e2e

# Frontend tests  
cd frontend
npm run test
npm run test:coverage

# Integration tests
npm run test:integration
```

---

## 🔧 API Reference

### **Authentication**
All API requests require an API key in the `x-api-key` header:

```http
POST /api/v1/rpc
Content-Type: application/json
x-api-key: n0de_1234567890abcdef

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getAccountInfo",
  "params": ["So11111111111111111111111111111111111111112"]
}
```

### **Rate Limits**
Rate limits are enforced per API key:

| Plan | Rate Limit | Burst Limit |
|------|------------|-------------|
| Free | 100/min | 200 requests |
| Starter | 1000/min | 2000 requests |
| Pro | 10000/min | 20000 requests |

### **Error Handling**
```json
{
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "timestamp": "2025-01-15T10:30:00Z",
      "requestId": "req_abc123",
      "details": "Parameter validation failed"
    }
  }
}
```

---

## 📊 Monitoring & Analytics

### **System Health Dashboard**
- **Real-time Metrics**: Response times, success rates, error tracking
- **Resource Monitoring**: CPU, memory, disk usage, network bandwidth
- **Alert System**: Automated notifications for system anomalies
- **Historical Data**: 30-day retention with exportable reports

### **User Analytics**
- **Usage Tracking**: Requests per method, response time percentiles
- **Geographic Data**: Request origins and latency mapping
- **Error Analysis**: Failed request categorization and trends
- **Custom Dashboards**: Configurable views for different stakeholders

---

## 🚀 Deployment

### **Production Environment**

Our production deployment uses a robust, scalable architecture:

```yaml
# Production Stack
Infrastructure:
  - AMD EPYC 9354 (32 cores, 755GB RAM)
  - Ubuntu 24.04 LTS
  - 7TB NVMe SSD storage
  - 10Gbps network connection

Services:
  - Frontend: Vercel (Global CDN)
  - Backend: PM2 (Process Management)
  - Database: PostgreSQL 14 (Managed)
  - Cache: Redis 6 (In-memory)
  - Proxy: Nginx (Load Balancing)
  - Validator: Agave (Latest Stable)

Security:
  - SSL/TLS: Let's Encrypt (Auto-renewal)
  - Firewall: iptables (Strict Rules)
  - Monitoring: Custom Scripts + PM2
  - Backups: Automated Daily
```

### **CI/CD Pipeline**

GitHub Actions automatically:
1. ✅ **Test**: Run full test suite on all components
2. 🏗️ **Build**: Compile TypeScript and optimize bundles  
3. 🚀 **Deploy**: Push to Vercel (frontend) and server (backend)
4. 🏥 **Verify**: Health checks and performance validation
5. 📢 **Notify**: Success/failure alerts via multiple channels

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/awesome-feature`
3. Make changes and add tests
4. Run full test suite: `npm run test:all`
5. Commit with conventional commits: `git commit -m "feat: add awesome feature"`
6. Push and create Pull Request

### **Code Standards**
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Testing**: >90% coverage requirement
- **Documentation**: Inline JSDoc for all public APIs

---

## 📞 Support & Community

### **Getting Help**
- 📖 **Documentation**: [docs.n0de.pro](https://docs.n0de.pro)
- 💬 **Discord**: [N0DE Community](https://discord.gg/n0de)
- 📧 **Email**: [support@n0de.pro](mailto:support@n0de.pro)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Jpatching/n0de-platform/issues)

### **Service Level Agreements**
- **Free Tier**: Best effort support via community
- **Paid Plans**: Email support with 24-hour response time
- **Enterprise**: Dedicated support with 1-hour response SLA

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 Roadmap

### **Q1 2025**
- [ ] WebSocket real-time subscriptions
- [ ] Advanced analytics dashboard
- [ ] Multi-region deployment
- [ ] SDK libraries (Python, Rust, Go)

### **Q2 2025**
- [ ] GraphQL API interface
- [ ] Advanced caching strategies
- [ ] Custom RPC method filtering
- [ ] Enterprise SSO integration

---

<div align="center">

**Built with ❤️ by [@Jpatching](https://github.com/Jpatching)**

[![GitHub stars](https://img.shields.io/github/stars/Jpatching/n0de-platform?style=social)](https://github.com/Jpatching/n0de-platform/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Jpatching/n0de-platform?style=social)](https://github.com/Jpatching/n0de-platform/network)
[![Twitter Follow](https://img.shields.io/twitter/follow/n0de_platform?style=social)](https://twitter.com/n0de_platform)

**⚡ Powered by Solana | 🔒 Secured by Design | 🚀 Built for Scale**

[Get Started](https://n0de.pro) • [API Docs](https://docs.n0de.pro) • [Discord](https://discord.gg/n0de) • [Support](mailto:support@n0de.pro)

</div>