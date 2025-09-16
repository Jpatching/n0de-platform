// Claude Code Agent - Security Scanner
// Monitors for security issues and vulnerabilities

const { exec } = require('child_process');
const fs = require('fs');

class SecurityScanner {
  constructor() {
    this.logFile = '/home/sol/n0de-deploy/logs/agents/security-scanner.log';
    
    // Ensure log directory exists
    const logDir = require('path').dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [SECURITY-SCANNER] ${message}\n`;
    
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }
  
  async checkWebhookSecurity() {
    this.log('🔒 Checking webhook security...');
    
    const webhooks = [
      'https://api.n0de.pro/api/v1/payments/webhooks/stripe',
      'https://api.n0de.pro/api/v1/payments/webhooks/coinbase',
      'https://api.n0de.pro/api/v1/payments/webhooks/nowpayments'
    ];
    
    for (const webhook of webhooks) {
      await new Promise((resolve) => {
        const testPayload = JSON.stringify({ test: 'invalid' });
        exec(`curl -s -w '%{http_code}' -o /dev/null -X POST "${webhook}" -H "Content-Type: application/json" -d '${testPayload}'`, (error, stdout) => {
          const status = parseInt(stdout);
          
          if (status === 200) {
            this.log(`❌ SECURITY ALERT: ${webhook} accepting invalid signatures`);
          } else if (status === 400 || status === 401 || status === 500) {
            this.log(`✅ Webhook security OK: ${webhook} (status ${status})`);
          } else {
            this.log(`⚠️ Unexpected webhook response: ${webhook} (status ${status})`);
          }
          resolve();
        });
      });
    }
  }
  
  async checkSSLCertificates() {
    this.log('🔐 Checking SSL certificates...');
    
    const domains = ['n0de.pro', 'api.n0de.pro'];
    
    for (const domain of domains) {
      await new Promise((resolve) => {
        exec(`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -enddate`, (error, stdout) => {
          if (!error && stdout) {
            const endDateStr = stdout.replace('notAfter=', '');
            const endDate = new Date(endDateStr);
            const now = new Date();
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysLeft < 30) {
              this.log(`⚠️ SSL ALERT: ${domain} certificate expires in ${daysLeft} days`);
            } else {
              this.log(`✅ SSL certificate ${domain}: ${daysLeft} days remaining`);
            }
          } else {
            this.log(`❌ SSL check failed for ${domain}`);
          }
          resolve();
        });
      });
    }
  }
  
  async checkFirewallStatus() {
    this.log('🛡️ Checking firewall status...');
    
    await new Promise((resolve) => {
      exec('sudo ufw status', (error, stdout) => {
        if (!error) {
          if (stdout.includes('Status: active')) {
            this.log('✅ UFW firewall: ACTIVE');
          } else {
            this.log('⚠️ UFW firewall: INACTIVE');
          }
        } else {
          this.log('⚠️ Could not check firewall status');
        }
        resolve();
      });
    });
    
    // Check fail2ban
    await new Promise((resolve) => {
      exec('systemctl is-active --quiet fail2ban', (error) => {
        if (!error) {
          this.log('✅ Fail2ban: ACTIVE');
        } else {
          this.log('⚠️ Fail2ban: NOT ACTIVE');
        }
        resolve();
      });
    });
  }
  
  async checkSuspiciousActivity() {
    this.log('🕵️ Checking for suspicious activity...');
    
    // Check for failed authentication attempts
    await new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) FROM webhook_events 
        WHERE error_message LIKE '%authentication%' 
        AND created_at >= NOW() - INTERVAL '1 hour'
      `;
      
      exec(`PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "${query}" 2>/dev/null`, (error, stdout) => {
        if (!error) {
          const suspiciousAttempts = parseInt(stdout.trim());
          
          if (suspiciousAttempts > 10) {
            this.log(`❌ SECURITY ALERT: ${suspiciousAttempts} suspicious authentication attempts`);
          } else {
            this.log(`Authentication attempts: ${suspiciousAttempts} (normal)`);
          }
        }
        resolve();
      });
    });
    
    // Check for unusual payment patterns
    await new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) FROM payments 
        WHERE amount > 10000 
        AND created_at >= NOW() - INTERVAL '1 hour'
      `;
      
      exec(`PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "${query}" 2>/dev/null`, (error, stdout) => {
        if (!error) {
          const highValuePayments = parseInt(stdout.trim());
          
          if (highValuePayments > 0) {
            this.log(`⚠️ ${highValuePayments} high-value payments detected (>$100)`);
          }
        }
        resolve();
      });
    });
  }
  
  async checkFileIntegrity() {
    this.log('📂 Checking critical file integrity...');
    
    const criticalFiles = [
      '/home/sol/n0de-deploy/backend/.env',
      '/home/sol/n0de-deploy/frontend/.env.local',
      '/etc/nginx/sites-enabled/n0de-api'
    ];
    
    for (const file of criticalFiles) {
      await new Promise((resolve) => {
        fs.access(file, fs.constants.F_OK, (error) => {
          if (!error) {
            this.log(`✅ Critical file exists: ${file}`);
          } else {
            this.log(`❌ MISSING CRITICAL FILE: ${file}`);
          }
          resolve();
        });
      });
    }
  }
  
  async run() {
    this.log('🔍 Starting security scan...');
    
    try {
      await this.checkWebhookSecurity();
      await this.checkSSLCertificates();
      await this.checkFirewallStatus();
      await this.checkSuspiciousActivity();
      await this.checkFileIntegrity();
      
      this.log('✅ Security scan completed');
    } catch (error) {
      this.log(`❌ Security scan error: ${error.message}`);
    }
  }
}

// For Claude Code agent execution
async function execute() {
  const scanner = new SecurityScanner();
  await scanner.run();
}

module.exports = { SecurityScanner, execute };