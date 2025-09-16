#!/usr/bin/env node
/**
 * Business Intelligence Dashboard
 * Real-time revenue tracking, user growth, API usage patterns, and predictive analytics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BusinessIntelligenceDashboard {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.reportPath = path.join(__dirname, '../reports/business');
    this.config = {
      apiBaseUrl: 'https://api.n0de.pro/api/v1',
      updateInterval: 60000, // 1 minute
      retentionDays: 90
    };
    
    this.ensureDirectories();
    this.metrics = this.initializeMetrics();
  }

  ensureDirectories() {
    [this.dataPath, this.reportPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  initializeMetrics() {
    return {
      revenue: {
        daily: 0,
        monthly: 0,
        total: 0,
        projectedMonthly: 0
      },
      users: {
        total: 0,
        activeDaily: 0,
        newToday: 0,
        churnRate: 0,
        growthRate: 0
      },
      api: {
        totalRequests: 0,
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topEndpoints: []
      },
      subscriptions: {
        starter: 0,
        professional: 0,
        enterprise: 0,
        conversionRate: 0
      },
      predictions: {
        revenue30Day: 0,
        userGrowth30Day: 0,
        churnProbability: 0
      }
    };
  }

  async collectRealTimeMetrics() {
    console.log('📊 Collecting real-time business metrics...');

    try {
      // Revenue metrics
      await this.collectRevenueMetrics();
      
      // User analytics
      await this.collectUserMetrics();
      
      // API usage analytics
      await this.collectAPIMetrics();
      
      // Subscription analytics
      await this.collectSubscriptionMetrics();
      
      // Generate predictions
      await this.generatePredictiveAnalytics();
      
      // Save timestamped snapshot
      this.saveMetricsSnapshot();
      
      return this.metrics;
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
      throw error;
    }
  }

  async collectRevenueMetrics() {
    try {
      // Get payment data from backend
      const paymentsResponse = await this.apiCall('/payments/analytics');
      
      if (paymentsResponse) {
        this.metrics.revenue = {
          daily: paymentsResponse.dailyRevenue || 0,
          monthly: paymentsResponse.monthlyRevenue || 0,
          total: paymentsResponse.totalRevenue || 0,
          projectedMonthly: this.calculateMonthlyProjection(paymentsResponse.dailyRevenue)
        };
      }
      
      console.log(`💰 Revenue: $${this.metrics.revenue.daily} today, $${this.metrics.revenue.monthly} this month`);
      
    } catch (error) {
      console.error('⚠️  Revenue metrics collection failed');
    }
  }

  async collectUserMetrics() {
    try {
      // Get user analytics from backend
      const userResponse = await this.apiCall('/analytics/users');
      
      if (userResponse) {
        this.metrics.users = {
          total: userResponse.totalUsers || 0,
          activeDaily: userResponse.dailyActiveUsers || 0,
          newToday: userResponse.newUsersToday || 0,
          churnRate: userResponse.churnRate || 0,
          growthRate: this.calculateGrowthRate(userResponse.historicalData)
        };
      }
      
      console.log(`👥 Users: ${this.metrics.users.total} total, ${this.metrics.users.activeDaily} active today`);
      
    } catch (error) {
      console.error('⚠️  User metrics collection failed');
    }
  }

  async collectAPIMetrics() {
    try {
      // Get API performance metrics
      const metricsResponse = await this.apiCall('/metrics/performance');
      
      if (metricsResponse) {
        this.metrics.api = {
          totalRequests: metricsResponse.totalRequests || 0,
          requestsPerSecond: metricsResponse.requestsPerSecond || 0,
          averageResponseTime: metricsResponse.averageResponseTime || 0,
          errorRate: metricsResponse.errorRate || 0,
          topEndpoints: metricsResponse.topEndpoints || []
        };
      }
      
      console.log(`⚡ API: ${this.metrics.api.totalRequests} requests, ${this.metrics.api.averageResponseTime}ms avg`);
      
    } catch (error) {
      console.error('⚠️  API metrics collection failed');
    }
  }

  async collectSubscriptionMetrics() {
    try {
      // Get subscription analytics
      const subsResponse = await this.apiCall('/subscriptions/analytics');
      
      if (subsResponse) {
        this.metrics.subscriptions = {
          starter: subsResponse.starterCount || 0,
          professional: subsResponse.professionalCount || 0,
          enterprise: subsResponse.enterpriseCount || 0,
          conversionRate: subsResponse.conversionRate || 0
        };
      }
      
      const totalSubs = this.metrics.subscriptions.starter + 
                       this.metrics.subscriptions.professional + 
                       this.metrics.subscriptions.enterprise;
      
      console.log(`💎 Subscriptions: ${totalSubs} total (${this.metrics.subscriptions.conversionRate}% conversion)`);
      
    } catch (error) {
      console.error('⚠️  Subscription metrics collection failed');
    }
  }

  async generatePredictiveAnalytics() {
    console.log('🔮 Generating predictive analytics...');
    
    // Load historical data for predictions
    const historicalData = this.loadHistoricalMetrics();
    
    // Revenue prediction (simple linear regression based on trend)
    this.metrics.predictions.revenue30Day = this.predictRevenue(historicalData);
    
    // User growth prediction
    this.metrics.predictions.userGrowth30Day = this.predictUserGrowth(historicalData);
    
    // Churn probability (based on usage patterns)
    this.metrics.predictions.churnProbability = this.calculateChurnProbability(historicalData);
  }

  predictRevenue(historicalData) {
    if (!historicalData || historicalData.length < 7) return 0;
    
    // Simple trend analysis - last 7 days
    const recentRevenue = historicalData.slice(-7).map(d => d.revenue?.daily || 0);
    const avgDailyRevenue = recentRevenue.reduce((sum, rev) => sum + rev, 0) / recentRevenue.length;
    
    // Calculate trend
    let trend = 1.0;
    if (recentRevenue.length >= 3) {
      const early = recentRevenue.slice(0, 3).reduce((sum, rev) => sum + rev, 0) / 3;
      const recent = recentRevenue.slice(-3).reduce((sum, rev) => sum + rev, 0) / 3;
      trend = recent > 0 ? recent / early : 1.0;
    }
    
    return Math.round(avgDailyRevenue * 30 * trend);
  }

  predictUserGrowth(historicalData) {
    if (!historicalData || historicalData.length < 7) return 0;
    
    // Analyze user growth trend
    const userGrowth = historicalData.slice(-7).map(d => d.users?.newToday || 0);
    const avgDailyGrowth = userGrowth.reduce((sum, growth) => sum + growth, 0) / userGrowth.length;
    
    return Math.round(avgDailyGrowth * 30);
  }

  calculateChurnProbability(historicalData) {
    if (!historicalData || historicalData.length < 7) return 0;
    
    // Simple churn calculation based on active user trends
    const activeUsers = historicalData.slice(-7).map(d => d.users?.activeDaily || 0);
    const totalUsers = historicalData.slice(-7).map(d => d.users?.total || 0);
    
    if (totalUsers.length < 2) return 0;
    
    const engagementRate = activeUsers[activeUsers.length - 1] / totalUsers[totalUsers.length - 1];
    return Math.max(0, Math.min(1, 1 - engagementRate)) * 100;
  }

  calculateGrowthRate(historicalData) {
    if (!historicalData || historicalData.length < 30) return 0;
    
    const thirtyDaysAgo = historicalData[0]?.totalUsers || 0;
    const today = historicalData[historicalData.length - 1]?.totalUsers || 0;
    
    return thirtyDaysAgo > 0 ? ((today - thirtyDaysAgo) / thirtyDaysAgo * 100) : 0;
  }

  calculateMonthlyProjection(dailyRevenue) {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - new Date().getDate();
    
    return Math.round(dailyRevenue * daysRemaining);
  }

  async apiCall(endpoint) {
    try {
      const response = execSync(`curl -s "${this.config.apiBaseUrl}${endpoint}"`, { 
        encoding: 'utf8',
        timeout: 10000 
      });
      
      return JSON.parse(response);
    } catch (error) {
      // Return null if API call fails (service might be down)
      return null;
    }
  }

  saveMetricsSnapshot() {
    const timestamp = new Date().toISOString();
    const snapshot = {
      timestamp,
      metrics: { ...this.metrics }
    };
    
    // Save daily snapshot
    const dailyFile = path.join(this.dataPath, `metrics-${timestamp.split('T')[0]}.json`);
    fs.writeFileSync(dailyFile, JSON.stringify(snapshot, null, 2));
    
    // Update latest metrics
    fs.writeFileSync(
      path.join(this.dataPath, 'latest-metrics.json'),
      JSON.stringify(snapshot, null, 2)
    );

    // Cleanup old files (keep 90 days)
    this.cleanupOldMetrics();
  }

  cleanupOldMetrics() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const files = fs.readdirSync(this.dataPath)
      .filter(f => f.startsWith('metrics-') && f.endsWith('.json'));
      
    files.forEach(file => {
      const fileDate = file.match(/metrics-(\d{4}-\d{2}-\d{2})\.json/)?.[1];
      if (fileDate && new Date(fileDate) < cutoffDate) {
        fs.unlinkSync(path.join(this.dataPath, file));
      }
    });
  }

  loadHistoricalMetrics() {
    const files = fs.readdirSync(this.dataPath)
      .filter(f => f.startsWith('metrics-') && f.endsWith('.json'))
      .sort()
      .slice(-30); // Last 30 days

    return files.map(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.dataPath, file), 'utf8'));
        return data.metrics;
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  generateBusinessReport() {
    const timestamp = new Date().toISOString();
    const historicalData = this.loadHistoricalMetrics();
    
    const report = `# N0DE Business Intelligence Report
Generated: ${timestamp}

## 💰 Revenue Analytics
- **Today**: $${this.metrics.revenue.daily}
- **This Month**: $${this.metrics.revenue.monthly}
- **Total Revenue**: $${this.metrics.revenue.total}
- **Projected Monthly**: $${this.metrics.revenue.projectedMonthly}

## 👥 User Growth
- **Total Users**: ${this.metrics.users.total.toLocaleString()}
- **Active Today**: ${this.metrics.users.activeDaily.toLocaleString()}
- **New Today**: ${this.metrics.users.newToday}
- **Growth Rate**: ${this.metrics.users.growthRate.toFixed(1)}% (30-day)
- **Churn Risk**: ${this.metrics.predictions.churnProbability.toFixed(1)}%

## ⚡ API Performance
- **Total Requests**: ${this.metrics.api.totalRequests.toLocaleString()}
- **Requests/Second**: ${this.metrics.api.requestsPerSecond}
- **Avg Response**: ${this.metrics.api.averageResponseTime}ms
- **Error Rate**: ${this.metrics.api.errorRate.toFixed(2)}%

### Top API Endpoints
${this.metrics.api.topEndpoints.map((ep, i) => 
  `${i + 1}. ${ep.endpoint} - ${ep.requests.toLocaleString()} requests`
).join('\n')}

## 💎 Subscription Analytics
- **Starter**: ${this.metrics.subscriptions.starter}
- **Professional**: ${this.metrics.subscriptions.professional}  
- **Enterprise**: ${this.metrics.subscriptions.enterprise}
- **Conversion Rate**: ${this.metrics.subscriptions.conversionRate.toFixed(1)}%

## 🔮 30-Day Predictions
- **Projected Revenue**: $${this.metrics.predictions.revenue30Day}
- **Projected User Growth**: +${this.metrics.predictions.userGrowth30Day} users
- **Churn Risk**: ${this.metrics.predictions.churnProbability.toFixed(1)}%

## 📈 Key Performance Indicators (KPIs)

### Revenue KPIs
- **Monthly Recurring Revenue (MRR)**: $${this.calculateMRR()}
- **Average Revenue Per User (ARPU)**: $${this.calculateARPU()}
- **Customer Lifetime Value (CLV)**: $${this.calculateCLV()}

### Growth KPIs  
- **Daily Active Users (DAU)**: ${this.metrics.users.activeDaily}
- **Monthly Active Users (MAU)**: ${this.estimateMAU()}
- **User Acquisition Cost (CAC)**: $${this.calculateCAC()}

### Technical KPIs
- **API Uptime**: ${this.calculateUptime()}%
- **Response Time SLA**: ${this.metrics.api.averageResponseTime < 500 ? '✅' : '❌'} (<500ms)
- **Error Rate SLA**: ${this.metrics.api.errorRate < 1 ? '✅' : '❌'} (<1%)

## 🎯 Business Recommendations

${this.generateBusinessRecommendations().map(rec => `### ${rec.priority.toUpperCase()}: ${rec.title}
${rec.description}
**Action**: ${rec.action}
**Expected Impact**: ${rec.impact}`).join('\n\n')}

## 📊 Trends & Insights

${this.generateTrendAnalysis(historicalData)}

---
*Generated by Business Intelligence Dashboard*
*Next update: ${new Date(Date.now() + this.config.updateInterval).toISOString()}*
`;

    // Save report
    const reportFile = path.join(this.reportPath, `business-report-${Date.now()}.md`);
    fs.writeFileSync(reportFile, report);
    
    // Save as latest
    fs.writeFileSync(path.join(this.reportPath, 'latest-business-report.md'), report);
    
    return report;
  }

  calculateMRR() {
    // Monthly Recurring Revenue
    const starter = this.metrics.subscriptions.starter * 29; // $29/month
    const professional = this.metrics.subscriptions.professional * 99; // $99/month  
    const enterprise = this.metrics.subscriptions.enterprise * 299; // $299/month
    
    return starter + professional + enterprise;
  }

  calculateARPU() {
    // Average Revenue Per User
    const totalSubs = this.metrics.subscriptions.starter + 
                     this.metrics.subscriptions.professional + 
                     this.metrics.subscriptions.enterprise;
                     
    return totalSubs > 0 ? this.calculateMRR() / totalSubs : 0;
  }

  calculateCLV() {
    // Customer Lifetime Value (simplified)
    const avgMonthlyRevenue = this.calculateMRR() / Math.max(1, this.metrics.users.total);
    const avgLifetimeMonths = this.metrics.users.churnRate > 0 ? 1 / (this.metrics.users.churnRate / 100) : 12;
    
    return avgMonthlyRevenue * avgLifetimeMonths;
  }

  estimateMAU() {
    // Estimate Monthly Active Users (simplified)
    return Math.round(this.metrics.users.activeDaily * 20); // Rough estimation
  }

  calculateCAC() {
    // Customer Acquisition Cost (would need marketing spend data)
    // Simplified calculation based on new users
    const estimatedMarketingSpend = 1000; // Placeholder
    return this.metrics.users.newToday > 0 ? estimatedMarketingSpend / this.metrics.users.newToday : 0;
  }

  calculateUptime() {
    // Calculate uptime based on error rate and availability
    return Math.max(0, (100 - this.metrics.api.errorRate)).toFixed(2);
  }

  generateBusinessRecommendations() {
    const recommendations = [];
    
    // Revenue optimization
    if (this.metrics.revenue.daily < 100) {
      recommendations.push({
        priority: 'high',
        title: 'Revenue Growth Opportunity',
        description: 'Daily revenue below growth targets',
        action: 'Implement usage-based billing and promote Professional tier',
        impact: '+40% revenue potential'
      });
    }

    // User engagement
    if (this.metrics.users.activeDaily / this.metrics.users.total < 0.3) {
      recommendations.push({
        priority: 'medium', 
        title: 'User Engagement Improvement',
        description: 'Daily active user ratio below healthy threshold',
        action: 'Implement user engagement campaigns and product stickiness features',
        impact: '+25% user retention'
      });
    }

    // Performance optimization
    if (this.metrics.api.averageResponseTime > 500) {
      recommendations.push({
        priority: 'high',
        title: 'API Performance Optimization',
        description: 'Response times above SLA threshold',
        action: 'Implement caching, optimize database queries, add CDN',
        impact: '+15% user satisfaction, improved conversion'
      });
    }

    // Subscription conversion
    if (this.metrics.subscriptions.conversionRate < 5) {
      recommendations.push({
        priority: 'medium',
        title: 'Conversion Rate Optimization', 
        description: 'Free-to-paid conversion below industry average',
        action: 'A/B test pricing page, add usage limits to free tier',
        impact: '+50% subscription conversions'
      });
    }

    return recommendations;
  }

  generateTrendAnalysis(historicalData) {
    if (!historicalData || historicalData.length < 7) {
      return '📈 Insufficient data for trend analysis (need 7+ days)';
    }

    const trends = [];
    
    // Revenue trend
    const revenueData = historicalData.slice(-7).map(d => d.revenue?.daily || 0);
    const revenueTrend = this.calculateTrend(revenueData);
    trends.push(`💰 Revenue: ${revenueTrend > 0 ? '📈' : '📉'} ${revenueTrend.toFixed(1)}% (7-day trend)`);
    
    // User growth trend
    const userGrowthData = historicalData.slice(-7).map(d => d.users?.newToday || 0);
    const userTrend = this.calculateTrend(userGrowthData);
    trends.push(`👥 New Users: ${userTrend > 0 ? '📈' : '📉'} ${userTrend.toFixed(1)}% (7-day trend)`);
    
    // API usage trend
    const apiUsageData = historicalData.slice(-7).map(d => d.api?.totalRequests || 0);
    const apiTrend = this.calculateTrend(apiUsageData);
    trends.push(`⚡ API Usage: ${apiTrend > 0 ? '📈' : '📉'} ${apiTrend.toFixed(1)}% (7-day trend)`);

    return trends.join('\n');
  }

  calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }

  // Real-time dashboard in terminal
  async startRealTimeDashboard() {
    console.clear();
    console.log('📊 N0DE Business Intelligence Dashboard');
    console.log('=====================================');
    
    const refreshDashboard = async () => {
      try {
        await this.collectRealTimeMetrics();
        
        console.clear();
        console.log('📊 N0DE Business Intelligence Dashboard - Live');
        console.log('==============================================');
        console.log(`🕐 Last Update: ${new Date().toLocaleTimeString()}`);
        console.log('');
        
        // Revenue section
        console.log('💰 REVENUE');
        console.log(`  Today: $${this.metrics.revenue.daily}`);
        console.log(`  Month: $${this.metrics.revenue.monthly}`);
        console.log(`  MRR: $${this.calculateMRR()}`);
        console.log('');
        
        // Users section
        console.log('👥 USERS');
        console.log(`  Total: ${this.metrics.users.total.toLocaleString()}`);
        console.log(`  Active Today: ${this.metrics.users.activeDaily}`);
        console.log(`  New Today: ${this.metrics.users.newToday}`);
        console.log('');
        
        // Performance section
        console.log('⚡ PERFORMANCE');
        console.log(`  Requests: ${this.metrics.api.totalRequests.toLocaleString()}`);
        console.log(`  Avg Response: ${this.metrics.api.averageResponseTime}ms`);
        console.log(`  Error Rate: ${this.metrics.api.errorRate.toFixed(2)}%`);
        console.log('');
        
        // Subscriptions
        console.log('💎 SUBSCRIPTIONS');
        console.log(`  Starter: ${this.metrics.subscriptions.starter}`);
        console.log(`  Professional: ${this.metrics.subscriptions.professional}`);
        console.log(`  Enterprise: ${this.metrics.subscriptions.enterprise}`);
        console.log('');
        
        // Predictions
        console.log('🔮 30-DAY PREDICTIONS');
        console.log(`  Revenue: $${this.metrics.predictions.revenue30Day}`);
        console.log(`  New Users: +${this.metrics.predictions.userGrowth30Day}`);
        console.log(`  Churn Risk: ${this.metrics.predictions.churnProbability.toFixed(1)}%`);
        
        console.log('\n📝 Press Ctrl+C to stop monitoring...');
        
      } catch (error) {
        console.error('❌ Dashboard update failed:', error.message);
      }
    };

    // Initial load
    await refreshDashboard();
    
    // Update every minute
    setInterval(refreshDashboard, this.config.updateInterval);
  }

  // Export data for external systems
  exportMetrics(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      kpis: {
        mrr: this.calculateMRR(),
        arpu: this.calculateARPU(),
        clv: this.calculateCLV(),
        mau: this.estimateMAU(),
        uptime: this.calculateUptime()
      }
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  convertToCSV(data) {
    const headers = ['timestamp', 'daily_revenue', 'monthly_revenue', 'total_users', 'active_users', 'mrr', 'error_rate'];
    const values = [
      data.timestamp,
      data.metrics.revenue.daily,
      data.metrics.revenue.monthly,
      data.metrics.users.total,
      data.metrics.users.activeDaily,
      data.kpis.mrr,
      data.metrics.api.errorRate
    ];

    return `${headers.join(',')}\n${values.join(',')}`;
  }
}

// CLI interface
if (require.main === module) {
  const dashboard = new BusinessIntelligenceDashboard();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'collect':
      dashboard.collectRealTimeMetrics().then(() => {
        console.log('✅ Metrics collected successfully');
      });
      break;
    case 'report':
      dashboard.collectRealTimeMetrics().then(() => {
        const report = dashboard.generateBusinessReport();
        console.log(report);
      });
      break;
    case 'dashboard':
      dashboard.startRealTimeDashboard();
      break;
    case 'export':
      const format = process.argv[3] || 'json';
      dashboard.collectRealTimeMetrics().then(() => {
        console.log(dashboard.exportMetrics(format));
      });
      break;
    default:
      console.log(`
📊 Business Intelligence Dashboard

Usage:
  node business-intelligence-dashboard.js collect    # Collect current metrics
  node business-intelligence-dashboard.js report     # Generate business report
  node business-intelligence-dashboard.js dashboard  # Real-time dashboard
  node business-intelligence-dashboard.js export [json|csv] # Export metrics
      `);
  }
}

module.exports = BusinessIntelligenceDashboard;