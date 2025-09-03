# N0DE Production Deployment Checklist

This comprehensive checklist ensures a successful migration from backend to bare metal with zero downtime for your Solana RPC service.

## 📋 Pre-Migration Checklist

### System Preparation
- [ ] **Verify server specifications**
  - [ ] 32 cores available
  - [ ] 768GB RAM available  
  - [ ] Sufficient disk space (>500GB recommended)
  - [ ] Ubuntu 24.04 running
  
- [ ] **Validate Solana RPC status** 
  - [ ] RPC responding on port 8899: `curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' http://localhost:8899`
  - [ ] Validator process stable: `ps aux | grep agave-validator`
  - [ ] No recent crashes in logs

- [ ] **Backup current backend data**
  - [ ] Test backend CLI access: `backend login`
  - [ ] Export environment variables: `backend variables`
  - [ ] Verify database connectivity on backend
  - [ ] Note current frontend URL and verify it's working

### Dependencies Installation
- [ ] **Required services installed**
  - [ ] PostgreSQL 16: `systemctl status postgresql`
  - [ ] Redis: `systemctl status redis-server`
  - [ ] nginx: `nginx -v`
  - [ ] Node.js 18+: `node --version`
  - [ ] PM2 or systemd available
  
- [ ] **Required CLI tools**
  - [ ] backend CLI: `backend --version`  
  - [ ] Vercel CLI (optional): `vercel --version`
  - [ ] certbot: `certbot --version`
  - [ ] PostgreSQL client: `psql --version`

## 🚀 Migration Execution Checklist

### Phase 1: Infrastructure Setup
- [ ] **Run system services setup**
  ```bash
  ./scripts/setup-system-services.sh
  ```
  - [ ] n0de user created
  - [ ] systemd service files installed
  - [ ] Permissions configured correctly

### Phase 2: Database Setup  
- [ ] **Set up PostgreSQL**
  ```bash
  ./scripts/db-setup.sh
  ```
  - [ ] Database n0de_db created
  - [ ] User n0de_user created with proper permissions
  - [ ] Database connection URL generated
  - [ ] Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

- [ ] **Set up Redis**
  ```bash
  ./scripts/redis-setup.sh  
  ```
  - [ ] Redis responding: `redis-cli ping`
  - [ ] Database 1 configured for N0DE
  - [ ] Connection URL generated

### Phase 3: Data Migration
- [ ] **Export backend data**
  ```bash
  ./scripts/backend-export.sh
  ```
  - [ ] Environment variables exported
  - [ ] Database dump created (check file size >1KB)
  - [ ] Export summary generated
  
- [ ] **Import to local database**
  ```bash
  ./scripts/import-backend-data.sh
  ```
  - [ ] Pre-import backup created
  - [ ] Database import successful
  - [ ] Data validation passed
  - [ ] Row counts verified
  - [ ] Critical tables present (users, api_keys, subscriptions)

### Phase 4: Backend Configuration
- [ ] **Configure NestJS backend**
  ```bash
  ./scripts/backend-setup.sh
  ```
  - [ ] Dependencies installed
  - [ ] Application built successfully  
  - [ ] Environment files configured
  - [ ] Prisma client generated

- [ ] **Update production environment**
  - [ ] Edit `.env.production` with real values:
    - [ ] JWT_SECRET (generate with `openssl rand -base64 32`)
    - [ ] OAuth credentials (GitHub, Google)
    - [ ] Payment provider keys (Stripe, Coinbase, etc.)
    - [ ] Email service credentials
    - [ ] Frontend/backend URLs
  - [ ] Test environment: `node -e "require('dotenv').config({path:'.env.production'}); console.log('OK')"`

### Phase 5: SSL Setup (Production Only)
- [ ] **Configure HTTPS**
  ```bash  
  ./scripts/ssl-setup.sh your-domain.com
  ```
  - [ ] DNS pointing to server IP
  - [ ] Let's Encrypt certificate obtained
  - [ ] nginx SSL configuration active
  - [ ] HTTPS endpoints responding
  - [ ] Auto-renewal configured

### Phase 6: nginx Configuration
- [ ] **Set up reverse proxy**
  ```bash
  ./scripts/nginx-setup.sh
  ```
  - [ ] nginx configuration tested: `nginx -t`
  - [ ] Service reloaded successfully
  - [ ] Both HTTP and HTTPS working (if SSL configured)

### Phase 7: Service Startup
- [ ] **Start N0DE backend**
  ```bash
  ./scripts/service-manager.sh start
  ```
  - [ ] Service started: `systemctl status n0de-backend`
  - [ ] Logs show successful startup: `./scripts/service-manager.sh logs`
  - [ ] Health endpoint responding: `curl http://localhost:3001/health`

- [ ] **Install monitoring (recommended)**
  ```bash
  ./monitoring/install-monitoring.sh
  ```
  - [ ] Monitoring service active
  - [ ] Dashboard accessible: `n0de-status`
  - [ ] Alerts configured

## ✅ Verification Checklist

### Backend API Testing
- [ ] **Health endpoints**
  - [ ] Backend API: `curl http://localhost:3001/health`
  - [ ] Via nginx: `curl http://your-server/api/health`
  - [ ] HTTPS (if configured): `curl https://your-domain/api/health`

- [ ] **Database connectivity**
  - [ ] Test query: `curl http://localhost:3001/api/v1/users/count` (if endpoint exists)
  - [ ] Check logs for database connections

