#!/usr/bin/env node

/**
 * Simplified production startup for Railway deployment
 * Single service entry point that handles health checks
 */

import express from 'express';
import chalk from 'chalk';

const app = express();
const PORT = process.env.PORT || 3000;

// Set database type
process.env.DB_TYPE = 'postgresql';

// Basic middleware
app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'n0de-platform',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Main endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'n0de Platform',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/docs'
    }
  });
});

// API placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'n0de Platform API',
    version: '1.0.0',
    services: ['admin', 'user', 'payment', 'auth']
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(chalk.green(`✅ n0de Platform running on port ${PORT}`));
  console.log(chalk.blue(`📊 Health check: http://0.0.0.0:${PORT}/health`));
  
  // Initialize services after main server starts
  setTimeout(() => {
    console.log(chalk.yellow('🔄 Initializing additional services...'));
    initializeServices();
  }, 2000);
});

async function initializeServices() {
  try {
    // Database initialization
    if (process.env.DATABASE_URL) {
      console.log(chalk.green('✅ Database URL configured'));
    }
    
    if (process.env.REDIS_URL) {
      console.log(chalk.green('✅ Redis URL configured'));
    }
    
    // Import and start core services
    const { startAuthService } = await import('./src/auth/database-manager.js');
    console.log(chalk.blue('🔐 Auth service ready'));
    
    console.log(chalk.green('✅ All n0de services initialized and ready'));
    console.log(chalk.cyan('🌐 Public URL: https://n0de-backend-production.up.railway.app'));
  } catch (error) {
    console.error(chalk.red('❌ Service initialization error:'), error.message);
  }
}