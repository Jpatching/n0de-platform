// Claude Code Agent - Deployment Checker
// Monitors deployment health and suggests optimizations

const { exec } = require('child_process');
const fs = require('fs');

class DeploymentChecker {
  constructor() {
    this.logFile = '/home/sol/n0de-deploy/logs/agents/deployment-checker.log';
    
    // Ensure log directory exists
    const logDir = require('path').dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [DEPLOYMENT-CHECKER] ${message}\n`;
    
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }
  
  async checkFrontendDeployment() {
    this.log('🌐 Checking frontend deployment...');
    
    const frontendChecks = [
      { url: 'https://n0de.pro', name: 'Main domain' },
      { url: 'https://n0de.pro/subscription', name: 'Subscription page' },
      { url: 'https://n0de.pro/payment/success', name: 'Payment success' },
      { url: 'https://n0de.pro/payment/cancel', name: 'Payment cancel' }
    ];
    
    for (const check of frontendChecks) {
      await new Promise((resolve) => {
        exec(`curl -s -w '%{http_code}' -o /dev/null "${check.url}" --max-time 10`, (error, stdout) => {
          const status = parseInt(stdout);
          
          if (status === 200) {
            this.log(`✅ ${check.name}: OK`);
          } else {
            this.log(`❌ ${check.name}: Status ${status}`);
          }
          resolve();
        });
      });
    }
    
    // Check www redirect
    await new Promise((resolve) => {
      exec('curl -s -I "https://www.n0de.pro" | grep -i location', (error, stdout) => {
        if (stdout.includes('https://n0de.pro/')) {
          this.log('✅ WWW redirect: Working correctly');
        } else {
          this.log('⚠️ WWW redirect: May need attention');
        }
        resolve();
      });
    });
  }
  
  async checkBackendDeployment() {
    this.log('⚙️ Checking backend deployment...');
    
    // Check PM2 status
    await new Promise((resolve) => {
      exec('pm2 show n0de-backend', (error, stdout) => {
        if (!error) {
          if (stdout.includes('online')) {
            const uptimeMatch = stdout.match(/uptime\s+│\s+([^│]+)/);
            const uptime = uptimeMatch ? uptimeMatch[1].trim() : 'unknown';
            this.log(`✅ Backend PM2: Online (uptime: ${uptime})`);
            
            // Check restart count
            const restartMatch = stdout.match(/restarts\s+│\s+(\d+)/);
            const restarts = restartMatch ? parseInt(restartMatch[1]) : 0;
            
            if (restarts > 50) {
              this.log(`⚠️ High restart count: ${restarts} restarts`);
            }
          } else {
            this.log('❌ Backend PM2: Not online');
          }
        } else {
          this.log('❌ Backend PM2: Error checking status');
        }
        resolve();
      });
    });
    
    // Check API endpoints
    const apiChecks = [
      { url: 'https://api.n0de.pro/health', name: 'Health endpoint' },
      { url: 'https://api.n0de.pro/api/v1/subscriptions/plans', name: 'Plans endpoint' }
    ];
    
    for (const check of apiChecks) {
      await new Promise((resolve) => {
        const startTime = Date.now();
        exec(`curl -s -w '%{http_code}' -o /dev/null "${check.url}" --max-time 10`, (error, stdout) => {
          const responseTime = Date.now() - startTime;
          const status = parseInt(stdout);
          
          if (status === 200) {
            this.log(`✅ ${check.name}: OK (${responseTime}ms)`);
            
            if (responseTime > 3000) {
              this.log(`⚠️ Slow response: ${check.name} took ${responseTime}ms`);
            }
          } else {
            this.log(`❌ ${check.name}: Status ${status}`);
          }
          resolve();
        });
      });
    }
  }
  
  async checkDatabasePerformance() {
    this.log('🗄️ Checking database performance...');
    
    // Check connection count
    await new Promise((resolve) => {
      exec('PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null', (error, stdout) => {
        if (!error) {
          const connections = parseInt(stdout.trim());
          this.log(`Database connections: ${connections}`);
          
          if (connections > 80) {
            this.log('⚠️ High database connection count');
          }
        }
        resolve();
      });
    });
    
    // Check slow queries
    await new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) FROM pg_stat_statements 
        WHERE mean_time > 1000 
        AND calls > 10
      `;
      
      exec(`PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -t -c "${query}" 2>/dev/null`, (error, stdout) => {
        if (!error) {
          const slowQueries = parseInt(stdout.trim());
          
          if (slowQueries > 0) {
            this.log(`⚠️ ${slowQueries} slow queries detected (>1s average)`);
          } else {
            this.log('✅ No slow queries detected');
          }
        }
        resolve();
      });
    });
  }
  
  async checkSystemResources() {
    this.log('💻 Checking system resources...');
    
    // CPU usage
    await new Promise((resolve) => {
      exec('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | awk -F\'%\' \'{print $1}\'', (error, stdout) => {
        if (!error) {
          const cpuUsage = parseFloat(stdout.trim());
          
          if (cpuUsage > 80) {
            this.log(`⚠️ High CPU usage: ${cpuUsage}%`);
          } else {
            this.log(`CPU usage: ${cpuUsage}%`);
          }
        }
        resolve();
      });
    });
    
    // Memory usage
    await new Promise((resolve) => {
      exec('free | grep Mem | awk \'{printf("%.1f", $3/$2 * 100.0)}\'', (error, stdout) => {
        if (!error) {
          const memoryUsage = parseFloat(stdout.trim());
          
          if (memoryUsage > 85) {
            this.log(`⚠️ High memory usage: ${memoryUsage}%`);
          } else {
            this.log(`Memory usage: ${memoryUsage}%`);
          }
        }
        resolve();
      });
    });
    
    // Disk usage
    await new Promise((resolve) => {
      exec('df -h / | awk \'NR==2 {print $5}\' | sed \'s/%//\'', (error, stdout) => {
        if (!error) {
          const diskUsage = parseInt(stdout.trim());
          
          if (diskUsage > 85) {
            this.log(`⚠️ High disk usage: ${diskUsage}%`);
          } else {
            this.log(`Disk usage: ${diskUsage}%`);
          }
        }
        resolve();
      });
    });
  }
  
  async checkRecentDeployments() {
    this.log('📦 Checking recent deployments...');
    
    // Check if there were recent changes that might need deployment
    const gitCheck = await new Promise((resolve) => {
      exec('cd /home/sol/n0de-deploy && git status --porcelain', (error, stdout) => {
        if (!error) {
          if (stdout.trim()) {
            this.log('💡 Uncommitted changes detected - consider committing and deploying');
          } else {
            this.log('✅ Working directory clean');
          }
        }
        resolve();
      });
    });
    
    // Check last deployment time (based on PM2 restart)
    await new Promise((resolve) => {
      exec('pm2 show n0de-backend | grep "created at"', (error, stdout) => {
        if (!error && stdout) {
          this.log(`Last backend restart: ${stdout.split('│')[1]?.trim() || 'unknown'}`);
        }
        resolve();
      });
    });
  }
  
  async run() {
    this.log('🔍 Starting deployment health check...');
    
    try {
      await this.checkFrontendDeployment();
      await this.checkBackendDeployment();
      await this.checkDatabasePerformance();
      await this.checkSystemResources();
      await this.checkRecentDeployments();
      
      this.log('✅ Deployment health check completed');
    } catch (error) {
      this.log(`❌ Deployment check error: ${error.message}`);
    }
  }
}

// For Claude Code agent execution
async function execute() {
  const checker = new DeploymentChecker();
  await checker.run();
}

module.exports = { DeploymentChecker, execute };