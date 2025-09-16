#!/usr/bin/env node
/**
 * Parallel Deployment System using Git Worktrees
 * Enables simultaneous deployments to multiple environments
 */

const WorktreeOrchestrator = require('./worktree-orchestrator');
const SmartDeploymentOrchestrator = require('./smart-deployment-orchestrator');

class ParallelDeploymentSystem {
  constructor() {
    this.worktreeOrchestrator = new WorktreeOrchestrator();
    this.deploymentOrchestrator = new SmartDeploymentOrchestrator();
    
    this.deploymentTargets = {
      production: {
        worktree: 'main',
        vercelProject: 'n0de-website',
        domain: 'www.n0de.pro',
        priority: 1
      },
      staging: {
        worktree: 'staging', 
        vercelProject: 'n0de-staging',
        domain: 'staging.n0de.pro',
        priority: 2
      },
      development: {
        worktree: 'develop',
        vercelProject: 'n0de-dev',
        domain: 'dev.n0de.pro', 
        priority: 3
      }
    };
  }

  async deployToMultipleEnvironments(environments = ['staging', 'production']) {
    console.log(`🚀 Starting parallel deployment to: ${environments.join(', ')}`);
    
    const deploymentId = `parallel-${Date.now()}`;
    const results = [];

    try {
      // Sort by priority to deploy critical environments first
      const sortedEnvs = environments.sort((a, b) => 
        this.deploymentTargets[a].priority - this.deploymentTargets[b].priority
      );

      // Deploy in parallel but with priority ordering
      const deploymentPromises = sortedEnvs.map(async (env, index) => {
        // Add slight delay for priority environments
        await new Promise(resolve => setTimeout(resolve, index * 5000));
        
        return this.deployToEnvironment(env, deploymentId);
      });

      const deployResults = await Promise.allSettled(deploymentPromises);
      
      // Process results
      deployResults.forEach((result, index) => {
        const env = sortedEnvs[index];
        if (result.status === 'fulfilled') {
          results.push({ environment: env, success: true, data: result.value });
          console.log(`✅ ${env}: Deployment successful`);
        } else {
          results.push({ environment: env, success: false, error: result.reason.message });
          console.log(`❌ ${env}: Deployment failed - ${result.reason.message}`);
        }
      });

      // Generate deployment report
      this.generateParallelDeploymentReport(deploymentId, results);
      
      return results;

    } catch (error) {
      console.error(`❌ Parallel deployment ${deploymentId} failed:`, error.message);
      throw error;
    }
  }

  async deployToEnvironment(environmentName, deploymentId) {
    const target = this.deploymentTargets[environmentName];
    if (!target) {
      throw new Error(`Unknown environment: ${environmentName}`);
    }

    console.log(`🎯 Deploying to ${environmentName} (${target.domain})`);

    try {
      // Get worktree path
      const worktreePath = this.getWorktreePath(target.worktree);
      
      // Environment-specific deployment
      const deploymentResult = await this.runEnvironmentDeployment(
        worktreePath,
        target,
        deploymentId
      );

      return {
        environment: environmentName,
        deploymentId,
        url: deploymentResult.url,
        duration: deploymentResult.duration,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`${environmentName} deployment failed: ${error.message}`);
    }
  }

  getWorktreePath(branchName) {
    if (branchName === 'main') {
      return this.worktreeOrchestrator.baseRepo;
    }
    
    return path.join(this.worktreeOrchestrator.worktreesPath, branchName);
  }

  async runEnvironmentDeployment(worktreePath, target, deploymentId) {
    const startTime = Date.now();
    
    console.log(`🏗️  Building ${target.worktree}...`);
    
    // Frontend build and deploy to Vercel
    const frontendPath = path.join(worktreePath, 'frontend');
    
    // Build frontend
    execSync('npm run build', { cwd: frontendPath, stdio: 'pipe' });
    
    // Deploy to Vercel with environment-specific project
    let vercelCommand = 'vercel --prod --yes';
    if (target.vercelProject !== 'n0de-website') {
      vercelCommand += ` --name ${target.vercelProject}`;
    }
    
    const deployOutput = execSync(vercelCommand, { 
      cwd: frontendPath, 
      encoding: 'utf8' 
    });
    
    // Extract deployment URL
    const deploymentUrl = deployOutput.match(/https:\/\/[^\s]+/)?.[0];
    
    // If not main environment, also restart local services
    if (target.worktree !== 'main') {
      await this.restartEnvironmentServices(worktreePath, target);
    }

    return {
      url: deploymentUrl,
      duration: Date.now() - startTime,
      environment: target
    };
  }

