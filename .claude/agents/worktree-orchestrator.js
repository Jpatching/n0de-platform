#!/usr/bin/env node
/**
 * Git Worktree Orchestrator for N0DE Platform
 * Enables parallel development streams with isolated environments
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class WorktreeOrchestrator {
  constructor() {
    this.baseRepo = '/home/sol/n0de-deploy';
    this.worktreesPath = '/home/sol/n0de-worktrees';
    this.config = {
      environments: {
        staging: { port: 3001, domain: 'staging.n0de.pro' },
        feature: { port: 3002, domain: 'dev.n0de.pro' },
        hotfix: { port: 3003, domain: 'hotfix.n0de.pro' },
        experiment: { port: 3004, domain: 'exp.n0de.pro' }
      },
      nginxConfigPath: '/etc/nginx/sites-available',
      maxWorktrees: 5
    };
    
    this.activeWorktrees = new Map();
    this.init();
  }

  init() {
    console.log('🌳 Worktree Orchestrator initializing...');
    this.ensureWorktreeDirectory();
    this.loadActiveWorktrees();
    this.setupNginxTemplates();
  }

  ensureWorktreeDirectory() {
    if (!fs.existsSync(this.worktreesPath)) {
      fs.mkdirSync(this.worktreesPath, { recursive: true });
      console.log(`📁 Created worktrees directory: ${this.worktreesPath}`);
    }
  }

  loadActiveWorktrees() {
    try {
      const output = execSync('git worktree list --porcelain', { 
        cwd: this.baseRepo, 
        encoding: 'utf8' 
      });
      
      const worktrees = this.parseWorktreeList(output);
      worktrees.forEach(wt => {
        if (wt.path !== this.baseRepo) {
          this.activeWorktrees.set(wt.branch, wt);
        }
      });
      
      console.log(`📊 Found ${this.activeWorktrees.size} active worktrees`);
    } catch (error) {
      console.log('📊 No existing worktrees found');
    }
  }

  parseWorktreeList(output) {
    const worktrees = [];
    const blocks = output.split('\n\n').filter(Boolean);
    
    blocks.forEach(block => {
      const lines = block.split('\n');
      const worktree = {};
      
      lines.forEach(line => {
        if (line.startsWith('worktree ')) {
          worktree.path = line.replace('worktree ', '');
        } else if (line.startsWith('branch ')) {
          worktree.branch = line.replace('branch refs/heads/', '');
        } else if (line === 'detached') {
          worktree.detached = true;
        }
      });
      
      if (worktree.path) {
        worktrees.push(worktree);
      }
    });
    
    return worktrees;
  }

  async createParallelEnvironment(branchName, environmentType = 'feature') {
    console.log(`🌱 Creating parallel environment for ${branchName}`);
    
    if (this.activeWorktrees.size >= this.config.maxWorktrees) {
      throw new Error(`Maximum worktrees (${this.config.maxWorktrees}) reached`);
    }

    const worktreePath = path.join(this.worktreesPath, branchName);
    const envConfig = this.config.environments[environmentType];

    try {
      // Create worktree
      console.log(`📁 Creating worktree at ${worktreePath}`);
      execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
        cwd: this.baseRepo,
        stdio: 'pipe'
      });

      // Setup environment
      const environment = await this.setupEnvironment(worktreePath, branchName, envConfig);
      
      // Register worktree
      this.activeWorktrees.set(branchName, {
        path: worktreePath,
        branch: branchName,
        environment: environment,
        type: environmentType,
        created: new Date(),
        port: envConfig.port,
        domain: envConfig.domain
      });

      // Save worktree registry
      this.saveWorktreeRegistry();

      console.log(`✅ Parallel environment ready for ${branchName}`);
      console.log(`🌐 Frontend: http://localhost:${envConfig.port}`);
      console.log(`🔗 Domain: https://${envConfig.domain}`);

      return this.activeWorktrees.get(branchName);

    } catch (error) {
      console.error(`❌ Failed to create environment for ${branchName}:`, error.message);
      throw error;
    }
  }

  async setupEnvironment(worktreePath, branchName, envConfig) {
    console.log(`⚙️  Setting up environment for ${branchName}`);

    // Copy environment files
    await this.setupEnvironmentFiles(worktreePath, branchName, envConfig);
    
    // Install dependencies
    await this.installDependencies(worktreePath);
    
    // Setup Nginx configuration
    await this.setupNginxConfig(branchName, envConfig);
    
    // Start services
    const services = await this.startEnvironmentServices(worktreePath, envConfig);

    return {
      path: worktreePath,
      port: envConfig.port,
      domain: envConfig.domain,
      services,
      pid: services.frontend?.pid
    };
  }

  async setupEnvironmentFiles(worktreePath, branchName, envConfig) {
    // Create environment-specific .env files
    const frontendEnvPath = path.join(worktreePath, 'frontend/.env.local');
    const backendEnvPath = path.join(worktreePath, '.env.local');

    // Frontend environment
    const frontendEnv = `
NEXT_PUBLIC_API_URL=http://localhost:${envConfig.port + 1000}
NEXT_PUBLIC_DOMAIN=${envConfig.domain}
NEXT_PUBLIC_ENVIRONMENT=${branchName}
NEXT_PUBLIC_BRANCH=${branchName}
PORT=${envConfig.port}
`;

    // Backend environment  
    const backendEnv = `
PORT=${envConfig.port + 1000}
DATABASE_URL=postgresql://n0de_user:Aguero07!@localhost:5432/n0de_database_${branchName}
REDIS_URL=redis://localhost:6379/1
ENVIRONMENT=${branchName}
BRANCH=${branchName}
`;

    fs.writeFileSync(frontendEnvPath, frontendEnv);
    fs.writeFileSync(backendEnvPath, backendEnv);

    console.log(`📝 Environment files created for ${branchName}`);
  }

  async installDependencies(worktreePath) {
    console.log(`📦 Installing dependencies...`);
    
    try {
      // Backend dependencies
      execSync('npm ci', { cwd: worktreePath, stdio: 'pipe' });
      
      // Frontend dependencies  
      execSync('npm ci', { cwd: path.join(worktreePath, 'frontend'), stdio: 'pipe' });
      
      console.log(`✅ Dependencies installed`);
    } catch (error) {
      console.log(`⚠️  Dependency installation failed, using existing node_modules`);
    }
  }

  async setupNginxConfig(branchName, envConfig) {
    const nginxConfig = `
# N0DE Platform - ${branchName} Environment
server {
    listen 80;
    server_name ${envConfig.domain};
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${envConfig.domain};
    
    # SSL configuration (inherit from main)
    include /etc/nginx/snippets/ssl-n0de.conf;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:${envConfig.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:${envConfig.port + 1000};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS for development
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    }
}
`;

    const configFile = `${this.config.nginxConfigPath}/n0de-${branchName}`;
    fs.writeFileSync(configFile, nginxConfig);
    
    // Create symlink in sites-enabled
    try {
      execSync(`sudo ln -sf ${configFile} /etc/nginx/sites-enabled/n0de-${branchName}`);
      execSync('sudo nginx -t && sudo systemctl reload nginx');
      console.log(`✅ Nginx configured for ${envConfig.domain}`);
    } catch (error) {
      console.log(`⚠️  Nginx configuration failed: ${error.message}`);
    }
  }

  async startEnvironmentServices(worktreePath, envConfig) {
    console.log(`🚀 Starting services...`);
    
    const services = {};

    try {
      // Start frontend (Next.js dev server)
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(worktreePath, 'frontend'),
        env: { ...process.env, PORT: envConfig.port.toString() },
        detached: true,
        stdio: 'ignore'
      });
      
      services.frontend = {
        pid: frontendProcess.pid,
        port: envConfig.port,
        type: 'frontend'
      };

      // Start backend (NestJS dev server)
      const backendProcess = spawn('npm', ['run', 'start:dev'], {
        cwd: worktreePath,
        env: { ...process.env, PORT: (envConfig.port + 1000).toString() },
        detached: true,
        stdio: 'ignore'
      });
      
      services.backend = {
        pid: backendProcess.pid,
        port: envConfig.port + 1000,
        type: 'backend'
      };

      // Wait for services to start
      await this.waitForServices(services);
      
      console.log(`✅ Services started for ${worktreePath}`);
      return services;
      
    } catch (error) {
      console.error(`❌ Service startup failed: ${error.message}`);
      throw error;
    }
  }

  async waitForServices(services, maxWait = 60000) {
    console.log('⏳ Waiting for services to be ready...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      let allReady = true;
      
      // Check frontend
      if (services.frontend) {
        try {
          const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${services.frontend.port}`, { 
            stdio: 'pipe' 
          });
          if (response.toString().trim() !== '200') {
            allReady = false;
          }
        } catch {
          allReady = false;
        }
      }

      // Check backend
      if (services.backend) {
        try {
          const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${services.backend.port}/health`, { 
            stdio: 'pipe' 
          });
          if (response.toString().trim() !== '200') {
            allReady = false;
          }
        } catch {
          allReady = false;
        }
      }

      if (allReady) {
        console.log('✅ All services ready');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Services failed to start within timeout');
  }

  async createFeatureBranch(featureName, baseBranch = 'main') {
    const branchName = `feature/${featureName}`;
    console.log(`🌱 Creating feature branch: ${branchName}`);

    try {
      // Create branch from base
      execSync(`git checkout ${baseBranch}`, { cwd: this.baseRepo });
      execSync(`git pull origin ${baseBranch}`, { cwd: this.baseRepo });
      execSync(`git checkout -b ${branchName}`, { cwd: this.baseRepo });
      execSync(`git push -u origin ${branchName}`, { cwd: this.baseRepo });

      // Create parallel environment
      const environment = await this.createParallelEnvironment(branchName, 'feature');

      console.log(`✅ Feature branch ${branchName} ready for parallel development`);
      return environment;

    } catch (error) {
      console.error(`❌ Failed to create feature branch: ${error.message}`);
      throw error;
    }
  }

  async createStagingEnvironment() {
    console.log('🏗️  Setting up staging environment...');
    
    try {
      // Create staging branch if it doesn't exist
      const stagingBranch = 'staging';
      
      try {
        execSync(`git checkout ${stagingBranch}`, { cwd: this.baseRepo });
      } catch {
        // Branch doesn't exist, create it
        execSync(`git checkout -b ${stagingBranch}`, { cwd: this.baseRepo });
        execSync(`git push -u origin ${stagingBranch}`, { cwd: this.baseRepo });
      }

      // Create staging worktree
      const environment = await this.createParallelEnvironment(stagingBranch, 'staging');
      
      // Setup staging-specific configurations
      await this.configureStagingEnvironment(environment);

      console.log('✅ Staging environment ready');
      console.log('🌐 URL: https://staging.n0de.pro');
      
      return environment;

    } catch (error) {
      console.error('❌ Staging environment setup failed:', error.message);
      throw error;
    }
  }

  async configureStagingEnvironment(environment) {
    const stagingPath = environment.path;
    
    // Create staging-specific database
    await this.createStagingDatabase();
    
    // Setup staging environment variables
    const stagingBackendEnv = `
DATABASE_URL=postgresql://n0de_user:Aguero07!@localhost:5432/n0de_staging
REDIS_URL=redis://localhost:6379/2
ENVIRONMENT=staging
NODE_ENV=staging
JWT_SECRET=staging-jwt-secret-key
GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET}
`;

    const stagingFrontendEnv = `
NEXT_PUBLIC_API_URL=https://staging.n0de.pro/api
NEXT_PUBLIC_DOMAIN=staging.n0de.pro
NEXT_PUBLIC_ENVIRONMENT=staging
`;

    fs.writeFileSync(path.join(stagingPath, '.env.staging'), stagingBackendEnv);
    fs.writeFileSync(path.join(stagingPath, 'frontend/.env.staging'), stagingFrontendEnv);
  }

  async createStagingDatabase() {
    try {
      // Create staging database
      execSync(`PGPASSWORD=Aguero07! createdb -U n0de_user -h localhost n0de_staging`, { 
        stdio: 'pipe' 
      });
      
      // Run migrations on staging database
      execSync(`DATABASE_URL=postgresql://n0de_user:Aguero07!@localhost:5432/n0de_staging npx prisma migrate deploy`, {
        cwd: this.baseRepo,
        stdio: 'pipe'
      });
      
      console.log('✅ Staging database created and migrated');
    } catch (error) {
      console.log('⚠️  Staging database may already exist');
    }
  }

  async parallelDevelopment(branches) {
    console.log(`🔀 Starting parallel development on ${branches.length} branches`);
    
    const environments = [];
    
    // Create environments in parallel
    const promises = branches.map(async (branch) => {
      try {
        const env = await this.createParallelEnvironment(branch.name, branch.type || 'feature');
        
        // Run branch-specific setup
        if (branch.setup) {
          await this.runBranchSetup(env, branch.setup);
        }
        
        return env;
      } catch (error) {
        console.error(`❌ Failed to setup ${branch.name}:`, error.message);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        environments.push(result.value);
        console.log(`✅ ${branches[index].name}: Ready`);
      } else {
        console.log(`❌ ${branches[index].name}: Failed`);
      }
    });

    return environments;
  }

  async runBranchSetup(environment, setupCommands) {
    console.log(`🔧 Running setup for ${environment.branch}`);
    
    for (const command of setupCommands) {
      try {
        execSync(command, { cwd: environment.path, stdio: 'pipe' });
        console.log(`  ✅ ${command}`);
      } catch (error) {
        console.log(`  ❌ ${command}: ${error.message}`);
      }
    }
  }

  async mergeAndDeploy(branchName, targetBranch = 'main') {
    console.log(`🔀 Merging ${branchName} into ${targetBranch}`);
    
    const worktree = this.activeWorktrees.get(branchName);
    if (!worktree) {
      throw new Error(`Worktree for ${branchName} not found`);
    }

    try {
      // Run tests in the feature environment
      await this.runWorktreeTests(worktree);
      
      // Switch to main repo and merge
      execSync(`git checkout ${targetBranch}`, { cwd: this.baseRepo });
      execSync(`git pull origin ${targetBranch}`, { cwd: this.baseRepo });
      execSync(`git merge ${branchName}`, { cwd: this.baseRepo });
      
      // Push merged changes
      execSync(`git push origin ${targetBranch}`, { cwd: this.baseRepo });
      
      // Auto-deployment will be triggered by post-merge hook
      console.log(`✅ Merged ${branchName} into ${targetBranch}`);
      console.log(`🚀 Auto-deployment triggered by post-merge hook`);
      
      // Cleanup feature environment
      await this.cleanupWorktree(branchName);
      
    } catch (error) {
      console.error(`❌ Merge failed: ${error.message}`);
      throw error;
    }
  }

  async runWorktreeTests(worktree) {
    console.log(`🧪 Running tests in ${worktree.branch} environment`);
    
    // Backend tests
    execSync('npm test', { cwd: worktree.path });
    
    // Frontend build test
    execSync('npm run build', { cwd: path.join(worktree.path, 'frontend') });
    
    // Integration tests specific to this environment
    await this.runIntegrationTests(worktree);
  }

  async runIntegrationTests(worktree) {
    console.log(`🔗 Running integration tests for ${worktree.branch}`);
    
    const baseUrl = `http://localhost:${worktree.port}`;
    const apiUrl = `http://localhost:${worktree.port + 1000}`;
    
    try {
      // Test frontend is serving
      execSync(`curl -s -f ${baseUrl}`, { stdio: 'pipe' });
      
      // Test backend API
      execSync(`curl -s -f ${apiUrl}/health`, { stdio: 'pipe' });
      
      // Test auth flow (if applicable)
      execSync(`curl -s -f ${apiUrl}/api/v1/auth/google`, { stdio: 'pipe' });
      
      console.log('✅ Integration tests passed');
      
    } catch (error) {
      throw new Error(`Integration tests failed: ${error.message}`);
    }
  }

  async cleanupWorktree(branchName) {
    console.log(`🧹 Cleaning up worktree: ${branchName}`);
    
    const worktree = this.activeWorktrees.get(branchName);
    if (!worktree) return;

    try {
      // Stop services
      if (worktree.environment?.services) {
        Object.values(worktree.environment.services).forEach(service => {
          if (service.pid) {
            try {
              process.kill(service.pid, 'SIGTERM');
            } catch {
              // Process may already be dead
            }
          }
        });
      }

      // Remove nginx config
      try {
        execSync(`sudo rm -f /etc/nginx/sites-enabled/n0de-${branchName}`);
        execSync(`sudo rm -f ${this.config.nginxConfigPath}/n0de-${branchName}`);
        execSync('sudo nginx -t && sudo systemctl reload nginx');
      } catch {
        console.log('⚠️  Nginx cleanup failed');
      }

      // Remove worktree
      execSync(`git worktree remove "${worktree.path}"`, { cwd: this.baseRepo });
      
      // Delete feature branch
      execSync(`git branch -d ${branchName}`, { cwd: this.baseRepo });
      execSync(`git push origin --delete ${branchName}`, { cwd: this.baseRepo });

      // Remove from registry
      this.activeWorktrees.delete(branchName);
      this.saveWorktreeRegistry();
      
      console.log(`✅ Worktree ${branchName} cleaned up`);
      
    } catch (error) {
      console.error(`❌ Cleanup failed: ${error.message}`);
    }
  }

  async listActiveEnvironments() {
    console.log('🌳 Active Parallel Environments');
    console.log('==============================');
    
    this.activeWorktrees.forEach((worktree, branchName) => {
      const status = this.checkWorktreeHealth(worktree);
      console.log(`📍 ${branchName} (${worktree.type})`);
      console.log(`   Path: ${worktree.path}`);
      console.log(`   Frontend: http://localhost:${worktree.port} ${status.frontend}`);
      console.log(`   Backend: http://localhost:${worktree.port + 1000} ${status.backend}`);
      console.log(`   Domain: https://${worktree.domain}`);
      console.log('');
    });
  }

  checkWorktreeHealth(worktree) {
    const status = { frontend: '❓', backend: '❓' };
    
    try {
      // Check frontend
      execSync(`curl -s -o /dev/null http://localhost:${worktree.port}`, { stdio: 'pipe' });
      status.frontend = '✅';
    } catch {
      status.frontend = '❌';
    }

    try {
      // Check backend
      execSync(`curl -s -o /dev/null http://localhost:${worktree.port + 1000}/health`, { stdio: 'pipe' });
      status.backend = '✅';
    } catch {
      status.backend = '❌';
    }

    return status;
  }

  saveWorktreeRegistry() {
    const registry = Array.from(this.activeWorktrees.entries()).map(([branch, data]) => ({
      branch,
      ...data,
      created: data.created.toISOString()
    }));

    fs.writeFileSync(
      path.join(__dirname, '../worktree-registry.json'),
      JSON.stringify(registry, null, 2)
    );
  }

  setupNginxTemplates() {
    // Create SSL snippet for all environments
    const sslSnippet = `
# SSL Configuration for N0DE environments
ssl_certificate /etc/letsencrypt/live/n0de.pro/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/n0de.pro/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
`;

    const snippetPath = '/etc/nginx/snippets/ssl-n0de.conf';
    if (!fs.existsSync(snippetPath)) {
      try {
        fs.writeFileSync(snippetPath, sslSnippet);
      } catch (error) {
        if (error.code === 'EACCES') {
          console.log('⚠️  Skipping nginx SSL snippet creation - requires sudo permissions');
        } else {
          throw error;
        }
      }
    }
  }

  // Parallel testing across all worktrees
  async runParallelTests() {
    console.log('🧪 Running parallel tests across all environments');
    
    const testPromises = Array.from(this.activeWorktrees.values()).map(async (worktree) => {
      try {
        console.log(`🧪 Testing ${worktree.branch}...`);
        await this.runWorktreeTests(worktree);
        return { branch: worktree.branch, success: true };
      } catch (error) {
        return { branch: worktree.branch, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(testPromises);
    
    console.log('📊 Parallel Test Results:');
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { branch, success, error } = result.value;
        console.log(`  ${success ? '✅' : '❌'} ${branch}${error ? ': ' + error : ''}`);
      }
    });

    return results;
  }

  // Sync changes across worktrees (useful for shared updates)
  async syncWorktrees(fromBranch, toBranches) {
    console.log(`🔄 Syncing changes from ${fromBranch} to ${toBranches.join(', ')}`);
    
    const fromWorktree = this.activeWorktrees.get(fromBranch);
    if (!fromWorktree) {
      throw new Error(`Source worktree ${fromBranch} not found`);
    }

    for (const toBranch of toBranches) {
      const toWorktree = this.activeWorktrees.get(toBranch);
      if (!toWorktree) {
        console.log(`⚠️  Target worktree ${toBranch} not found, skipping`);
        continue;
      }

      try {
        // Cherry-pick or merge specific changes
        execSync(`git fetch origin`, { cwd: toWorktree.path });
        execSync(`git merge origin/${fromBranch}`, { cwd: toWorktree.path });
        
        // Restart services to apply changes
        await this.restartWorktreeServices(toWorktree);
        
        console.log(`✅ Synced ${fromBranch} → ${toBranch}`);
      } catch (error) {
        console.log(`❌ Sync failed ${fromBranch} → ${toBranch}: ${error.message}`);
      }
    }
  }

  async restartWorktreeServices(worktree) {
    console.log(`🔄 Restarting services for ${worktree.branch}`);
    
    // Kill existing services
    if (worktree.environment?.services) {
      Object.values(worktree.environment.services).forEach(service => {
        if (service.pid) {
          try {
            process.kill(service.pid, 'SIGTERM');
          } catch {
            // Process may already be dead
          }
        }
      });
    }

    // Start new services
    const newServices = await this.startEnvironmentServices(
      worktree.path, 
      this.config.environments[worktree.type]
    );

    worktree.environment.services = newServices;
    this.saveWorktreeRegistry();
  }
}

// CLI interface with parallel development commands
if (require.main === module) {
  const orchestrator = new WorktreeOrchestrator();
  
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'create':
      if (arg1 && arg2) {
        orchestrator.createFeatureBranch(arg1, arg2);
      } else if (arg1) {
        orchestrator.createFeatureBranch(arg1);
      } else {
        console.log('Usage: create <feature-name> [base-branch]');
      }
      break;
      
    case 'staging':
      orchestrator.createStagingEnvironment();
      break;
      
    case 'list':
      orchestrator.listActiveEnvironments();
      break;
      
    case 'merge':
      if (arg1 && arg2) {
        orchestrator.mergeAndDeploy(arg1, arg2);
      } else {
        console.log('Usage: merge <branch-name> <target-branch>');
      }
      break;
      
    case 'cleanup':
      if (arg1) {
        orchestrator.cleanupWorktree(arg1);
      } else {
        console.log('Usage: cleanup <branch-name>');
      }
      break;
      
    case 'test-all':
      orchestrator.runParallelTests();
      break;
      
    case 'sync':
      if (arg1 && arg2) {
        const toBranches = arg2.split(',');
        orchestrator.syncWorktrees(arg1, toBranches);
      } else {
        console.log('Usage: sync <from-branch> <to-branch1,to-branch2>');
      }
      break;
      
    default:
      console.log(`
🌳 N0DE Worktree Orchestrator

Usage:
  node worktree-orchestrator.js create <feature-name> [base]  # Create feature branch environment
  node worktree-orchestrator.js staging                       # Setup staging environment  
  node worktree-orchestrator.js list                          # List active environments
  node worktree-orchestrator.js merge <branch> <target>       # Merge and deploy
  node worktree-orchestrator.js cleanup <branch>              # Remove environment
  node worktree-orchestrator.js test-all                      # Test all environments
  node worktree-orchestrator.js sync <from> <to1,to2>        # Sync changes between branches

Examples:
  create payments-v2                    # Create feature/payments-v2 branch + environment
  staging                               # Setup staging.n0de.pro environment
  merge feature/payments-v2 main        # Merge feature to main + auto-deploy
  sync main feature/auth,feature/ui     # Sync main changes to multiple features
      `);
  }
}

module.exports = WorktreeOrchestrator;