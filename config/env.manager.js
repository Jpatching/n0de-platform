/**
 * Centralized Environment Configuration Manager
 * Single source of truth for all environment variables
 * Handles environment-specific overrides and validation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnvManager {
  constructor() {
    this.config = {};
    this.secrets = new Map();
    this.validators = new Map();
    this.watchers = new Map();
    this.loadOrder = [
      '.env.defaults',      // Base defaults
      '.env',              // Main configuration
      `.env.${process.env.NODE_ENV || 'development'}`, // Environment specific
      '.env.local',        // Local overrides (not in git)
      '.env.vault'         // Encrypted production secrets
    ];
  }

  /**
   * Initialize and load all environment configurations
   */
  async init() {
    console.log('🔧 Initializing Environment Configuration Manager...');
    
    // Load configurations in priority order
    for (const fileName of this.loadOrder) {
      await this.loadEnvFile(fileName);
    }

    // Validate required variables
    this.validateRequiredVars();
    
    // Set up file watchers for hot reload
    if (process.env.NODE_ENV !== 'production') {
      this.setupWatchers();
    }

    // Merge with process.env
    this.applyToProcess();
    
    console.log('✅ Environment configuration loaded successfully');
    return this.config;
  }

  /**
   * Load and parse environment file
   */
  async loadEnvFile(fileName) {
    const filePath = path.join(process.cwd(), fileName);
    
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const vars = this.parseEnvFile(content);
      
      // Handle encrypted vault files
      if (fileName === '.env.vault' && process.env.DOTENV_KEY) {
        const decrypted = this.decryptVault(content, process.env.DOTENV_KEY);
        Object.assign(this.config, decrypted);
      } else {
        Object.assign(this.config, vars);
      }
      
      console.log(`  📄 Loaded: ${fileName} (${Object.keys(vars).length} vars)`);
    } catch (error) {
      console.error(`  ❌ Failed to load ${fileName}:`, error.message);
    }
  }

  /**
   * Parse .env file content
   */
  parseEnvFile(content) {
    const vars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) continue;
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Handle variable interpolation ${VAR}
        value = value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
          return this.config[varName] || process.env[varName] || match;
        });
        
        vars[key.trim()] = value;
      }
    }
    
    return vars;
  }

  /**
   * Decrypt vault file using DOTENV_KEY
   */
  decryptVault(content, key) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(content, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt vault:', error);
      return {};
    }
  }

  /**
   * Define required environment variables with validation
   */
  defineRequired() {
    const required = {
      // Database
      DATABASE_URL: {
        validator: (val) => val && val.startsWith('postgresql://'),
        message: 'Valid PostgreSQL connection string required'
      },
      REDIS_URL: {
        validator: (val) => val && val.startsWith('redis://'),
        message: 'Valid Redis connection string required'
      },
      
      // Security
      JWT_SECRET: {
        validator: (val) => val && val.length >= 32,
        message: 'JWT secret must be at least 32 characters'
      },
      
      // URLs
      FRONTEND_URL: {
        validator: (val) => val && (val.startsWith('http://') || val.startsWith('https://')),
        message: 'Valid frontend URL required'
      },
      BACKEND_URL: {
        validator: (val) => val && (val.startsWith('http://') || val.startsWith('https://')),
        message: 'Valid backend URL required'
      },
      
      // OAuth (conditional)
      ...(process.env.NODE_ENV === 'production' && {
        GOOGLE_CLIENT_ID: {
          validator: (val) => val && val.length > 0,
          message: 'Google OAuth client ID required for production'
        },
        GOOGLE_CLIENT_SECRET: {
          validator: (val) => val && val.length > 0,
          message: 'Google OAuth client secret required for production'
        }
      })
    };
    
    for (const [key, config] of Object.entries(required)) {
      this.validators.set(key, config);
    }
  }

  /**
   * Validate required environment variables
   */
  validateRequiredVars() {
    this.defineRequired();
    const errors = [];
    
    for (const [key, config] of this.validators) {
      const value = this.config[key] || process.env[key];
      
      if (!config.validator(value)) {
        errors.push(`  ❌ ${key}: ${config.message}`);
      }
    }
    
    if (errors.length > 0) {
      console.error('\n⚠️  Environment validation errors:');
      errors.forEach(err => console.error(err));
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  /**
   * Apply configuration to process.env
   */
  applyToProcess() {
    for (const [key, value] of Object.entries(this.config)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  /**
   * Set up file watchers for hot reload in development
   */
  setupWatchers() {
    console.log('  👁️  Setting up environment file watchers...');
    
    for (const fileName of this.loadOrder) {
      const filePath = path.join(process.cwd(), fileName);
      
      if (fs.existsSync(filePath)) {
        const watcher = fs.watch(filePath, async (eventType) => {
          if (eventType === 'change') {
            console.log(`\n🔄 Environment file changed: ${fileName}`);
            await this.reload();
            
            // Emit event for other systems to react
            if (global.envReloadCallbacks) {
              global.envReloadCallbacks.forEach(cb => cb(this.config));
            }
          }
        });
        
        this.watchers.set(fileName, watcher);
      }
    }
  }

  /**
   * Reload all environment configurations
   */
  async reload() {
    this.config = {};
    
    for (const fileName of this.loadOrder) {
      await this.loadEnvFile(fileName);
    }
    
    this.validateRequiredVars();
    this.applyToProcess();
    
    console.log('✅ Environment configuration reloaded');
  }

  /**
   * Register callback for environment reload events
   */
  onReload(callback) {
    if (!global.envReloadCallbacks) {
      global.envReloadCallbacks = [];
    }
    global.envReloadCallbacks.push(callback);
  }

  /**
   * Get specific configuration value
   */
  get(key, defaultValue = null) {
    return this.config[key] || process.env[key] || defaultValue;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(service) {
    const serviceConfigs = {
      database: {
        url: this.get('DATABASE_URL'),
        poolMin: parseInt(this.get('DB_POOL_MIN', '10')),
        poolMax: parseInt(this.get('DB_POOL_MAX', '100')),
        poolIdle: parseInt(this.get('DB_POOL_IDLE', '10000')),
        poolAcquire: parseInt(this.get('DB_POOL_ACQUIRE', '30000')),
        queryTimeout: parseInt(this.get('DB_QUERY_TIMEOUT', '30000'))
      },
      redis: {
        url: this.get('REDIS_URL'),
        maxRetriesPerRequest: parseInt(this.get('REDIS_MAX_RETRIES', '3')),
        enableReadyCheck: this.get('REDIS_READY_CHECK', 'true') === 'true',
        lazyConnect: this.get('REDIS_LAZY_CONNECT', 'false') === 'true'
      },
      cors: {
        origins: this.get('CORS_ORIGINS', '').split(',').filter(Boolean),
        credentials: this.get('CORS_CREDENTIALS', 'true') === 'true'
      },
      jwt: {
        secret: this.get('JWT_SECRET'),
        expiresIn: this.get('JWT_EXPIRES_IN', '7d'),
        refreshExpiresIn: this.get('JWT_REFRESH_EXPIRES_IN', '30d')
      },
      stripe: {
        secretKey: this.get('STRIPE_SECRET_KEY'),
        publishableKey: this.get('STRIPE_PUBLISHABLE_KEY'),
        webhookSecret: this.get('STRIPE_WEBHOOK_SECRET')
      },
      oauth: {
        google: {
          clientId: this.get('GOOGLE_CLIENT_ID'),
          clientSecret: this.get('GOOGLE_CLIENT_SECRET'),
          redirectUri: this.get('GOOGLE_OAUTH_REDIRECT_URI')
        },
        github: {
          clientId: this.get('GITHUB_CLIENT_ID'),
          clientSecret: this.get('GITHUB_CLIENT_SECRET'),
          redirectUri: this.get('GITHUB_OAUTH_REDIRECT_URI')
        }
      }
    };
    
    return serviceConfigs[service] || {};
  }

  /**
   * Clean up watchers
   */
  cleanup() {
    for (const [fileName, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

// Create singleton instance
const envManager = new EnvManager();

// Export for use in other modules
module.exports = envManager;

// Auto-initialize if running directly
if (require.main === module) {
  envManager.init().then(() => {
    console.log('\nConfiguration Summary:');
    console.log('  Environment:', process.env.NODE_ENV || 'development');
    console.log('  Database:', envManager.get('DATABASE_URL') ? '✅ Configured' : '❌ Missing');
    console.log('  Redis:', envManager.get('REDIS_URL') ? '✅ Configured' : '❌ Missing');
    console.log('  Frontend URL:', envManager.get('FRONTEND_URL'));
    console.log('  Backend URL:', envManager.get('BACKEND_URL'));
  });
}