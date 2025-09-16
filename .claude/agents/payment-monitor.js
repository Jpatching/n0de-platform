// Claude Code Agent - Payment Monitor
// Continuously monitors payment system health and alerts on issues

const { exec } = require('child_process');
const fs = require('fs');

class PaymentMonitor {
  constructor() {
    this.logFile = '/home/sol/n0de-deploy/logs/agents/payment-monitor.log';
    this.alertThresholds = {
      failedPayments: 5,
      responseTime: 2000,
      dbConnections: 80
    };
    
    // Ensure log directory exists
    const logDir = require('path').dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [PAYMENT-MONITOR] ${message}\n`;
    
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }
  
  async checkApiEndpoints() {
    const endpoints = [
      'https://api.n0de.pro/health',
      'https://api.n0de.pro/api/v1/subscriptions/plans',
      'https://api.n0de.pro/api/v1/payments'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest(endpoint);
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200 || response.status === 401) {
          this.log(`✅ ${endpoint}: OK (${responseTime}ms)`);
          
          if (responseTime > this.alertThresholds.responseTime) {
            this.log(`⚠️ SLOW RESPONSE: ${endpoint} took ${responseTime}ms`);
          }
        } else {
          this.log(`❌ ALERT: ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        this.log(`❌ ERROR: ${endpoint} - ${error.message}`);
      }
    }
  }
  
  async checkDatabase() {
    return new Promise((resolve) => {
      exec('PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT 1;" 2>/dev/null', (error) => {
        if (!error) {
          this.log('✅ Database connectivity: OK');
          
          // Check connection count
          exec('PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null', (error, stdout) => {
            if (!error) {
              const connections = parseInt(stdout.trim());
              this.log(`Database connections: ${connections}`);
              
              if (connections > this.alertThresholds.dbConnections) {
                this.log(`⚠️ HIGH DB CONNECTIONS: ${connections} active connections`);
              }
            }
            resolve();
          });
        } else {
          this.log('❌ ALERT: Database connectivity failed');
          resolve();
        }
      });
    });
  }
  
  async checkPaymentFailures() {
    return new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) FROM payments 
        WHERE status = 'FAILED' 
        AND created_at >= NOW() - INTERVAL '1 hour'
      `;
      
      exec(`PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "${query}" 2>/dev/null`, (error, stdout) => {
        if (!error) {
          const failedPayments = parseInt(stdout.trim());
          
          if (failedPayments > this.alertThresholds.failedPayments) {
            this.log(`❌ ALERT: ${failedPayments} payment failures in last hour`);
          } else {
            this.log(`Payment failures: ${failedPayments} (acceptable)`);
          }
        } else {
          this.log('⚠️ Could not check payment failures');
        }
        resolve();
      });
    });
  }
  
  async checkServices() {
    const services = ['nginx', 'n0de-payment-monitor', 'n0de-security-scanner'];
    
    for (const service of services) {
      await new Promise((resolve) => {
        exec(`systemctl is-active --quiet ${service}`, (error) => {
          if (!error) {
            this.log(`✅ Service ${service}: RUNNING`);
          } else {
            this.log(`⚠️ Service ${service}: NOT RUNNING`);
          }
          resolve();
        });
      });
    }
    
    // Check PM2 backend
    await new Promise((resolve) => {
      exec('pm2 list | grep "n0de-backend.*online"', (error) => {
        if (!error) {
          this.log('✅ Backend (PM2): RUNNING');
        } else {
          this.log('⚠️ Backend (PM2): NOT RUNNING');
        }
        resolve();
      });
    });
  }
  
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      exec(`curl -s -w '%{http_code}' -o /dev/null "${url}" --max-time 5`, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve({ status: parseInt(stdout) });
        }
      });
    });
  }
  
  async run() {
    this.log('🔍 Starting payment system monitoring...');
    
    try {
      await this.checkApiEndpoints();
      await this.checkDatabase();
      await this.checkPaymentFailures();
      await this.checkServices();
      
      this.log('✅ Payment system monitoring completed');
    } catch (error) {
      this.log(`❌ Monitoring error: ${error.message}`);
    }
  }
}

// For Claude Code agent execution
async function execute() {
  const monitor = new PaymentMonitor();
  await monitor.run();
}

module.exports = { PaymentMonitor, execute };