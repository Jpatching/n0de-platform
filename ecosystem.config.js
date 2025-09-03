module.exports = {
  apps: [
    {
      name: 'n0de-backend',
      script: 'dist/backend/main.js',
      cwd: '/home/sol/n0de-deploy',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      log_file: './logs/n0de-backend.log',
      out_file: './logs/n0de-backend-out.log',
      error_file: './logs/n0de-backend-error.log',
      time: true
    }
  ]
};