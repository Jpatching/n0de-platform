/**
 * PM2 Production Configuration
 * Optimized cluster mode for 64-core server with high performance settings
 */

const os = require('os');

// Calculate optimal worker count (50% of available cores for balance)
const totalCores = os.cpus().length;
const workerCount = Math.max(Math.floor(totalCores * 0.5), 4);

module.exports = {
  apps: [
    {
      name: 'n0de-backend',
      script: 'dist/backend/main.js',
      cwd: '/home/sol/n0de-deploy',
      
      // Cluster configuration for maximum performance
      instances: workerCount,
      exec_mode: 'cluster',
      
      // Memory management
      max_memory_restart: '4G',
      min_uptime: '30s',
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Auto restart configuration
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
      
      // Watch configuration (disabled in production)
      watch: false,
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        NODE_OPTIONS: '--max-old-space-size=4096'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        NODE_OPTIONS: '--max-old-space-size=4096',
        UV_THREADPOOL_SIZE: 128
      },
      
      // Logging configuration
      log_file: './logs/n0de-backend.log',
      out_file: './logs/n0de-backend-out.log',
      error_file: './logs/n0de-backend-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      
      // Cluster specific settings
      instance_var: 'INSTANCE_ID',
      
      // Zero-downtime reload
      post_update: [
        'npm install --production',
        'npx prisma generate',
        'npm run build'
      ],
      
      // Health monitoring
      cron_restart: '0 3 * * *', // Daily restart at 3 AM
      
      // Advanced cluster options
      cluster_options: {
        schedulingPolicy: os.constants.cluster.SCHED_RR
      }
    },
    
    {
      name: 'n0de-scheduler',
      script: 'dist/backend/scheduler.js',
      cwd: '/home/sol/n0de-deploy',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      time: true
    },
    
    {
      name: 'n0de-websocket',
      script: 'dist/backend/websocket.js',
      cwd: '/home/sol/n0de-deploy',
      instances: 4, // Multiple WebSocket servers for load balancing
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 8080
      },
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      time: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'sol',
      host: '212.108.83.175',
      ref: 'origin/main',
      repo: 'git@github.com:Jpatching/n0de-platform.git',
      path: '/home/sol/n0de-deploy',
      'pre-deploy-local': 'npm test',
      'post-deploy': `
        npm ci --production &&
        npx prisma generate &&
        npx prisma migrate deploy &&
        npm run build &&
        pm2 reload ecosystem.prod.config.js --update-env &&
        pm2 save
      `,
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

// Log configuration summary
if (require.main === module) {
  console.log('PM2 Production Configuration:');
  console.log(`  Total CPU cores: ${totalCores}`);
  console.log(`  Worker processes: ${workerCount}`);
  console.log(`  Memory per worker: 4GB max`);
  console.log(`  Scheduling: Round-robin`);
  console.log(`  Auto-restart: Enabled with 10 max restarts`);
  console.log(`  Zero-downtime reload: Configured`);
}