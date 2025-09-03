#!/usr/bin/env node

/**
 * N0DE Production Monitoring Dashboard
 * Real-time system health and metrics tracking
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ProductionMonitor {
  constructor() {
    this.baseURL = 'https://api.n0de.pro';
    this.frontendURL = 'https://www.n0de.pro';
    this.logFile = '/home/sol/n0de-deploy/logs/production-metrics.log';
    this.metricsHistory = [];
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  async startMonitoring() {
    console.log('🔴 N0DE Production Monitor - LIVE');
    console.log('==================================');
    console.log(`📊 Backend: ${this.baseURL}`);
    console.log(`🌐 Frontend: ${this.frontendURL}`);
    console.log(`📝 Logs: ${this.logFile}\n`);

    // Run initial check
    await this.checkSystemHealth();
    
    // Start continuous monitoring every 30 seconds
    setInterval(async () => {
      await this.checkSystemHealth();
    }, 30000);

    // Save metrics history every 5 minutes
    setInterval(() => {
      this.saveMetricsHistory();
    }, 300000);

    // Display dashboard every 10 seconds
    setInterval(() => {
      this.displayDashboard();
    }, 10000);
  }

  async checkSystemHealth() {
    const timestamp = new Date().toISOString();
    const metrics = {
      timestamp,
      backend: { status: 'unknown', responseTime: 0, uptime: 0 },
      frontend: { status: 'unknown', responseTime: 0 },
      overall: 'unknown'
    };

    try {
      // Test backend
      const backendStart = Date.now();
      const backendHealth = await this.makeRequest('/health');
      metrics.backend.responseTime = Date.now() - backendStart;
      
      if (backendHealth && backendHealth.status === 'ok') {
        metrics.backend.status = '✅ HEALTHY';
        metrics.backend.uptime = Math.floor(backendHealth.uptime / 3600); // hours
      } else {
        metrics.backend.status = '❌ DEGRADED';
      }

      // Test frontend
      const frontendStart = Date.now();
      const frontendResponse = await this.makeHTTPRequest(this.frontendURL);
      metrics.frontend.responseTime = Date.now() - frontendStart;
      
      if (frontendResponse && frontendResponse.includes('N0DE - Enterprise')) {
        metrics.frontend.status = '✅ HEALTHY';
      } else {
        metrics.frontend.status = '❌ DEGRADED';
      }

      // Overall status
      if (metrics.backend.status.includes('✅') && metrics.frontend.status.includes('✅')) {
        metrics.overall = '🟢 ALL SYSTEMS OPERATIONAL';
      } else {
        metrics.overall = '🟡 DEGRADED PERFORMANCE';
      }

    } catch (error) {
      metrics.backend.status = '🔴 DOWN';
      metrics.frontend.status = '🔴 DOWN';
      metrics.overall = '🔴 SYSTEM DOWN';
      this.logError(`Health check failed: ${error.message}`);
    }

    // Add to history (keep last 100 entries)
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    // Log metrics
    this.logMetrics(metrics);
  }

  displayDashboard() {
    if (this.metricsHistory.length === 0) return;

    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const uptime = this.calculateUptime();
    
    // Clear screen and show dashboard
    console.clear();
    console.log('🚀 N0DE PRODUCTION DASHBOARD - LIVE');
    console.log('=====================================');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log(`📈 Overall Status: ${latest.overall}`);
    console.log('');
    
    // Service Status
    console.log('🔧 SERVICE STATUS');
    console.log('─────────────────');
    console.log(`Backend:   ${latest.backend.status} (${latest.backend.responseTime}ms)`);
    console.log(`Frontend:  ${latest.frontend.status} (${latest.frontend.responseTime}ms)`);
    console.log(`Uptime:    ${latest.backend.uptime}h (Backend)`);
    console.log('');
    
    // Performance Metrics
    const avgBackendTime = this.calculateAverageResponseTime('backend');
    const avgFrontendTime = this.calculateAverageResponseTime('frontend');
    
    console.log('⚡ PERFORMANCE METRICS');
    console.log('─────────────────────');
    console.log(`Backend Avg:   ${avgBackendTime}ms (last 10 checks)`);
    console.log(`Frontend Avg:  ${avgFrontendTime}ms (last 10 checks)`);
    console.log(`Success Rate:  ${uptime}% (last hour)`);
    console.log('');
    
    // Recent Activity
    console.log('📊 RECENT ACTIVITY');
    console.log('──────────────────');
    const recentChecks = this.metricsHistory.slice(-5);
    recentChecks.forEach((check, i) => {
      const time = new Date(check.timestamp).toLocaleTimeString();
      const status = check.overall.includes('🟢') ? '✅' : 
                   check.overall.includes('🟡') ? '⚠️' : '❌';
      console.log(`${time}: ${status} Backend:${check.backend.responseTime}ms Frontend:${check.frontend.responseTime}ms`);
    });
    
    console.log('');
    console.log('🔄 Refreshing every 10 seconds...');
    console.log('📝 Full logs saved to:', this.logFile);
  }

  calculateUptime() {
    if (this.metricsHistory.length < 10) return 100;
    
    const recent = this.metricsHistory.slice(-60); // Last hour (60 checks at 30s intervals)
    const healthy = recent.filter(m => m.overall.includes('🟢')).length;
    return Math.round((healthy / recent.length) * 100);
  }

  calculateAverageResponseTime(service) {
    if (this.metricsHistory.length === 0) return 0;
    
    const recent = this.metricsHistory.slice(-10); // Last 10 checks
    const times = recent.map(m => m[service].responseTime).filter(t => t > 0);
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b) / times.length) : 0;
  }

  logMetrics(metrics) {
    const logEntry = {
      timestamp: metrics.timestamp,
      backend_status: metrics.backend.status,
      backend_ms: metrics.backend.responseTime,
      frontend_status: metrics.frontend.status,
      frontend_ms: metrics.frontend.responseTime,
      overall: metrics.overall,
      uptime_hours: metrics.backend.uptime
    };

    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  logError(message) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message
    };
    fs.appendFileSync(this.logFile, JSON.stringify(errorEntry) + '\n');
  }

  saveMetricsHistory() {
    const historyFile = '/home/sol/n0de-deploy/logs/metrics-history.json';
    fs.writeFileSync(historyFile, JSON.stringify(this.metricsHistory, null, 2));
  }

  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}${path}`;
      const options = new URL(url);
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  async makeHTTPRequest(url) {
    return new Promise((resolve, reject) => {
      const options = new URL(url);
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            resolve(null);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }
}

// Main execution
async function main() {
  const monitor = new ProductionMonitor();
  await monitor.startMonitoring();
}

if (require.main === module) {
  console.log('Starting N0DE Production Monitor...');
  main().catch(error => {
    console.error('Monitor failed:', error);
    process.exit(1);
  });
}

module.exports = { ProductionMonitor };