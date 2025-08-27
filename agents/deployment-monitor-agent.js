#!/usr/bin/env node

/**
 * Deployment Monitor Agent
 * Automatically monitors Railway deployment status and health
 */

import axios from 'axios';
import chalk from 'chalk';

class DeploymentMonitorAgent {
  constructor(config = {}) {
    this.config = {
      railwayUrl: config.railwayUrl || 'https://n0de-backend-production-4e34.up.railway.app',
      vercelUrl: config.vercelUrl || 'https://n0de-website-umber.vercel.app',
      checkInterval: config.checkInterval || 30000, // 30 seconds
      maxRetries: config.maxRetries || 10,
      alertWebhook: config.alertWebhook || null
    };
    
    this.status = {
      railway: 'unknown',
      vercel: 'unknown',
      lastCheck: null,
      errors: []
    };
  }

  async checkRailwayHealth() {
    try {
      const response = await axios.get(`${this.config.railwayUrl}/health`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        this.status.railway = 'healthy';
        console.log(chalk.green('✅ Railway: Healthy'));
        return true;
      } else {
        this.status.railway = 'unhealthy';
        console.log(chalk.yellow(`⚠️ Railway: Status ${response.status}`));
        return false;
      }
    } catch (error) {
      this.status.railway = 'error';
      this.status.errors.push({
        service: 'railway',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`❌ Railway: ${error.message}`));
      return false;
    }
  }

  async checkVercelHealth() {
    try {
      const response = await axios.get(this.config.vercelUrl, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        this.status.vercel = 'healthy';
        console.log(chalk.green('✅ Vercel: Healthy'));
        return true;
      } else {
        this.status.vercel = 'unhealthy';
        console.log(chalk.yellow(`⚠️ Vercel: Status ${response.status}`));
        return false;
      }
    } catch (error) {
      this.status.vercel = 'error';
      this.status.errors.push({
        service: 'vercel',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`❌ Vercel: ${error.message}`));
      return false;
    }
  }

  async performHealthCheck() {
    console.log(chalk.blue('\n🔍 Performing deployment health check...'));
    
    const railwayHealthy = await this.checkRailwayHealth();
    const vercelHealthy = await this.checkVercelHealth();
    
    this.status.lastCheck = new Date().toISOString();
    
    // Alert if issues detected
    if (!railwayHealthy || !vercelHealthy) {
      await this.sendAlert({
        level: 'warning',
        message: 'Deployment health check failed',
        railway: this.status.railway,
        vercel: this.status.vercel,
        errors: this.status.errors
      });
    }
    
    return {
      railway: railwayHealthy,
      vercel: vercelHealthy,
      timestamp: this.status.lastCheck
    };
  }

  async sendAlert(alertData) {
    if (!this.config.alertWebhook) {
      console.log(chalk.yellow('⚠️ No alert webhook configured'));
      return;
    }
    
    try {
      await axios.post(this.config.alertWebhook, alertData);
      console.log(chalk.blue('📨 Alert sent'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to send alert:'), error.message);
    }
  }

  async waitForDeployment() {
    console.log(chalk.blue('⏳ Waiting for Railway deployment to complete...'));
    
    let attempts = 0;
    while (attempts < this.config.maxRetries) {
      attempts++;
      console.log(chalk.yellow(`Attempt ${attempts}/${this.config.maxRetries}`));
      
      const healthy = await this.checkRailwayHealth();
      if (healthy) {
        console.log(chalk.green('🎉 Railway deployment successful!'));
        return true;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, this.config.checkInterval));
    }
    
    console.error(chalk.red('❌ Railway deployment timeout'));
    return false;
  }

  startMonitoring() {
    console.log(chalk.blue.bold('🤖 Deployment Monitor Agent Started'));
    console.log(chalk.cyan(`Monitoring: ${this.config.railwayUrl}`));
    console.log(chalk.cyan(`Frontend: ${this.config.vercelUrl}`));
    
    // Initial check
    this.performHealthCheck();
    
    // Schedule regular checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  getStatus() {
    return {
      ...this.status,
      uptime: this.status.lastCheck 
        ? Date.now() - new Date(this.status.lastCheck).getTime()
        : 0
    };
  }
}

// Export for use as module
export default DeploymentMonitorAgent;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new DeploymentMonitorAgent();
  agent.startMonitoring();
}