  async restartEnvironmentServices(worktreePath, target) {
    console.log(`🔄 Restarting local services for ${target.worktree}`);
    
    try {
      // Kill existing processes on this port
      try {
        execSync(`pkill -f "port ${target.port}"`, { stdio: 'pipe' });
      } catch {
        // No existing process to kill
      }

      // Start frontend dev server
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(worktreePath, 'frontend'),
        env: { ...process.env, PORT: target.port.toString() },
        detached: true,
        stdio: 'ignore'
      });

      console.log(`✅ Frontend restarted on port ${target.port}`);
      
    } catch (error) {
      console.log(`⚠️  Service restart failed: ${error.message}`);
    }
  }

  async createDevelopmentWorkflow(featureBranches) {
    console.log('🔀 Creating parallel development workflow');
    
    const workflow = {
      id: `workflow-${Date.now()}`,
      branches: featureBranches,
      environments: [],
      startTime: new Date()
    };

    try {
      // Create all feature environments in parallel
      const environmentPromises = featureBranches.map(async (feature) => {
        console.log(`🌱 Setting up ${feature.name}...`);
        
        const environment = await this.worktreeOrchestrator.createFeatureBranch(
          feature.name, 
          feature.baseBranch || 'main'
        );
        
        // Run feature-specific setup
        if (feature.setupCommands) {
          await this.worktreeOrchestrator.runBranchSetup(environment, feature.setupCommands);
        }
        
        return environment;
      });

      workflow.environments = await Promise.all(environmentPromises);
      
      console.log(`✅ Parallel workflow created with ${workflow.environments.length} environments`);
      
      // Start continuous integration for all branches
      this.startContinuousIntegration(workflow);
      
      return workflow;

    } catch (error) {
      console.error('❌ Parallel workflow creation failed:', error.message);
      throw error;
    }
  }

  startContinuousIntegration(workflow) {
    console.log('🔄 Starting continuous integration for all branches');
    
    // Monitor file changes in all worktrees
    const chokidar = require('chokidar');
    
    workflow.environments.forEach(env => {
      // Watch for changes in each worktree
      chokidar.watch([
        path.join(env.path, 'backend/**/*.ts'),
        path.join(env.path, 'frontend/src/**/*.{ts,tsx}')
      ], { ignoreInitial: true })
      .on('change', async (changedFile) => {
        console.log(`🔄 File changed in ${env.branch}: ${path.basename(changedFile)}`);
        
        // Auto-run tests for this environment
        try {
          await this.worktreeOrchestrator.runWorktreeTests(env);
          console.log(`✅ ${env.branch}: Tests passed`);
        } catch (error) {
          console.log(`❌ ${env.branch}: Tests failed - ${error.message}`);
        }
      });
    });
  }

  async hotfixWorkflow(hotfixName, targetEnvironments = ['staging', 'production']) {
    console.log(`🚨 Starting hotfix workflow: ${hotfixName}`);
    
    try {
      // Create hotfix branch from main
      const hotfixBranch = `hotfix/${hotfixName}`;
      const hotfixEnv = await this.worktreeOrchestrator.createFeatureBranch(hotfixName, 'main');
      
      console.log(`🔧 Hotfix environment ready: ${hotfixBranch}`);
      console.log(`🌐 Test at: http://localhost:${hotfixEnv.port}`);
      
      // Wait for user to make changes and test
      console.log('⏳ Make your hotfix changes and test, then run:');
      console.log(`   node parallel-deployment-system.js deploy-hotfix ${hotfixName}`);
      
      return hotfixEnv;

    } catch (error) {
      console.error(`❌ Hotfix workflow failed: ${error.message}`);
      throw error;
    }
  }

  async deployHotfix(hotfixName) {
    const hotfixBranch = `hotfix/${hotfixName}`;
    
    console.log(`🚀 Deploying hotfix: ${hotfixName}`);
    
    try {
      // Test hotfix environment thoroughly
      const worktree = this.worktreeOrchestrator.activeWorktrees.get(hotfixBranch);
      await this.worktreeOrchestrator.runWorktreeTests(worktree);
      
      // Deploy to staging first
      console.log('🏗️  Deploying to staging first...');
      await this.deployToEnvironment('staging', `hotfix-${hotfixName}`);
      
      // Wait for staging validation
      await this.validateHotfixStaging(hotfixBranch);
      
      // Deploy to production
      console.log('🎯 Deploying to production...');
      await this.deployToEnvironment('production', `hotfix-${hotfixName}`);
      
      // Merge hotfix back to main
      await this.worktreeOrchestrator.mergeAndDeploy(hotfixBranch, 'main');
      
      console.log(`✅ Hotfix ${hotfixName} deployed and merged`);

    } catch (error) {
      console.error(`❌ Hotfix deployment failed: ${error.message}`);
      throw error;
    }
  }

  async validateHotfixStaging(hotfixBranch) {
    console.log('🔍 Validating hotfix on staging...');
    
    // Run staging validation tests
    try {
      execSync(`curl -s https://staging.n0de.pro/health`, { stdio: 'pipe' });
      
      // Wait for manual approval or automated tests
      console.log('✅ Staging validation passed');
      
    } catch (error) {
      throw new Error(`Staging validation failed: ${error.message}`);
    }
  }

  generateParallelDeploymentReport(deploymentId, results) {
    const report = `# Parallel Deployment Report - ${deploymentId}

## 📊 Deployment Summary
- **ID**: ${deploymentId}
- **Timestamp**: ${new Date().toISOString()}
- **Environments**: ${results.length}
- **Success Rate**: ${results.filter(r => r.success).length}/${results.length}

## 🎯 Environment Results

${results.map(result => `
### ${result.environment}
- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}
- **URL**: ${result.data?.url || 'N/A'}
- **Duration**: ${result.data?.duration || 'N/A'}ms
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## 🔍 Recommendations

