# N0DE Payment Platform - Claude Code Configuration

## Project Overview
**N0DE RPC Infrastructure**: Enterprise-grade Solana RPC provider with comprehensive payment system
- **Frontend**: https://n0de.pro (Next.js on Vercel)
- **Backend**: https://api.n0de.pro (NestJS self-hosted)
- **Database**: PostgreSQL with Redis caching
- **Payment Providers**: Stripe, Coinbase Commerce, NOWPayments

## Claude Code Integration

### Hooks
- **user-prompt-submit**: Automatically checks payment system health when working on payment files
- **file-edit**: Auto-restarts services and suggests deployments when critical files are modified
- **task-complete**: Runs relevant tests based on completed task type

### Agents
- **payment-monitor** (5min): Monitors API endpoints, database, and payment failures
- **security-scanner** (1hr): Checks webhooks, SSL certificates, firewall, and suspicious activity
- **deployment-checker** (30min): Validates frontend/backend deployments and system resources

### Available Commands
```bash
# Testing & Verification
npm run test:payments          # Run payment system tests
npm run test:security         # Security vulnerability scan
npm run test:e2e              # End-to-end payment flows

# Deployment
npm run deploy:frontend       # Deploy to Vercel
npm run deploy:backend        # Restart backend services
npm run deploy:production     # Full production deployment

# Monitoring
npm run monitor:dashboard     # Live system dashboard
npm run monitor:payments      # Payment-specific monitoring
npm run monitor:security      # Security monitoring

# Maintenance
npm run backup:create         # Create system backup
npm run backup:restore        # Restore from backup
npm run optimize:database     # Database performance optimization
```

## System Status

### ✅ PRODUCTION READY
- Payment system fully configured with correct URLs
- All three payment providers integrated (Stripe, Coinbase, NOWPayments)
- Comprehensive monitoring and alerting system
- Automated testing and deployment pipelines
- Security hardening and vulnerability scanning
- Real-time system health monitoring

### Current Configuration
- **Frontend URL**: https://n0de.pro ✅
- **API URL**: https://api.n0de.pro ✅
- **Database**: n0de_production ✅
- **Payment Monitoring**: Active ✅
- **Security Scanning**: Active ✅
- **Deployment Checking**: Active ✅

## Quick Actions

When working on payment-related files, Claude Code will automatically:
1. Check payment system health
2. Validate API connectivity
3. Monitor database status
4. Suggest deployment actions
5. Run relevant tests

## Alert Thresholds
- Payment failures: >5 per hour
- API response time: >2 seconds
- Database connections: >80 active
- SSL certificate: <30 days remaining
- System resources: >85% usage

## Emergency Procedures
If critical alerts are triggered:
1. Check live dashboard: `.claude/monitoring/dashboard.sh`
2. Review logs: `/home/sol/n0de-deploy/logs/`
3. Run production readiness check: `scripts/production-readiness-check.sh`
4. Contact system administrator if issues persist

---
**Last Updated**: $(date)
**Status**: 🚀 ENTERPRISE PRODUCTION READY