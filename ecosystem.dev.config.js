/**
 * PM2 Development Configuration
 * Hot reload enabled for development with file watching
 */

module.exports = {
  apps: [
    {
      name: 'n0de-backend-dev',
      script: 'backend/main.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register',
      cwd: '/home/sol/n0de-deploy',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: [
        'backend',
        'prisma/schema.prisma',
        '.env',
        '.env.local',
        '.env.development',
        'config'
      ],
      ignore_watch: [
        'node_modules',
        'logs',
        'dist',
        '.git',
        '*.log',
        'frontend'
      ],
      watch_delay: 1000,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_TRANSPILE_ONLY: 'true',
        FORCE_COLOR: '1'
      },
      error_file: './logs/pm2-dev-error.log',
      out_file: './logs/pm2-dev-out.log',
      log_file: './logs/pm2-dev-combined.log',
      time: true,
      kill_timeout: 3000,
      wait_ready: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Development specific settings
      node_args: '--inspect=9229',
      
      // Hooks for development
      post_update: ['npm install'],
      
      // Events
      events: {
        restart: 'echo "🔄 Backend restarted"',
        reload: 'echo "♻️  Backend reloaded"',
        online: 'echo "✅ Backend online"',
        exit: 'echo "❌ Backend exited"'
      }
    },
    
    {
      name: 'prisma-studio',
      script: 'npx',
      args: 'prisma studio',
      cwd: '/home/sol/n0de-deploy',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      watch: false,
      env: {
        BROWSER: 'none',
        PORT: 5555
      },
      error_file: './logs/prisma-studio-error.log',
      out_file: './logs/prisma-studio-out.log'
    },
    
    {
      name: 'redis-monitor',
      script: 'redis-cli',
      args: 'monitor',
      cwd: '/home/sol/n0de-deploy',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      out_file: './logs/redis-monitor.log',
      error_file: '/dev/null'
    }
  ],
  
  // Deploy configuration for development
  deploy: {
    development: {
      user: 'sol',
      host: 'localhost',
      ref: 'origin/develop',
      repo: 'git@github.com:Jpatching/n0de-platform.git',
      path: '/home/sol/n0de-deploy',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.dev.config.js',
      env: {
        NODE_ENV: 'development'
      }
    }
  }
};