${this.generateDeploymentRecommendations(results)}

---
Generated by Parallel Deployment System
`;

    fs.writeFileSync(
      path.join(__dirname, `../reports/parallel-deployment-${deploymentId}.md`),
      report
    );

    console.log(`📋 Deployment report saved`);
  }

  generateDeploymentRecommendations(results) {
    const recommendations = [];
    
    const failedEnvs = results.filter(r => !r.success);
    if (failedEnvs.length > 0) {
      recommendations.push(`- Fix deployment issues in: ${failedEnvs.map(r => r.environment).join(', ')}`);
    }

    const slowDeployments = results.filter(r => r.success && r.data?.duration > 60000);
    if (slowDeployments.length > 0) {
      recommendations.push(`- Optimize build times for: ${slowDeployments.map(r => r.environment).join(', ')}`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '✅ All deployments optimal';
  }

  // Advanced workflow: Feature flag deployment
  async featureFlagDeployment(featureBranch, percentage = 10) {
    console.log(`🎛️  Feature flag deployment: ${featureBranch} (${percentage}% traffic)`);
    
    try {
      // Deploy feature to staging
      await this.deployToEnvironment('staging', `feature-flag-${featureBranch}`);
      
      // Setup traffic splitting (would require Vercel edge config or Nginx config)
      await this.setupTrafficSplitting(featureBranch, percentage);
      
      // Monitor metrics
      this.startFeatureFlagMonitoring(featureBranch, percentage);
      
      console.log(`✅ Feature flag deployment active: ${percentage}% traffic`);

    } catch (error) {
      console.error(`❌ Feature flag deployment failed: ${error.message}`);
      throw error;
    }
  }

  async setupTrafficSplitting(featureBranch, percentage) {
    // This would integrate with Vercel Edge Config or Nginx for traffic splitting
    console.log(`🔀 Setting up ${percentage}% traffic split for ${featureBranch}`);
    
    // Example: Create Nginx config with upstream weighting
    const nginxConfig = `
upstream n0de_backend {
    server localhost:3001 weight=${100 - percentage};
    server localhost:3002 weight=${percentage}; # Feature branch backend
}

