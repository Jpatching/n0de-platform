#!/usr/bin/env node
/**
 * Real-Time Error Correlation Agent
 * Links frontend errors to backend logs, provides intelligent debugging suggestions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = require('ws');

class ErrorCorrelationAgent {
  constructor() {
    this.errorDatabase = new Map();
    this.activeConnections = new Set();
    this.patternDatabase = this.loadErrorPatterns();
    this.correlationRules = this.initializeCorrelationRules();
    
    this.logPaths = {
      backend: '/var/log/n0de-backend.log',
      nginx: '/var/log/nginx/error.log',
      pm2: '/home/sol/.pm2/logs'
    };

    this.init();
  }

  init() {
    console.log('🔍 Error Correlation Agent starting...');
    this.startLogMonitoring();
    this.setupWebSocketServer();
    this.loadHistoricalErrorData();
  }

  loadErrorPatterns() {
    // Common error patterns and their solutions
    return {
      'CORS_ERROR': {
        pattern: /CORS|cross-origin/i,
        category: 'auth',
        severity: 'medium',
        solution: 'Check nginx CORS configuration and backend allowed origins',
        quickFix: 'Update nginx/n0de-complete.conf with proper CORS headers'
      },
      'AUTH_TOKEN_EXPIRED': {
        pattern: /expired|invalid.*token|unauthorized/i,
        category: 'auth',
        severity: 'low',
        solution: 'Implement automatic token refresh on frontend',
        quickFix: 'Check AuthContext.tsx token refresh logic'
      },
      'DATABASE_CONNECTION': {
        pattern: /connection.*refused|database.*error|prisma.*connect/i,
        category: 'database',
        severity: 'high',
        solution: 'Check PostgreSQL service and connection string',
        quickFix: 'systemctl status postgresql && check DATABASE_URL'
      },
      'PAYMENT_WEBHOOK_FAILED': {
        pattern: /webhook.*failed|coinbase.*error|stripe.*error/i,
        category: 'payments',
        severity: 'high',
        solution: 'Verify webhook signatures and endpoint accessibility',
        quickFix: 'Check webhook URL configuration and signature validation'
      },
      'RATE_LIMIT_EXCEEDED': {
        pattern: /rate.*limit|too.*many.*requests/i,
        category: 'rpc',
        severity: 'medium',
        solution: 'Implement request queuing or increase rate limits',
        quickFix: 'Check ThrottlerGuard configuration in backend'
      },
      'MEMORY_LEAK': {
        pattern: /memory|heap|out.*of.*memory/i,
        category: 'performance',
        severity: 'high',
        solution: 'Profile memory usage and implement cleanup',
        quickFix: 'Restart PM2 processes and monitor memory usage'
      }
    };
  }

  initializeCorrelationRules() {
    return [
      {
        name: 'Frontend-Backend Auth Mismatch',
        frontendPattern: /401|403|unauthorized/i,
        backendPattern: /jwt.*expired|invalid.*token/i,
        correlation: 0.9,
        suggestion: 'Frontend token expired, backend rejecting requests'
      },
      {
        name: 'Payment Processing Errors',
        frontendPattern: /payment.*failed|checkout.*error/i,
        backendPattern: /coinbase.*webhook|stripe.*error/i,
        correlation: 0.85,
        suggestion: 'Payment provider integration issue'
      },
      {
        name: 'Database Performance Issues',
        frontendPattern: /loading.*slow|timeout/i,
        backendPattern: /query.*slow|database.*timeout/i,
        correlation: 0.8,
        suggestion: 'Database query performance degradation'
      },
      {
        name: 'API Rate Limiting',
        frontendPattern: /429|rate.*limit/i,
        backendPattern: /throttle|rate.*exceeded/i,
        correlation: 0.95,
        suggestion: 'API rate limiting active, implement request queuing'
      }
    ];
  }

  startLogMonitoring() {
    console.log('👀 Starting log monitoring...');
    
    // Monitor backend logs
    this.monitorFile('/var/log/n0de-backend.log', 'backend');
    
    // Monitor nginx logs
    this.monitorFile('/var/log/nginx/error.log', 'nginx');
    
    // Monitor PM2 logs
    this.monitorPM2Logs();
  }

  monitorFile(filePath, source) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Log file not found: ${filePath}`);
      return;
    }

    const { spawn } = require('child_process');
    const tail = spawn('tail', ['-f', filePath]);
    
    tail.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => this.processLogLine(line, source));
    });

    tail.on('error', (error) => {
      console.error(`❌ Error monitoring ${filePath}:`, error.message);
    });
  }

  monitorPM2Logs() {
    try {
      const pm2LogsCmd = spawn('pm2', ['logs', '--lines', '0', '--raw']);
      
      pm2LogsCmd.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        lines.forEach(line => this.processLogLine(line, 'pm2'));
      });

    } catch (error) {
      console.log('⚠️  PM2 logs monitoring failed');
    }
  }

  processLogLine(line, source) {
    // Extract timestamp, level, and message
    const logEntry = this.parseLogLine(line, source);
    
    if (logEntry && this.isErrorLevel(logEntry.level)) {
      this.analyzeError(logEntry);
    }
  }

  parseLogLine(line, source) {
    // Basic log parsing - adapt based on your log format
    const patterns = {
      backend: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[(\w+)\]\s+(.+)/,
      nginx: /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.+)/,
      pm2: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(\d+\|\w+)\s+(.+)/
    };

    const pattern = patterns[source];
    if (!pattern) return null;

    const match = line.match(pattern);
    if (!match) return null;

    return {
      timestamp: new Date(match[1]),
      level: match[2],
      message: match[3],
      source,
      raw: line
    };
  }

  isErrorLevel(level) {
    return /error|warn|fatal|critical/i.test(level);
  }

  analyzeError(logEntry) {
    const errorId = this.generateErrorId(logEntry);
    
    // Check for known error patterns
    const matchedPatterns = this.matchErrorPatterns(logEntry.message);
    
    // Store error with correlation data
    const errorData = {
      id: errorId,
      timestamp: logEntry.timestamp,
      source: logEntry.source,
      level: logEntry.level,
      message: logEntry.message,
      patterns: matchedPatterns,
      correlationAttempts: 0,
      resolved: false
    };

    this.errorDatabase.set(errorId, errorData);
    
    // Try to correlate with recent frontend errors
    this.attemptErrorCorrelation(errorData);
    
    // Generate smart suggestions
    this.generateErrorSuggestions(errorData);
    
    // Broadcast to connected clients
    this.broadcastError(errorData);
  }

  generateErrorId(logEntry) {
    const content = `${logEntry.source}-${logEntry.message.substring(0, 50)}`;
    return Buffer.from(content).toString('base64').substring(0, 16);
  }

  matchErrorPatterns(message) {
    const matches = [];
    
    Object.entries(this.patternDatabase).forEach(([patternName, pattern]) => {
      if (pattern.pattern.test(message)) {
        matches.push({
          name: patternName,
          category: pattern.category,
          severity: pattern.severity,
          solution: pattern.solution,
          quickFix: pattern.quickFix
        });
      }
    });

    return matches;
  }

  attemptErrorCorrelation(backendError) {
    // Look for related frontend errors within 30 seconds
    const correlationWindow = 30 * 1000; // 30 seconds
    const cutoff = new Date(Date.now() - correlationWindow);
    
    Array.from(this.errorDatabase.values())
      .filter(error => error.source === 'frontend' && error.timestamp > cutoff)
      .forEach(frontendError => {
        const correlation = this.calculateCorrelation(frontendError, backendError);
        
        if (correlation.score > 0.7) {
          console.log(`🔗 High correlation detected (${correlation.score.toFixed(2)})`);
          console.log(`   Frontend: ${frontendError.message}`);
          console.log(`   Backend: ${backendError.message}`);
          console.log(`   Likely cause: ${correlation.suggestion}`);
          
          this.createCorrelationRecord(frontendError, backendError, correlation);
        }
      });
  }

  calculateCorrelation(frontendError, backendError) {
    let score = 0;
    let suggestion = 'Unknown correlation';
    
    // Apply correlation rules
    this.correlationRules.forEach(rule => {
      if (rule.frontendPattern.test(frontendError.message) && 
          rule.backendPattern.test(backendError.message)) {
        score = Math.max(score, rule.correlation);
        suggestion = rule.suggestion;
      }
    });

    // Time-based correlation boost
    const timeDiff = Math.abs(backendError.timestamp - frontendError.timestamp);
    if (timeDiff < 5000) { // Within 5 seconds
      score += 0.1;
    }

    return { score, suggestion, timeDiff };
  }

  createCorrelationRecord(frontendError, backendError, correlation) {
    const correlationId = `corr-${Date.now()}`;
    
    const record = {
      id: correlationId,
      frontendError: frontendError.id,
      backendError: backendError.id,
      correlation,
      timestamp: new Date(),
      resolved: false,
      resolutionSteps: this.generateResolutionSteps(frontendError, backendError, correlation)
    };

    // Save correlation record
    this.saveCorrelationRecord(record);
    
    // Update error entries with correlation
    frontendError.correlatedWith = backendError.id;
    backendError.correlatedWith = frontendError.id;
  }

  generateResolutionSteps(frontendError, backendError, correlation) {
    const steps = [];
    
    // Add pattern-based solutions
    frontendError.patterns?.forEach(pattern => {
      steps.push({
        type: 'frontend',
        action: pattern.quickFix,
        priority: pattern.severity === 'high' ? 1 : 2
      });
    });

    backendError.patterns?.forEach(pattern => {
      steps.push({
        type: 'backend', 
        action: pattern.quickFix,
        priority: pattern.severity === 'high' ? 1 : 2
      });
    });

    // Add correlation-specific suggestions
    steps.push({
      type: 'investigation',
      action: correlation.suggestion,
      priority: correlation.score > 0.8 ? 1 : 2
    });

    return steps.sort((a, b) => a.priority - b.priority);
  }

  saveCorrelationRecord(record) {
    const correlationDir = path.join(__dirname, '../correlations');
    if (!fs.existsSync(correlationDir)) {
      fs.mkdirSync(correlationDir, { recursive: true });
    }

    const filename = `${record.id}-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(
      path.join(correlationDir, filename),
      JSON.stringify(record, null, 2)
    );
  }

  generateErrorSuggestions(errorData) {
    const suggestions = [];
    
    errorData.patterns?.forEach(pattern => {
      suggestions.push({
        type: 'pattern-match',
        category: pattern.category,
        suggestion: pattern.solution,
        priority: pattern.severity,
        quickFix: pattern.quickFix
      });
    });

    // Add contextual suggestions based on recent error history
    const recentSimilarErrors = this.findSimilarRecentErrors(errorData);
    
    if (recentSimilarErrors.length > 3) {
      suggestions.push({
        type: 'recurring-issue',
        suggestion: 'This error is recurring frequently. Consider implementing a permanent fix.',
        priority: 'high',
        frequency: recentSimilarErrors.length
      });
    }

    errorData.suggestions = suggestions;
    return suggestions;
  }

  findSimilarRecentErrors(errorData) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return Array.from(this.errorDatabase.values())
      .filter(error => 
        error.timestamp > oneHourAgo &&
        error.id !== errorData.id &&
        this.calculateMessageSimilarity(error.message, errorData.message) > 0.7
      );
  }

  calculateMessageSimilarity(msg1, msg2) {
    // Simple similarity calculation based on common words
    const words1 = msg1.toLowerCase().split(/\s+/);
    const words2 = msg2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  setupWebSocketServer() {
    const wss = new WebSocket.Server({ port: 8081 });
    
    wss.on('connection', (ws) => {
      console.log('📡 Frontend error monitoring connected');
      this.activeConnections.add(ws);
      
      ws.on('message', (data) => {
        try {
          const frontendError = JSON.parse(data);
          this.processFrontendError(frontendError);
        } catch (error) {
          console.error('❌ Invalid frontend error data:', error.message);
        }
      });
      
      ws.on('close', () => {
        this.activeConnections.delete(ws);
        console.log('📡 Frontend error monitoring disconnected');
      });
    });

    console.log('📡 WebSocket error correlation server running on :8081');
  }

  processFrontendError(frontendError) {
    console.log('🔍 Processing frontend error:', frontendError.message);
    
    const errorData = {
      id: this.generateErrorId({ message: frontendError.message, source: 'frontend' }),
      timestamp: new Date(frontendError.timestamp || Date.now()),
      source: 'frontend',
      level: frontendError.level || 'error',
      message: frontendError.message,
      stack: frontendError.stack,
      url: frontendError.url,
      userAgent: frontendError.userAgent,
      userId: frontendError.userId
    };

    this.errorDatabase.set(errorData.id, errorData);
    this.analyzeError(errorData);
  }

  broadcastError(errorData) {
    const message = JSON.stringify({
      type: 'error-alert',
      error: errorData,
      suggestions: errorData.suggestions || [],
      correlations: errorData.correlatedWith ? [errorData.correlatedWith] : []
    });

    this.activeConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  loadHistoricalErrorData() {
    console.log('📚 Loading historical error data...');
    
    const correlationDir = path.join(__dirname, '../correlations');
    if (!fs.existsSync(correlationDir)) return;

    const files = fs.readdirSync(correlationDir)
      .filter(f => f.endsWith('.json'))
      .slice(-100); // Load last 100 correlation records

    files.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(correlationDir, file), 'utf8'));
        // Use historical data to improve pattern recognition
        this.updatePatternDatabase(data);
      } catch (error) {
        // Skip corrupted files
      }
    });

    console.log(`📊 Loaded ${files.length} historical error correlations`);
  }

  updatePatternDatabase(correlationData) {
    // Machine learning-like pattern improvement
    if (correlationData.resolved && correlationData.correlation.score > 0.8) {
      // This correlation was useful, strengthen the pattern
      const rule = this.correlationRules.find(r => r.suggestion === correlationData.correlation.suggestion);
      if (rule) {
        rule.correlation = Math.min(0.99, rule.correlation + 0.01);
      }
    }
  }

  async generateErrorReport() {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const recentErrors = Array.from(this.errorDatabase.values())
      .filter(error => error.timestamp > oneDayAgo);

    const report = {
      timestamp: now.toISOString(),
      period: '24 hours',
      totalErrors: recentErrors.length,
      errorsBySource: this.groupErrorsBySource(recentErrors),
      errorsByCategory: this.groupErrorsByCategory(recentErrors),
      topErrors: this.getTopErrors(recentErrors),
      correlationsFound: recentErrors.filter(e => e.correlatedWith).length,
      recommendations: this.generateGlobalRecommendations(recentErrors)
    };

    const reportContent = this.formatErrorReport(report);
    
    fs.writeFileSync(
      path.join(__dirname, `../reports/error-analysis-${Date.now()}.md`),
      reportContent
    );

    return report;
  }

  groupErrorsBySource(errors) {
    const groups = {};
    errors.forEach(error => {
      groups[error.source] = (groups[error.source] || 0) + 1;
    });
    return groups;
  }

  groupErrorsByCategory(errors) {
    const groups = {};
    errors.forEach(error => {
      error.patterns?.forEach(pattern => {
        groups[pattern.category] = (groups[pattern.category] || 0) + 1;
      });
    });
    return groups;
  }

  getTopErrors(errors) {
    const errorCounts = {};
    
    errors.forEach(error => {
      const key = error.message.substring(0, 100); // First 100 chars as key
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));
  }

  generateGlobalRecommendations(errors) {
    const recommendations = [];
    
    // Check for recurring patterns
    const categoryCount = this.groupErrorsByCategory(errors);
    
    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > 10) {
        recommendations.push({
          priority: 'high',
          category,
          message: `High error count in ${category} (${count} errors)`,
          action: this.getCategoryRecommendation(category)
        });
      }
    });

    return recommendations;
  }

  getCategoryRecommendation(category) {
    const actions = {
      auth: 'Review authentication flow and token management',
      database: 'Optimize database queries and connection pooling',
      payments: 'Audit payment webhook handling and error recovery',
      rpc: 'Review RPC rate limiting and load balancing',
      performance: 'Profile application memory and CPU usage'
    };

    return actions[category] || 'Investigate error patterns and root causes';
  }

  formatErrorReport(report) {
    return `# Error Analysis Report - ${report.timestamp}

## 📊 Overview (${report.period})
- **Total Errors**: ${report.totalErrors}
- **Correlations Found**: ${report.correlationsFound}
- **Success Rate**: ${((1 - report.totalErrors / 1000) * 100).toFixed(1)}%

## 🔍 Errors by Source
${Object.entries(report.errorsBySource).map(([source, count]) => 
  `- **${source}**: ${count} errors`
).join('\n')}

## 📋 Errors by Category  
${Object.entries(report.errorsByCategory).map(([category, count]) => 
  `- **${category}**: ${count} errors`
).join('\n')}

## 🔥 Top Error Messages
${report.topErrors.map((error, i) => 
  `${i + 1}. (${error.count}x) ${error.message.substring(0, 80)}...`
).join('\n')}

## 🎯 Priority Recommendations
${report.recommendations.map(rec => 
  `### ${rec.priority.toUpperCase()} - ${rec.category}
${rec.message}
**Action**: ${rec.action}`
).join('\n\n')}

---
Generated by Error Correlation Agent
`;
  }

  // CLI commands for manual error investigation
  async investigateErrorPattern(pattern) {
    console.log(`🔍 Investigating error pattern: ${pattern}`);
    
    const matchingErrors = Array.from(this.errorDatabase.values())
      .filter(error => error.message.includes(pattern));

    console.log(`📊 Found ${matchingErrors.length} matching errors`);
    
    matchingErrors.forEach(error => {
      console.log(`  ${error.timestamp.toISOString()} [${error.source}] ${error.message}`);
    });

    return matchingErrors;
  }
}

// CLI interface
if (require.main === module) {
  const agent = new ErrorCorrelationAgent();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      console.log('🔍 Error Correlation Agent running...');
      // Keep running
      break;
    case 'report':
      agent.generateErrorReport().then(console.log);
      break;
    case 'investigate':
      const pattern = process.argv[3];
      if (pattern) {
        agent.investigateErrorPattern(pattern);
      } else {
        console.log('Usage: investigate <error_pattern>');
      }
      break;
    default:
      console.log(`
🔍 Error Correlation Agent

Usage:
  node error-correlation-agent.js start       # Start monitoring
  node error-correlation-agent.js report      # Generate error report  
  node error-correlation-agent.js investigate <pattern> # Investigate specific errors
      `);
  }
}

module.exports = ErrorCorrelationAgent;