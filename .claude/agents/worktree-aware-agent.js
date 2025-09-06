#!/usr/bin/env node
/**
 * Worktree-Aware Agent Integration
 * Makes all existing agents work seamlessly with Git worktrees
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WorktreeAwareAgent {
  constructor() {
    this.baseRepo = '/home/sol/n0de-deploy';
    this.worktreesPath = '/home/sol/n0de-worktrees';
    this.agentPaths = {
      'fullstack-sync': './fullstack-sync-agent.js',
      'deployment': './smart-deployment-orchestrator.js', 
      'performance': './performance-guardian.js',
      'error-correlation': './error-correlation-agent.js',
      'business-intelligence': './business-intelligence-dashboard.js'
    };
  }

  async discoverActiveWorktrees() {
    const worktrees = [];
    
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: this.baseRepo,
        encoding: 'utf8'
      });
      
      const blocks = output.split('\n\n').filter(Boolean);
      
      blocks.forEach(block => {
        const lines = block.split('\n');
        const worktree = {};
        
        lines.forEach(line => {
          if (line.startsWith('worktree ')) {
            worktree.path = line.replace('worktree ', '');
          } else if (line.startsWith('branch ')) {
            worktree.branch = line.replace('branch refs/heads/', '');
          }
        });
        
        if (worktree.path && worktree.branch) {
          worktrees.push(worktree);
        }
      });
      
    } catch (error) {
      console.error('Failed to discover worktrees:', error.message);
    }
    
    return worktrees;
  }

  async runAgentOnAllWorktrees(agentName, command = '', options = {}) {
    console.log(`🤖 Running ${agentName} agent on all worktrees`);
    
    const worktrees = await this.discoverActiveWorktrees();
    const agentPath = this.agentPaths[agentName];
    
    if (!agentPath) {
      throw new Error(`Unknown agent: ${agentName}`);
    }

    const results = [];
    
    // Run agent on each worktree in parallel
    const promises = worktrees.map(async (worktree) => {
      try {
        console.log(`🔄 ${agentName} → ${worktree.branch}`);
        
        const result = await this.runAgentOnWorktree(
          agentPath, 
          command, 
          worktree,
          options
        );
        
        return {
          worktree: worktree.branch,
          success: true,
          result
        };
        
      } catch (error) {
        return {
          worktree: worktree.branch,
          success: false,
          error: error.message
        };
      }
    });

    const agentResults = await Promise.allSettled(promises);
    
    // Process results
    agentResults.forEach((result, index) => {
      const worktree = worktrees[index];
      
      if (result.status === 'fulfilled') {
        const data = result.value;
        results.push(data);
        
        if (data.success) {
          console.log(`✅ ${worktree.branch}: ${agentName} completed`);
        } else {
          console.log(`❌ ${worktree.branch}: ${data.error}`);
        }
      }
    });

    return results;
  }

  async runAgentOnWorktree(agentPath, command, worktree, options) {
    const fullCommand = `node ${agentPath} ${command}`.trim();
    
    try {
      const output = execSync(fullCommand, {
        cwd: worktree.path,
        encoding: 'utf8',
        env: {
          ...process.env,
          WORKTREE_BRANCH: worktree.branch,
          WORKTREE_PATH: worktree.path,
          ...options.env
        }
      });
      
      return { output, command: fullCommand };
      
    } catch (error) {
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  // Enhanced type sync across all worktrees
  async syncTypesAcrossWorktrees() {
    console.log('🔄 Syncing types across all worktrees');
    
    const worktrees = await this.discoverActiveWorktrees();
    const mainWorktree = worktrees.find(wt => wt.branch === 'main');
    
    if (!mainWorktree) {
      throw new Error('Main worktree not found');
    }

    // Generate types in main first
    console.log('🔧 Generating types in main repository...');
    execSync('node .claude/agents/fullstack-sync-agent.js', {
      cwd: mainWorktree.path
    });

    // Copy generated types to all other worktrees
    const otherWorktrees = worktrees.filter(wt => wt.branch !== 'main');
    
    for (const worktree of otherWorktrees) {
      try {
        const sourceTypesPath = path.join(mainWorktree.path, 'frontend/src/types/generated');
        const targetTypesPath = path.join(worktree.path, 'frontend/src/types/generated');
        
        // Ensure target directory exists
        if (!fs.existsSync(targetTypesPath)) {
          fs.mkdirSync(targetTypesPath, { recursive: true });
        }
        
        // Copy generated types
        execSync(`cp -r "${sourceTypesPath}"/* "${targetTypesPath}"/`, { stdio: 'pipe' });
        
        console.log(`✅ Types synced to ${worktree.branch}`);
        
      } catch (error) {
        console.log(`⚠️  Type sync failed for ${worktree.branch}: ${error.message}`);
      }
    }
  }

  // Performance monitoring across environments
  async monitorAllEnvironments() {
    console.log('📊 Starting performance monitoring across all environments');
    
    const worktrees = await this.discoverActiveWorktrees();
    
    // Monitor each environment in parallel
    const monitoringPromises = worktrees.map(async (worktree) => {
      return this.monitorWorktreePerformance(worktree);
    });

    const results = await Promise.all(monitoringPromises);
    
    // Generate comparative performance report
    this.generateCrossEnvironmentReport(results);
    
    return results;
  }

  async monitorWorktreePerformance(worktree) {
    console.log(`⚡ Monitoring performance: ${worktree.branch}`);
    
    try {
      // Determine local URL for this worktree
      const port = this.getWorktreePort(worktree.branch);
      const localUrl = `http://localhost:${port}`;
      
      // Quick performance check
      const startTime = Date.now();
      execSync(`curl -s -o /dev/null "${localUrl}"`, { stdio: 'pipe' });
      const responseTime = Date.now() - startTime;
      
      // Bundle size check  
      const bundleInfo = await this.checkBundleSize(worktree.path);
      
      return {
        worktree: worktree.branch,
        responseTime,
        bundleSize: bundleInfo.totalSize,
        healthy: responseTime < 2000,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        worktree: worktree.branch,
        error: error.message,
        healthy: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  getWorktreePort(branchName) {
    // Port assignment logic based on branch naming
    if (branchName === 'staging') return 3001;
    if (branchName.startsWith('feature/')) return 3002;
    if (branchName.startsWith('hotfix/')) return 3003;
    if (branchName.startsWith('experiment/')) return 3004;
    return 3000; // main
  }

  async checkBundleSize(worktreePath) {
    try {
      const buildOutput = execSync('npm run build', {
        cwd: path.join(worktreePath, 'frontend'),
        encoding: 'utf8'
      });
      
      // Parse Next.js build output for bundle info
      const sizeMatches = buildOutput.match(/First Load JS shared by all\s+(\d+\.?\d*\s*[kKmM]?[bB])/);
      const totalSize = sizeMatches ? this.parseSize(sizeMatches[1]) : 0;
      
      return { totalSize, buildOutput };
      
    } catch (error) {
      return { totalSize: 0, error: error.message };
    }
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/(\d+\.?\d*)\s*([kKmM]?)[bB]/);
    if (!match) return 0;
    
    const [, number, unit] = match;
    const size = parseFloat(number);
    
    switch (unit.toLowerCase()) {
      case 'k': return size * 1024;
      case 'm': return size * 1024 * 1024;
      default: return size;
    }
  }

  generateCrossEnvironmentReport(results) {
    const report = `# Cross-Environment Performance Report

Generated: ${new Date().toISOString()}

## 📊 Environment Comparison

${results.map(result => `
### ${result.worktree}
- **Status**: ${result.healthy ? '✅ Healthy' : '❌ Issues'}
- **Response Time**: ${result.responseTime || 'N/A'}ms
- **Bundle Size**: ${result.bundleSize ? (result.bundleSize / 1024).toFixed(1) + 'KB' : 'N/A'}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## 🎯 Cross-Environment Insights

### Performance Ranking
${results
  .filter(r => r.healthy)
  .sort((a, b) => a.responseTime - b.responseTime)
  .map((r, i) => `${i + 1}. ${r.worktree}: ${r.responseTime}ms`)
  .join('\n')}

### Bundle Size Comparison
${results
  .filter(r => r.bundleSize > 0)
  .sort((a, b) => a.bundleSize - b.bundleSize)  
  .map((r, i) => `${i + 1}. ${r.worktree}: ${(r.bundleSize / 1024).toFixed(1)}KB`)
  .join('\n')}

## 🔧 Recommendations

${this.generateCrossEnvironmentRecommendations(results)}

---
Generated by Worktree-Aware Agent System
`;

    fs.writeFileSync(
      path.join(__dirname, `../reports/cross-environment-${Date.now()}.md`),
      report
    );

    console.log('📋 Cross-environment report generated');
  }

  generateCrossEnvironmentRecommendations(results) {
    const recommendations = [];
    
    // Find performance outliers
    const healthyResults = results.filter(r => r.healthy && r.responseTime);
    if (healthyResults.length > 1) {
      const avgResponseTime = healthyResults.reduce((sum, r) => sum + r.responseTime, 0) / healthyResults.length;
      const slowEnvironments = healthyResults.filter(r => r.responseTime > avgResponseTime * 1.5);
      
      if (slowEnvironments.length > 0) {
        recommendations.push(`- Optimize slow environments: ${slowEnvironments.map(r => r.worktree).join(', ')}`);
      }
    }

    // Find bundle size outliers
    const bundleResults = results.filter(r => r.bundleSize > 0);
    if (bundleResults.length > 1) {
      const avgBundleSize = bundleResults.reduce((sum, r) => sum + r.bundleSize, 0) / bundleResults.length;
      const largeBundles = bundleResults.filter(r => r.bundleSize > avgBundleSize * 1.3);
      
      if (largeBundles.length > 0) {
        recommendations.push(`- Optimize bundle size in: ${largeBundles.map(r => r.worktree).join(', ')}`);
      }
    }

    // Check for failed environments
    const failedEnvs = results.filter(r => !r.healthy);
    if (failedEnvs.length > 0) {
      recommendations.push(`- Fix issues in: ${failedEnvs.map(r => r.worktree).join(', ')}`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '✅ All environments performing well';
  }

  // Error correlation across worktrees
  async correlateErrorsAcrossEnvironments() {
    console.log('🔍 Correlating errors across all environments');
    
    const worktrees = await this.discoverActiveWorktrees();
    const errorData = new Map();

    // Collect error logs from all environments
    for (const worktree of worktrees) {
      try {
        const errors = await this.collectWorktreeErrors(worktree);
        errorData.set(worktree.branch, errors);
      } catch (error) {
        console.log(`⚠️  Error collection failed for ${worktree.branch}`);
      }
    }

    // Find patterns across environments
    this.analyzeErrorPatterns(errorData);
  }

  async collectWorktreeErrors(worktree) {
    // Check for error logs in this worktree
    const logPaths = [
      path.join(worktree.path, '.next/trace'),
      path.join(worktree.path, 'logs'),
      '/var/log/nginx/error.log'
    ];

    const errors = [];
    
    for (const logPath of logPaths) {
      if (fs.existsSync(logPath)) {
        try {
          const logContent = fs.readFileSync(logPath, 'utf8');
          const errorLines = logContent.split('\n')
            .filter(line => /error|failed|exception/i.test(line))
            .slice(-10); // Last 10 errors
            
          errors.push(...errorLines.map(line => ({
            source: logPath,
            message: line,
            timestamp: new Date(),
            worktree: worktree.branch
          })));
        } catch {
          // Skip inaccessible logs
        }
      }
    }

    return errors;
  }

  analyzeErrorPatterns(errorData) {
    console.log('🔍 Analyzing error patterns across environments');
    
    // Find errors that appear in multiple environments
    const allErrors = Array.from(errorData.values()).flat();
    const errorCounts = new Map();
    
    allErrors.forEach(error => {
      const key = error.message.substring(0, 50); // First 50 chars as pattern
      if (!errorCounts.has(key)) {
        errorCounts.set(key, { count: 0, environments: new Set() });
      }
      
      const entry = errorCounts.get(key);
      entry.count++;
      entry.environments.add(error.worktree);
    });

    // Find widespread issues
    console.log('🚨 Widespread Issues:');
    errorCounts.forEach((data, pattern) => {
      if (data.environments.size > 1) {
        console.log(`  ⚠️  "${pattern}..." appears in ${data.environments.size} environments`);
        console.log(`     Environments: ${Array.from(data.environments).join(', ')}`);
      }
    });
  }
}

// Enhanced deployment with worktree coordination
class WorktreeDeploymentCoordinator {
  constructor() {
    this.worktreeAgent = new WorktreeAwareAgent();
  }

  async deployWithCoordination(targetBranch) {
    console.log(`🚀 Coordinated deployment for ${targetBranch}`);
    
    try {
      // Pre-deployment: Sync types across all worktrees
      await this.worktreeAgent.syncTypesAcrossWorktrees();
      
      // Pre-deployment: Run tests on all environments
      const testResults = await this.worktreeAgent.runAgentOnAllWorktrees('performance', 'quick');
      
      // Check if any environment has critical issues
      const criticalIssues = testResults.filter(r => !r.success);
      if (criticalIssues.length > 0) {
        console.log('⚠️  Critical issues found in some environments:');
        criticalIssues.forEach(issue => {
          console.log(`   ${issue.worktree}: ${issue.error}`);
        });
        
        if (targetBranch === 'main') {
          throw new Error('Cannot deploy to main with critical issues in development environments');
        }
      }
      
      // Deploy to target
      const deployment = execSync(`node .claude/agents/smart-deployment-orchestrator.js deploy`, {
        cwd: this.getWorktreePath(targetBranch),
        encoding: 'utf8'
      });
      
      // Post-deployment: Update all environments
      await this.postDeploymentSync(targetBranch);
      
      console.log('✅ Coordinated deployment completed');
      return deployment;

    } catch (error) {
      console.error('❌ Coordinated deployment failed:', error.message);
      throw error;
    }
  }

  getWorktreePath(branchName) {
    if (branchName === 'main') {
      return '/home/sol/n0de-deploy';
    }
    return `/home/sol/n0de-worktrees/${branchName}`;
  }

  async postDeploymentSync(deployedBranch) {
    console.log(`🔄 Post-deployment sync from ${deployedBranch}`);
    
    // If main was deployed, sync changes to all feature branches
    if (deployedBranch === 'main') {
      const worktrees = await this.worktreeAgent.discoverActiveWorktrees();
      const featureBranches = worktrees.filter(wt => 
        wt.branch.startsWith('feature/') || wt.branch === 'staging'
      );
      
      for (const feature of featureBranches) {
        try {
          console.log(`🔄 Syncing main changes to ${feature.branch}`);
          execSync(`git fetch origin && git merge origin/main`, {
            cwd: feature.path,
            stdio: 'pipe'
          });
        } catch (error) {
          console.log(`⚠️  Sync conflict in ${feature.branch}, manual resolution needed`);
        }
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const agent = new WorktreeAwareAgent();
  const coordinator = new WorktreeDeploymentCoordinator();
  
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'run-all':
      if (arg1) {
        agent.runAgentOnAllWorktrees(arg1, arg2 || '');
      } else {
        console.log('Usage: run-all <agent-name> [command]');
      }
      break;
      
    case 'sync-types':
      agent.syncTypesAcrossWorktrees();
      break;
      
    case 'monitor-all':
      agent.monitorAllEnvironments();
      break;
      
    case 'correlate-errors':
      agent.correlateErrorsAcrossEnvironments();
      break;
      
    case 'deploy-coordinated':
      if (arg1) {
        coordinator.deployWithCoordination(arg1);
      } else {
        console.log('Usage: deploy-coordinated <branch-name>');
      }
      break;
      
    default:
      console.log(`
🌳 Worktree-Aware Agent Integration

Usage:
  run-all <agent> [command]       # Run agent on all worktrees
  sync-types                      # Sync types across all worktrees
  monitor-all                     # Monitor performance of all environments
  correlate-errors                # Find error patterns across environments
  deploy-coordinated <branch>     # Deploy with cross-environment coordination

Examples:
  run-all performance audit       # Performance audit on all environments
  run-all error-correlation report # Error analysis across all worktrees
  deploy-coordinated main         # Deploy main with coordination checks
      `);
  }
}

module.exports = { WorktreeAwareAgent, WorktreeDeploymentCoordinator };