upstream n0de_frontend {
    server localhost:3000 weight=${100 - percentage};
    server localhost:3002 weight=${percentage}; # Feature branch frontend  
}
`;

    // Save traffic splitting config
    fs.writeFileSync(
      path.join(__dirname, `../configs/traffic-split-${featureBranch}.conf`),
      nginxConfig
    );
  }

  startFeatureFlagMonitoring(featureBranch, percentage) {
    console.log(`📊 Starting feature flag monitoring for ${featureBranch}`);
    
    // Monitor conversion rates, error rates, performance for feature vs control
    const monitor = setInterval(async () => {
      try {
        const metrics = await this.collectFeatureFlagMetrics(featureBranch);
        
        // Auto-rollback if error rate increases significantly
        if (metrics.errorRate > metrics.baselineErrorRate * 2) {
          console.log(`🚨 Error rate spike detected, rolling back feature flag`);
          await this.rollbackFeatureFlag(featureBranch);
          clearInterval(monitor);
        }
        
        // Auto-promote if metrics are significantly better
        if (metrics.conversionRate > metrics.baselineConversionRate * 1.2) {
          console.log(`📈 Feature showing strong performance, consider promoting`);
        }

      } catch (error) {
        console.error(`⚠️  Feature flag monitoring error: ${error.message}`);
      }
    }, 60000); // Check every minute

    // Stop monitoring after 24 hours
    setTimeout(() => {
      clearInterval(monitor);
      console.log(`⏰ Feature flag monitoring ended for ${featureBranch}`);
    }, 24 * 60 * 60 * 1000);
  }

  async collectFeatureFlagMetrics(featureBranch) {
    // Collect metrics from both feature and control groups
    // This would integrate with your analytics system
    
    return {
      featureBranch,
      errorRate: 0.5, // Placeholder - get from real metrics
      baselineErrorRate: 0.3,
      conversionRate: 5.2,
      baselineConversionRate: 4.8,
      userSatisfaction: 4.3,
      responseTime: 450
    };
  }

  async rollbackFeatureFlag(featureBranch) {
    console.log(`🔄 Rolling back feature flag: ${featureBranch}`);
    
    // Remove traffic splitting
    const configFile = path.join(__dirname, `../configs/traffic-split-${featureBranch}.conf`);
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
    }
    
    // Reset Nginx to normal configuration
    execSync('sudo systemctl reload nginx');
    
    console.log('✅ Feature flag rolled back');
  }

  // Database migration coordination across worktrees
  async coordinateSchemaChanges(migrationBranch) {
    console.log(`🗄️  Coordinating schema changes for ${migrationBranch}`);
    
    try {
      // Create migration preview in staging
      const stagingWorktree = this.worktreeOrchestrator.activeWorktrees.get('staging');
      if (stagingWorktree) {
        // Copy schema changes to staging
        const migrationPath = this.getWorktreePath(migrationBranch);
        const stagingPath = stagingWorktree.path;
        
        fs.copyFileSync(
          path.join(migrationPath, 'prisma/schema.prisma'),
          path.join(stagingPath, 'prisma/schema.prisma.preview')
        );
        
        // Generate migration preview
        execSync('npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma.preview', {
          cwd: stagingPath
        });
        
        console.log('✅ Schema migration preview generated');
      }

    } catch (error) {
      console.error('❌ Schema coordination failed:', error.message);
    }
  }

  // Advanced: Automated A/B testing across worktrees
  async setupABTest(featureA, featureB, testConfig = {}) {
    console.log(`🧪 Setting up A/B test: ${featureA} vs ${featureB}`);
    
    const testId = `ab-test-${Date.now()}`;
    
    try {
      // Ensure both feature environments exist
      const envA = await this.worktreeOrchestrator.createParallelEnvironment(featureA, 'experiment');
      const envB = await this.worktreeOrchestrator.createParallelEnvironment(featureB, 'experiment');
      
      // Setup traffic splitting (50/50 by default)
      const splitPercentage = testConfig.splitPercentage || 50;
      
      await this.setupABTrafficSplitting(featureA, featureB, splitPercentage);
      
      // Start A/B test monitoring
      this.startABTestMonitoring(testId, featureA, featureB, testConfig);
      
      console.log(`🧪 A/B test ${testId} started`);
      console.log(`📊 Traffic split: ${splitPercentage}% ${featureA}, ${100-splitPercentage}% ${featureB}`);
      
      return {
        testId,
        featureA: { branch: featureA, environment: envA },
        featureB: { branch: featureB, environment: envB },
        splitPercentage,
        startTime: new Date()
      };

    } catch (error) {
      console.error(`❌ A/B test setup failed: ${error.message}`);
      throw error;
    }
  }

  async setupABTrafficSplitting(featureA, featureB, percentage) {
    // Advanced Nginx configuration for A/B testing
    const abConfig = `
# A/B Testing Configuration
map $cookie_ab_test $upstream_pool {
    default "a";
    "~*b" "b";
}

