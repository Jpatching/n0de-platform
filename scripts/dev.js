#!/usr/bin/env node

/**
 * Unified Development Environment Launcher
 * Single command to start all services with hot reload
 * Usage: npm run dev
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// ANSI color codes for service output
const colors = {
  backend: chalk.cyan,
  frontend: chalk.green,
  prisma: chalk.magenta,
  redis: chalk.red,
  postgres: chalk.blue,
  nginx: chalk.yellow,
  watcher: chalk.gray
};

// Service configurations
const services = [
  {
    name: 'postgres',
    command: 'pg_ctl',
    args: ['status'],
    healthCheck: true,
    color: colors.postgres
  },
  {
    name: 'redis',
    command: 'redis-cli',
    args: ['ping'],
    healthCheck: true,
    color: colors.redis
  },
  {
    name: 'backend',
    command: 'npx',
    args: ['nodemon'],
    cwd: '/home/sol/n0de-deploy',
    env: {
      NODE_ENV: 'development',
      PORT: '4000',
      FORCE_COLOR: '1'
    },
    color: colors.backend
  },
  {
    name: 'frontend',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: '/home/sol/n0de-deploy/frontend',
    env: {
      NODE_ENV: 'development',
      PORT: '3000',
      FORCE_COLOR: '1'
    },
    color: colors.frontend
  },
  {
    name: 'prisma-studio',
    command: 'npx',
    args: ['prisma', 'studio', '--browser', 'none'],
    cwd: '/home/sol/n0de-deploy',
    env: {
      PORT: '5555'
    },
    color: colors.prisma,
    optional: true
  },
  {
    name: 'config-watcher',
    command: 'node',
    args: [path.join(__dirname, 'config-watcher.js')],
    cwd: '/home/sol/n0de-deploy',
    color: colors.watcher,
    optional: true
  }
];

// Process tracking
const processes = new Map();
let isShuttingDown = false;

// ASCII Art Banner
function printBanner() {
  console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ███╗   ██╗ ██████╗ ██████╗ ███████╗                ║
║     ████╗  ██║██╔═████╗██╔══██╗██╔════╝                ║
║     ██╔██╗ ██║██║██╔██║██║  ██║█████╗                  ║
║     ██║╚██╗██║████╔╝██║██║  ██║██╔══╝                  ║
║     ██║ ╚████║╚██████╔╝██████╔╝███████╗                ║
║     ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝                ║
║                                                           ║
║            Development Environment v1.0                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));
}

// Health check function
async function checkHealth(service) {
  return new Promise((resolve) => {
    const check = spawn(service.command, service.args, {
      stdio: 'pipe'
    });
    
    let output = '';
    check.stdout?.on('data', (data) => { output += data.toString(); });
    check.stderr?.on('data', (data) => { output += data.toString(); });
    
    check.on('close', (code) => {
      const isHealthy = code === 0 || output.toLowerCase().includes('pong') || output.toLowerCase().includes('running');
      resolve(isHealthy);
    });
    
    setTimeout(() => {
      check.kill();
      resolve(false);
    }, 2000);
  });
}

// Start a service
function startService(service) {
  console.log(service.color(`⚡ Starting ${service.name}...`));
  
  const options = {
    stdio: 'pipe',
    env: { ...process.env, ...service.env }
  };
  
  if (service.cwd) {
    options.cwd = service.cwd;
  }
  
  const proc = spawn(service.command, service.args, options);
  
  // Handle output with color coding
  proc.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(service.color(`[${service.name}]`), line);
    });
  });
  
  proc.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.error(service.color(`[${service.name}]`), chalk.red(line));
    });
  });
  
  proc.on('close', (code) => {
    if (!isShuttingDown) {
      console.log(service.color(`⚠️  ${service.name} exited with code ${code}`));
      
      // Auto-restart for critical services
      if (!service.optional && code !== 0) {
        console.log(service.color(`🔄 Restarting ${service.name} in 2 seconds...`));
        setTimeout(() => {
          if (!isShuttingDown) {
            startService(service);
          }
        }, 2000);
      }
    }
  });
  
  processes.set(service.name, proc);
}

// Graceful shutdown
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(chalk.bold.red('\n\n🛑 Shutting down development environment...'));
  
  processes.forEach((proc, name) => {
    console.log(chalk.gray(`  Stopping ${name}...`));
    proc.kill('SIGTERM');
  });
  
  setTimeout(() => {
    processes.forEach((proc) => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 3000);
}

// Main startup sequence
async function main() {
  printBanner();
  
  // Register shutdown handlers
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);
  
  console.log(chalk.bold.white('\n🔍 Running pre-flight checks...\n'));
  
  // Health checks
  for (const service of services.filter(s => s.healthCheck)) {
    const isHealthy = await checkHealth(service);
    if (isHealthy) {
      console.log(chalk.green(`  ✅ ${service.name} is running`));
    } else {
      console.log(chalk.yellow(`  ⚠️  ${service.name} is not running (will be started if needed)`));
    }
  }
  
  // Check for required files
  const requiredFiles = [
    '/home/sol/n0de-deploy/.env',
    '/home/sol/n0de-deploy/package.json',
    '/home/sol/n0de-deploy/frontend/package.json'
  ];
  
  console.log(chalk.bold.white('\n📋 Checking required files...\n'));
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(chalk.green(`  ✅ ${path.basename(file)}`));
    } else {
      console.log(chalk.red(`  ❌ ${path.basename(file)} not found!`));
    }
  }
  
  // Start services
  console.log(chalk.bold.white('\n🚀 Starting services...\n'));
  
  // Stagger service startup to avoid resource contention
  for (const service of services.filter(s => !s.healthCheck)) {
    startService(service);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print access URLs
  setTimeout(() => {
    console.log(chalk.bold.white('\n\n📍 Access URLs:\n'));
    console.log(chalk.green('  Frontend:       http://localhost:3000'));
    console.log(chalk.cyan('  Backend API:    http://localhost:4000/api/v1'));
    console.log(chalk.cyan('  Health Check:   http://localhost:4000/health'));
    console.log(chalk.magenta('  Prisma Studio:  http://localhost:5555'));
    console.log(chalk.yellow('  API Docs:       http://localhost:4000/docs'));
    console.log(chalk.bold.white('\n  Press Ctrl+C to stop all services\n'));
  }, 5000);
}

// Check if chalk is installed
try {
  require.resolve('chalk');
  main();
} catch(e) {
  console.log('Installing required dependencies...');
  const install = spawn('npm', ['install', 'chalk'], {
    cwd: '/home/sol/n0de-deploy',
    stdio: 'inherit'
  });
  install.on('close', () => {
    delete require.cache[require.resolve(__filename)];
    require(__filename);
  });
}