- [ ] **RPC proxy functionality**  
  - [ ] RPC health via nginx: `curl http://your-server/health`
  - [ ] API key authentication working (if configured)
  - [ ] Rate limiting functional

### End-to-End Testing
- [ ] **Frontend integration**
  - [ ] Update Vercel environment variables:
    - [ ] `NEXT_PUBLIC_API_URL=https://your-domain` (or http://your-server)
    - [ ] `NEXTAUTH_URL=https://n0de.pro`
    - [ ] Any other backend-specific variables
  - [ ] Redeploy frontend on Vercel
  - [ ] Test frontend → backend connectivity
  - [ ] Test user authentication flow
  - [ ] Test API key generation/management
  - [ ] Test payment flows (if applicable)

- [ ] **Performance verification**
  - [ ] Backend response times <1s
  - [ ] RPC response times similar to before
  - [ ] No memory leaks over 30 minutes
  - [ ] Database query performance acceptable

## 🔒 Security Checklist

- [ ] **Service security**
  - [ ] Services running as non-root user
  - [ ] Firewall configured (if applicable)
  - [ ] Only necessary ports exposed
  - [ ] SSL/TLS configured for production

- [ ] **Data security**
  - [ ] Environment files have 600 permissions
  - [ ] Database credentials secure
  - [ ] API keys properly protected
  - [ ] Logs don't contain sensitive data

- [ ] **Backup security**  
  - [ ] Backup encryption enabled (if storing offsite)
  - [ ] Backup access restricted
  - [ ] Restore procedure tested

## 📊 Monitoring & Maintenance

- [ ] **Set up automated backups**
  ```bash
  ./scripts/setup-backup-schedule.sh
  ```
  - [ ] Daily backups scheduled
  - [ ] Backup retention policy set
  - [ ] Backup notifications configured

- [ ] **Log management**
  - [ ] Log rotation configured
  - [ ] Log monitoring set up
  - [ ] Error alerting configured

- [ ] **Performance monitoring**
  - [ ] System resource monitoring
  - [ ] Application performance monitoring  
  - [ ] Database performance monitoring
  - [ ] RPC performance unchanged

## 🚨 Post-Migration Tasks

### Immediate (within 24 hours)
- [ ] **Monitor all services closely**
  - [ ] Check logs every few hours
  - [ ] Verify backup completion
  - [ ] Monitor resource usage
  - [ ] Test critical user flows

- [ ] **Performance validation**
  - [ ] Compare response times to backend baseline
  - [ ] Check memory usage trends
  - [ ] Verify database performance
  - [ ] Monitor Solana RPC stability

### Within 1 Week
- [ ] **Cleanup old infrastructure** 
  - [ ] Archive redundant files: `./scripts/cleanup-redundant.sh`
  - [ ] Document any custom configurations
  - [ ] Plan backend cleanup (keep running as backup initially)

- [ ] **Documentation updates**
  - [ ] Update internal documentation with new URLs
  - [ ] Update monitoring contacts
  - [ ] Document any custom configurations

### Within 1 Month
- [ ] **Remove backend dependency**
  - [ ] Verify everything working smoothly
  - [ ] Export final backup from backend
  - [ ] Cancel backend subscription
  - [ ] Update documentation

## 🔙 Rollback Checklist

If issues occur, follow rollback procedure:

- [ ] **Immediate rollback**
  ```bash
  ./scripts/rollback.sh
  ```
  - [ ] Stop local services
  - [ ] Restore nginx configuration
  - [ ] Verify backend still accessible

- [ ] **Frontend rollback**
  - [ ] Revert Vercel environment variables
  - [ ] Redeploy frontend to backend endpoints
  - [ ] Test critical functionality

- [ ] **Data recovery**
  - [ ] backend database still accessible
  - [ ] No data loss from export/import process
  - [ ] Critical user data intact

## 📞 Emergency Contacts

**Before Migration:**
- [ ] Identify key stakeholders to notify
- [ ] Set up communication channels (Slack, etc.)
- [ ] Plan maintenance window announcement
- [ ] Prepare rollback contact list

## ✨ Success Criteria

Migration is considered successful when:

- [ ] ✅ **Solana RPC**: Continues running without interruption
- [ ] ✅ **Backend API**: All endpoints responding correctly  
- [ ] ✅ **Frontend**: Fully functional with new backend
- [ ] ✅ **Database**: All data migrated and accessible
- [ ] ✅ **Performance**: Response times equal or better than backend
- [ ] ✅ **Monitoring**: Full system monitoring active
- [ ] ✅ **Backups**: Automated backups running
- [ ] ✅ **SSL**: HTTPS working correctly (production)
- [ ] ✅ **Stability**: No crashes or errors for 24 hours

## 📝 Migration Log Template

```
Migration Date: _____________
Started by: _________________
Start Time: _________________

Pre-migration checklist: ✅ COMPLETED
Infrastructure setup: _______________
Data migration: ___________________
Service startup: __________________
Verification: _____________________
End Time: _______________________

Issues encountered: _______________
Resolution: ______________________

Final status: ✅ SUCCESS / ❌ FAILED
Notes: ___________________________
```

---

**Remember**: This migration is designed to be **safe and reversible**. Your Solana RPC will continue working throughout the entire process. Take your time and verify each step before proceeding to the next phase.