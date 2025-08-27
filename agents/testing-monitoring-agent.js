#!/usr/bin/env node

/**
 * Testing & Monitoring Agent
 * Automated testing, performance monitoring, and health checks
 */

import axios from 'axios';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import chalk from 'chalk';

class TestingMonitoringAgent {
  constructor(config = {}) {
    this.config = {
      endpoints: {
        railway: config.railwayUrl || 'https://n0de-backend-production-4e34.up.railway.app',
        vercel: config.vercelUrl || 'https://n0de-website-umber.vercel.app',
        localAdmin: 'http://localhost:3002',
        localUser: 'http://localhost:3004',
        localPayment: 'http://localhost:3005'
      },
      testInterval: config.testInterval || 300000, // 5 minutes
      alertThreshold: config.alertThreshold || 3, // failures before alert
      performanceThreshold: config.performanceThreshold || 2000, // 2 seconds
      maxRetries: config.maxRetries || 3
    };
    
    this.metrics = {
      uptime: new Map(),
      responseTime: new Map(),
      errorCount: new Map(),
      lastTests: new Map(),
      alerts: []
    };
    
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  async testEndpoint(name, url, expectedStatus = 200, timeout = 10000) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout,
        validateStatus: () => true,
        headers: { 'User-Agent': 'n0de-testing-agent' }
      });
      
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      this.updateMetrics(name, true, responseTime);
      
      const success = response.status === expectedStatus;
      const performanceGood = responseTime < this.config.performanceThreshold;
      
      return {
        success,
        status: response.status,
        responseTime,
        performanceGood,
        data: response.data,
        url
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(name, false, responseTime);
      
      return {
        success: false,
        status: null,
        responseTime,
        performanceGood: false,
        error: error.message,
        url
      };
    }
  }

  updateMetrics(serviceName, success, responseTime) {
    // Update uptime
    if (!this.metrics.uptime.has(serviceName)) {
      this.metrics.uptime.set(serviceName, { up: 0, total: 0 });
    }
    const uptime = this.metrics.uptime.get(serviceName);
    uptime.total++;
    if (success) uptime.up++;
    
    // Update response time
    if (!this.metrics.responseTime.has(serviceName)) {
      this.metrics.responseTime.set(serviceName, []);
    }
    const responseTimes = this.metrics.responseTime.get(serviceName);
    responseTimes.push(responseTime);
    if (responseTimes.length > 100) responseTimes.shift(); // Keep last 100
    
    // Update error count
    if (!success) {
      if (!this.metrics.errorCount.has(serviceName)) {
        this.metrics.errorCount.set(serviceName, 0);
      }
      this.metrics.errorCount.set(serviceName, this.metrics.errorCount.get(serviceName) + 1);
    }
    
    this.metrics.lastTests.set(serviceName, new Date());
  }

  async runHealthTests() {
    console.log(chalk.blue('🏥 Running comprehensive health tests...'));
    
    const tests = [
      { name: 'Railway Backend', url: `${this.config.endpoints.railway}/health` },
      { name: 'Railway API', url: `${this.config.endpoints.railway}/api` },
      { name: 'Vercel Frontend', url: this.config.endpoints.vercel },
      { name: 'Local Admin', url: `${this.config.endpoints.localAdmin}/api/stats` },
      { name: 'Local User API', url: `${this.config.endpoints.localUser}/health` },
      { name: 'Local Payment', url: `${this.config.endpoints.localPayment}/health` }
    ];
    
    const results = await Promise.all(
      tests.map(test => this.testEndpoint(test.name, test.url))
    );
    
    // Analyze results
    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      avgResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    };
    
    // Update overall test results
    this.testResults.total += summary.total;
    this.testResults.passed += summary.passed;
    this.testResults.failed += summary.failed;
    
    // Check for alerts
    results.forEach((result, index) => {
      if (!result.success || !result.performanceGood) {
        this.checkAlert(tests[index].name, result);
      }
    });
    
    return { results, summary };
  }

  checkAlert(serviceName, result) {
    const errorCount = this.metrics.errorCount.get(serviceName) || 0;
    
    if (errorCount >= this.config.alertThreshold) {
      const alert = {
        service: serviceName,
        type: result.success ? 'performance' : 'availability',
        message: result.success 
          ? `Slow response: ${result.responseTime}ms` 
          : `Service down: ${result.error}`,
        timestamp: new Date(),
        count: errorCount
      };
      
      this.metrics.alerts.push(alert);
      console.log(chalk.red(`🚨 ALERT: ${alert.service} - ${alert.message}`));
    }
  }

  async runPerformanceTests() {
    console.log(chalk.blue('⚡ Running performance tests...'));
    
    try {
      // Load test local services (if available)
      const loadTestResults = await this.simulateLoad();
      
      // Memory usage check
      const memoryUsage = process.memoryUsage();
      
      // Database performance (if applicable)
      const dbPerformance = await this.testDatabasePerformance();
      
      return {
        loadTest: loadTestResults,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        database: dbPerformance
      };
      
    } catch (error) {
      console.error(chalk.red('❌ Performance test failed:'), error.message);
      return null;
    }
  }

  async simulateLoad() {
    const testUrl = `${this.config.endpoints.localAdmin}/api/stats`;
    const concurrency = 10;
    const requests = 50;
    
    console.log(chalk.yellow(`  Testing ${requests} requests with ${concurrency} concurrent connections...`));
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < requests; i++) {
      promises.push(
        axios.get(testUrl, { timeout: 5000 }).catch(err => ({ error: err.message }))
      );
      
      // Control concurrency
      if (promises.length >= concurrency) {
        await Promise.all(promises.splice(0, concurrency));
      }
    }
    
    // Wait for remaining requests
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    const totalTime = Date.now() - startTime;
    const avgResponseTime = totalTime / requests;
    const requestsPerSecond = (requests / (totalTime / 1000)).toFixed(2);
    
    console.log(chalk.green(`  ✅ Load test completed: ${avgResponseTime.toFixed(2)}ms avg, ${requestsPerSecond} req/s`));
    
    return {
      requests,
      concurrency,
      totalTime,
      avgResponseTime,
      requestsPerSecond
    };
  }

  async testDatabasePerformance() {
    try {
      // Simple database connectivity test
      const dbTest = await axios.get(`${this.config.endpoints.localAdmin}/api/users`, { timeout: 5000 });
      return {
        connected: dbTest.status === 200,
        responseTime: dbTest.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async runSecurityTests() {
    console.log(chalk.blue('🔒 Running security tests...'));
    
    const securityTests = [
      {
        name: 'CORS Headers',
        test: async () => {
          const response = await axios.options(this.config.endpoints.railway, {
            headers: { 'Origin': 'https://malicious-site.com' }
          });
          return response.headers['access-control-allow-origin'] !== '*';
        }
      },
      {
        name: 'Rate Limiting',
        test: async () => {
          // Quick burst test
          const promises = Array(20).fill().map(() => 
            axios.get(`${this.config.endpoints.localUser}/health`)
          );
          const results = await Promise.allSettled(promises);
          return results.some(r => r.value?.status === 429); // Some should be rate limited
        }
      },
      {
        name: 'SQL Injection Protection',
        test: async () => {
          try {
            const response = await axios.get(
              `${this.config.endpoints.localAdmin}/api/users?id=1'; DROP TABLE users; --`
            );
            return response.status !== 500; // Should not cause server error
          } catch (error) {
            return error.response?.status !== 500;
          }
        }
      }
    ];
    
    const results = [];
    for (const test of securityTests) {
      try {
        const passed = await test.test();
        results.push({ name: test.name, passed, error: null });
        console.log(passed ? chalk.green(`  ✅ ${test.name}`) : chalk.red(`  ❌ ${test.name}`));
      } catch (error) {
        results.push({ name: test.name, passed: false, error: error.message });
        console.log(chalk.red(`  ❌ ${test.name}: ${error.message}`));
      }
    }
    
    return results;
  }

  generateReport() {
    console.log(chalk.blue.bold('\\n📊 Testing & Monitoring Report'));
    console.log('='.repeat(60));
    
    // Overall test statistics
    const passRate = this.testResults.total > 0 
      ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(1)
      : 0;
    
    console.log(chalk.cyan('\\n📈 Test Statistics:'));
    console.log(`  Total Tests: ${this.testResults.total}`);
    console.log(`  Passed: ${chalk.green(this.testResults.passed)}`);
    console.log(`  Failed: ${chalk.red(this.testResults.failed)}`);
    console.log(`  Pass Rate: ${passRate}%`);
    
    // Service uptime
    console.log(chalk.cyan('\\n⏱️ Service Uptime:'));
    for (const [service, uptime] of this.metrics.uptime.entries()) {
      const uptimePercent = uptime.total > 0 ? ((uptime.up / uptime.total) * 100).toFixed(1) : 0;
      const color = uptimePercent > 99 ? chalk.green : uptimePercent > 95 ? chalk.yellow : chalk.red;
      console.log(`  ${service}: ${color(uptimePercent + '%')} (${uptime.up}/${uptime.total})`);
    }
    
    // Response times
    console.log(chalk.cyan('\\n🚀 Average Response Times:'));
    for (const [service, times] of this.metrics.responseTime.entries()) {
      if (times.length > 0) {
        const avgTime = (times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(0);
        const color = avgTime < 500 ? chalk.green : avgTime < 2000 ? chalk.yellow : chalk.red;
        console.log(`  ${service}: ${color(avgTime + 'ms')}`);
      }
    }
    
    // Recent alerts
    if (this.metrics.alerts.length > 0) {
      console.log(chalk.yellow('\\n🚨 Recent Alerts:'));
      this.metrics.alerts.slice(-5).forEach(alert => {
        console.log(`  ${alert.timestamp.toISOString()}: ${alert.service} - ${alert.message}`);
      });
    }
    
    // Health score
    let healthScore = 100;
    if (passRate < 90) healthScore -= 20;
    if (this.metrics.alerts.length > 5) healthScore -= 15;
    
    for (const [service, uptime] of this.metrics.uptime.entries()) {
      const uptimePercent = uptime.total > 0 ? (uptime.up / uptime.total) * 100 : 100;
      if (uptimePercent < 99) healthScore -= 10;
    }
    
    const scoreColor = healthScore >= 90 ? chalk.green : healthScore >= 70 ? chalk.yellow : chalk.red;
    console.log(chalk.blue('\\n🎯 Overall Health Score:'));
    console.log(scoreColor(`  ${Math.max(0, healthScore)}/100`));
    
    return {
      testStats: this.testResults,
      uptime: Object.fromEntries(this.metrics.uptime),
      responseTimes: Object.fromEntries(this.metrics.responseTime),
      alerts: this.metrics.alerts,
      healthScore: Math.max(0, healthScore)
    };
  }

  async runCompleteTest() {
    console.log(chalk.blue.bold('🤖 Testing & Monitoring Agent Started\\n'));
    
    // Run all test suites
    const healthResults = await this.runHealthTests();
    const performanceResults = await this.runPerformanceTests();
    const securityResults = await this.runSecurityTests();
    
    // Generate comprehensive report
    const report = this.generateReport();
    
    console.log(chalk.blue('\\n🌐 Service Status:'));
    healthResults.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const perf = result.performanceGood ? '⚡' : '🐌';
      console.log(`  ${icon} ${perf} ${result.url}: ${result.status || 'FAILED'} (${result.responseTime}ms)`);
    });
    
    return {
      health: healthResults,
      performance: performanceResults,
      security: securityResults,
      report
    };
  }

  startMonitoring() {
    console.log(chalk.blue.bold('🔄 Starting continuous monitoring...'));
    
    // Initial test
    this.runCompleteTest();
    
    // Schedule regular tests
    setInterval(() => {
      console.log(chalk.gray('\\n--- Scheduled Health Check ---'));
      this.runHealthTests();
    }, this.config.testInterval);
  }
}

// Export for use as module
export default TestingMonitoringAgent;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const continuous = process.argv.includes('--monitor');
  const agent = new TestingMonitoringAgent();
  
  if (continuous) {
    agent.startMonitoring();
  } else {
    agent.runCompleteTest();
  }
}