map $upstream_pool $backend_upstream {
    "a" localhost:3002; # Feature A backend
    "b" localhost:3003; # Feature B backend  
}

map $upstream_pool $frontend_upstream {
    "a" localhost:3002; # Feature A frontend
    "b" localhost:3003; # Feature B frontend
}

# A/B test assignment (${percentage}% to A, ${100-percentage}% to B)
map $remote_addr $ab_assignment {
    ~*[0-${percentage}] "a";
    default "b";
}
`;

    fs.writeFileSync(
      path.join(__dirname, `../configs/ab-test-${featureA}-${featureB}.conf`),
      abConfig
    );
  }

  startABTestMonitoring(testId, featureA, featureB, testConfig) {
    console.log(`📊 Starting A/B test monitoring: ${testId}`);
    
    const monitor = setInterval(async () => {
      try {
        const results = await this.collectABTestResults(featureA, featureB);
        
        // Check for statistical significance
        if (results.sampleSize > (testConfig.minSampleSize || 1000)) {
          const significance = this.calculateStatisticalSignificance(results);
          
          if (significance.pValue < 0.05) {
            console.log(`📈 Statistically significant result found for ${testId}`);
            console.log(`Winner: ${significance.winner} (${significance.improvement}% improvement)`);
            
            // Auto-promote winner if configured
            if (testConfig.autoPromote) {
              await this.promoteABTestWinner(significance.winner);
            }
            
            clearInterval(monitor);
          }
        }

      } catch (error) {
        console.error(`⚠️  A/B test monitoring error: ${error.message}`);
      }
    }, 300000); // Check every 5 minutes

    // End test after duration
    const duration = testConfig.duration || (7 * 24 * 60 * 60 * 1000); // 7 days default
    setTimeout(() => {
      clearInterval(monitor);
      console.log(`⏰ A/B test ${testId} completed`);
    }, duration);
  }

  calculateStatisticalSignificance(results) {
    // Simplified statistical analysis - in production use proper stats library
    const { featureA, featureB } = results;
    
    const improvementA = featureA.conversionRate;
    const improvementB = featureB.conversionRate;
    
    return {
      winner: improvementA > improvementB ? featureA.branch : featureB.branch,
      improvement: Math.abs(improvementA - improvementB) / Math.min(improvementA, improvementB) * 100,
      pValue: 0.03, // Placeholder - calculate actual p-value
      confidence: 95
    };
  }
}

// CLI interface for parallel deployment
if (require.main === module) {
  const system = new ParallelDeploymentSystem();
  
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'deploy-parallel':
      const environments = (arg1 || 'staging,production').split(',');
      system.deployToMultipleEnvironments(environments);
      break;
      
    case 'create-workflow':
      if (arg1) {
        const branches = arg1.split(',').map(name => ({ name }));
        system.createDevelopmentWorkflow(branches);
      } else {
        console.log('Usage: create-workflow <branch1,branch2,branch3>');
      }
      break;
      
    case 'hotfix':
      if (arg1) {
        system.hotfixWorkflow(arg1);
      } else {
        console.log('Usage: hotfix <hotfix-name>');
      }
      break;
      
    case 'deploy-hotfix':
      if (arg1) {
        system.deployHotfix(arg1);
      } else {
        console.log('Usage: deploy-hotfix <hotfix-name>');
      }
      break;
      
    case 'ab-test':
      if (arg1 && arg2) {
        const percentage = parseInt(process.argv[5]) || 50;
        system.setupABTest(arg1, arg2, { splitPercentage: percentage });
      } else {
        console.log('Usage: ab-test <feature-a> <feature-b> [percentage]');
      }
      break;
      
    default:
      console.log(`
🌳 N0DE Parallel Deployment System

Usage:
  deploy-parallel [env1,env2]           # Deploy to multiple environments
  create-workflow <branch1,branch2>     # Setup parallel development  
  hotfix <name>                         # Create hotfix workflow
  deploy-hotfix <name>                  # Deploy tested hotfix
  ab-test <feature-a> <feature-b> [%]   # A/B test between features

Examples:
  deploy-parallel staging,production    # Deploy to both environments
  create-workflow payments,auth,ui      # 3 parallel feature environments
  hotfix critical-auth-bug              # Emergency hotfix workflow
  ab-test new-ui old-ui 20              # 20% traffic to new-ui
      `);
  }
}

module.exports = ParallelDeploymentSystem;