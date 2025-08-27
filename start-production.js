#!/usr/bin/env node

/**
 * Production startup script for n0de Platform on Railway
 * Starts all services with proper environment configuration
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

const PORT = process.env.PORT || 3000;
const ADMIN_PORT = process.env.ADMIN_PORT || 3002;
const USER_DASHBOARD_PORT = process.env.USER_DASHBOARD_PORT || 3004;
const PAYMENT_SERVICE_PORT = process.env.PAYMENT_SERVICE_PORT || 3005;

console.log(chalk.blue.bold('🚀 Starting n0de Platform in Production Mode\n'));

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'COINBASE_COMMERCE_API_KEY',
  'NOWPAYMENTS_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(chalk.red('❌ Missing required environment variables:'));
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

console.log(chalk.green('✅ Environment variables validated'));

// Set database type for production
process.env.DB_TYPE = 'postgresql';

// Initialize database on startup
console.log(chalk.yellow('🔄 Initializing database...'));
try {
  const { execSync } = await import('child_process');
  execSync('node init-railway-db.js', { stdio: 'inherit' });
  console.log(chalk.green('✅ Database initialized'));
} catch (error) {
  console.error(chalk.red('❌ Database initialization failed:'), error.message);
}

// Service definitions
const services = [
  {
    name: 'Admin Dashboard',
    command: 'node',
    args: ['src/dashboard/admin-dashboard.js'],
    env: { ...process.env, PORT: ADMIN_PORT }
  },
  {
    name: 'User Dashboard API', 
    command: 'node',
    args: ['src/dashboard/user-dashboard.js'],
    env: { ...process.env, USER_DASHBOARD_PORT }
  },
  {
    name: 'Payment Service',
    command: 'node', 
    args: ['src/payments/payment-service.js'],
    env: { ...process.env, PAYMENT_SERVICE_PORT }
  },
  {
    name: 'Auth Middleware Service',
    command: 'node',
    args: ['src/auth/middleware.js'],
    env: { ...process.env, PORT }
  }
];

// Start services
const runningServices = [];

services.forEach(service => {
  console.log(chalk.yellow(`🔄 Starting ${service.name}...`));
  
  const child = spawn(service.command, service.args, {
    env: service.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  child.stdout.on('data', (data) => {
    console.log(chalk.cyan(`[${service.name}]`), data.toString().trim());
  });
  
  child.stderr.on('data', (data) => {
    console.error(chalk.red(`[${service.name}]`), data.toString().trim());
  });
  
  child.on('close', (code) => {
    console.error(chalk.red(`❌ ${service.name} exited with code ${code}`));
  });
  
  runningServices.push(child);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🔄 Shutting down services...'));
  runningServices.forEach(child => child.kill());
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🔄 Shutting down services...'));
  runningServices.forEach(child => child.kill());
  process.exit(0);
});

console.log(chalk.green('✅ All services started successfully'));
console.log(chalk.blue(`📊 Admin Dashboard: http://localhost:${ADMIN_PORT}`));
console.log(chalk.blue(`🔐 User API: http://localhost:${USER_DASHBOARD_PORT}`));
console.log(chalk.blue(`💳 Payment Service: http://localhost:${PAYMENT_SERVICE_PORT}`));
console.log(chalk.blue(`🔒 Auth Service: http://localhost:${PORT}`));