// Conditional import for SQLite (only when needed)
let sqlite3, open;
import pg from 'pg';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

class DatabaseManager {
  constructor(config = {}) {
    this.config = {
      type: process.env.DB_TYPE || config.type || (process.env.DATABASE_URL ? 'postgresql' : 'sqlite'),
      sqlite: {
        filename: config.sqlite?.filename || './data/users.db'
      },
      postgresql: process.env.DATABASE_URL ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      } : {
        host: process.env.DB_HOST || config.postgresql?.host || 'localhost',
        port: process.env.DB_PORT || config.postgresql?.port || 5432,
        database: process.env.DB_NAME || config.postgresql?.database || 'n0de_db',
        user: process.env.DB_USER || config.postgresql?.user || 'n0de_user',
        password: process.env.DB_PASSWORD || config.postgresql?.password || 'n0de_password'
      },
      redis: process.env.REDIS_URL ? {
        url: process.env.REDIS_URL
      } : {
        host: process.env.REDIS_HOST || config.redis?.host || 'localhost',
        port: process.env.REDIS_PORT || config.redis?.port || 6379,
        password: process.env.REDIS_PASSWORD || config.redis?.password || null
      }
    };
    
    this.db = null;
    this.redis = null;
    this.isInitialized = false;
  }

  async init() {
    console.log(`Initializing database with type: ${this.config.type}`);
    
    // Initialize Redis for caching regardless of primary database
    await this.initRedis();
    
    // Initialize primary database
    switch (this.config.type) {
      case 'postgresql':
        await this.initPostgreSQL();
        break;
      case 'sqlite':
      default:
        await this.initSQLite();
        break;
    }
    
    // Create tables and seed data
    await this.createTables();
    await this.seedPaymentTiers();
    
    this.isInitialized = true;
    console.log('Database initialized successfully');
  }

  async initRedis() {
    try {
      const redisConfig = this.config.redis.url ? {
        ...this.config.redis,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: null,
        retryConnectOnFailure: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
      } : {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: null,
        retryConnectOnFailure: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
      };

      this.redis = new Redis(redisConfig);

      // Add error handlers to prevent unhandled errors
      this.redis.on('error', (error) => {
        console.warn('⚠️  Redis connection error:', error.message);
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      this.redis.on('reconnecting', (ms) => {
        console.log(`🔄 Redis reconnecting in ${ms}ms...`);
      });

      this.redis.on('close', () => {
        console.log('📴 Redis connection closed');
      });

      // Test Redis connection with timeout
      try {
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
        ]);
        console.log('✅ Redis connection established and tested');
      } catch (testError) {
        console.warn('⚠️  Redis connection test failed, will continue without caching:', testError.message);
      }
      
      // Set cache expiration times
      this.cacheExpiry = {
        user: 300, // 5 minutes
        stats: 60,  // 1 minute
        rateLimit: 60 // 1 minute
      };
      
    } catch (error) {
      console.warn('⚠️  Redis connection failed, continuing without cache:', error.message);
      this.redis = null;
    }
  }

  // Helper method to safely check Redis availability
  isRedisAvailable() {
    return this.redis && this.redis.status === 'ready';
  }

  async initSQLite() {
    // Dynamic import of SQLite dependencies only when needed
    if (!sqlite3) {
      const sqlite3Module = await import('sqlite3');
      const openModule = await import('sqlite');
      sqlite3 = sqlite3Module.default;
      open = openModule.open;
    }
    
    this.db = await open({
      filename: this.config.sqlite.filename,
      driver: sqlite3.Database
    });
    console.log('✅ SQLite database connected');
  }

  async initPostgreSQL() {
    const { Pool } = pg;
    this.db = new Pool(this.config.postgresql);
    
    // Test connection
    try {
      const client = await this.db.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ PostgreSQL database connected');
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      console.log('📋 Falling back to SQLite...');
      this.config.type = 'sqlite';
      await this.initSQLite();
    }
  }

  async createTables() {
    const isPostgreSQL = this.config.type === 'postgresql';
    
    // Users table
    const usersTableSQL = isPostgreSQL ? `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uuid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
        rate_limit INTEGER NOT NULL DEFAULT 100,
        monthly_requests BIGINT NOT NULL DEFAULT 100000,
        requests_used BIGINT NOT NULL DEFAULT 0,
        monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        notes TEXT
      )
    ` : `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        plan_type TEXT NOT NULL DEFAULT 'free',
        rate_limit INTEGER NOT NULL DEFAULT 100,
        monthly_requests INTEGER NOT NULL DEFAULT 100000,
        requests_used INTEGER NOT NULL DEFAULT 0,
        monthly_cost REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        notes TEXT
      )
    `;

    // Usage logs table
    const usageTableSQL = isPostgreSQL ? `
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_uuid TEXT NOT NULL,
        requests INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        method VARCHAR(100)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uuid TEXT NOT NULL,
        requests INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        method TEXT,
        FOREIGN KEY (user_uuid) REFERENCES users (uuid)
      )
    `;

    // Payment tiers table
    const tiersTableSQL = isPostgreSQL ? `
      CREATE TABLE IF NOT EXISTS payment_tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        monthly_requests BIGINT NOT NULL,
        rate_limit INTEGER NOT NULL,
        monthly_cost DECIMAL(10,2) NOT NULL,
        features TEXT
      )
    ` : `
      CREATE TABLE IF NOT EXISTS payment_tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        monthly_requests INTEGER NOT NULL,
        rate_limit INTEGER NOT NULL,
        monthly_cost REAL NOT NULL,
        features TEXT
      )
    `;

    if (isPostgreSQL) {
      const client = await this.db.connect();
      try {
        await client.query(usersTableSQL);
        await client.query(usageTableSQL);
        await client.query(tiersTableSQL);
      } finally {
        client.release();
      }
    } else {
      await this.db.exec(usersTableSQL);
      await this.db.exec(usageTableSQL);
      await this.db.exec(tiersTableSQL);
    }
  }

  async seedPaymentTiers() {
    const tiers = [
      { name: 'free', monthly_requests: 100000, rate_limit: 10, monthly_cost: 0, features: 'Basic RPC Access' },
      { name: 'starter', monthly_requests: 1000000, rate_limit: 50, monthly_cost: 29, features: 'Priority RPC, Email Support' },
      { name: 'pro', monthly_requests: 10000000, rate_limit: 200, monthly_cost: 99, features: 'High Performance, Priority Support, Analytics' },
      { name: 'enterprise', monthly_requests: 100000000, rate_limit: 1000, monthly_cost: 299, features: 'Dedicated Resources, SLA, 24/7 Support' },
      { name: 'unlimited', monthly_requests: -1, rate_limit: 10000, monthly_cost: 0, features: 'Full Testing Access' }
    ];

    for (const tier of tiers) {
      if (this.config.type === 'postgresql') {
        const client = await this.db.connect();
        try {
          await client.query(`
            INSERT INTO payment_tiers (name, monthly_requests, rate_limit, monthly_cost, features)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (name) DO NOTHING
          `, [tier.name, tier.monthly_requests, tier.rate_limit, tier.monthly_cost, tier.features]);
        } finally {
          client.release();
        }
      } else {
        await this.db.run(`
          INSERT OR IGNORE INTO payment_tiers (name, monthly_requests, rate_limit, monthly_cost, features)
          VALUES (?, ?, ?, ?, ?)
        `, [tier.name, tier.monthly_requests, tier.rate_limit, tier.monthly_cost, tier.features]);
      }
    }
  }

  generateApiKey() {
    return 'n0de_' + crypto.randomBytes(32).toString('hex');
  }

  async createUser(email, name, planType = 'free', notes = '') {
    const uuid = uuidv4();
    const apiKey = this.generateApiKey();
    
    // Get plan details
    const tier = await this.getTier(planType);
    if (!tier) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        const result = await client.query(`
          INSERT INTO users (uuid, email, name, api_key, plan_type, rate_limit, monthly_requests, monthly_cost, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [uuid, email, name, apiKey, planType, tier.rate_limit, tier.monthly_requests, tier.monthly_cost, notes]);
        
        const user = {
          id: result.rows[0].id,
          uuid,
          email,
          name,
          apiKey,
          planType,
          rateLimit: tier.rate_limit,
          monthlyRequests: tier.monthly_requests,
          monthlyCost: tier.monthly_cost
        };
        
        // Cache the user
        await this.cacheUser(apiKey, user);
        return user;
      } finally {
        client.release();
      }
    } else {
      const result = await this.db.run(`
        INSERT INTO users (uuid, email, name, api_key, plan_type, rate_limit, monthly_requests, monthly_cost, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuid, email, name, apiKey, planType, tier.rate_limit, tier.monthly_requests, tier.monthly_cost, notes]);

      const user = {
        id: result.lastID,
        uuid,
        email,
        name,
        apiKey,
        planType,
        rateLimit: tier.rate_limit,
        monthlyRequests: tier.monthly_requests,
        monthlyCost: tier.monthly_cost
      };
      
      // Cache the user
      await this.cacheUser(apiKey, user);
      return user;
    }
  }

  async getTier(planType) {
    const cacheKey = `tier:${planType}`;
    
    // Try Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn('Redis cache error:', error.message);
      }
    }

    let tier;
    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        const result = await client.query('SELECT * FROM payment_tiers WHERE name = $1', [planType]);
        tier = result.rows[0];
      } finally {
        client.release();
      }
    } else {
      tier = await this.db.get('SELECT * FROM payment_tiers WHERE name = ?', [planType]);
    }

    // Cache the result
    if (tier && this.redis) {
      try {
        await this.redis.setex(cacheKey, this.cacheExpiry.user, JSON.stringify(tier));
      } catch (error) {
        console.warn('Redis cache set error:', error.message);
      }
    }

    return tier;
  }

  async getUserByApiKey(apiKey) {
    const cacheKey = `user:${apiKey}`;
    
    // Try Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn('Redis cache error:', error.message);
      }
    }

    let user;
    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        const result = await client.query(`
          SELECT * FROM users WHERE api_key = $1 AND status = 'active'
        `, [apiKey]);
        user = result.rows[0];
      } finally {
        client.release();
      }
    } else {
      user = await this.db.get(`
        SELECT * FROM users WHERE api_key = ? AND status = 'active'
      `, [apiKey]);
    }

    // Cache the user
    if (user) {
      await this.cacheUser(apiKey, user);
    }

    return user;
  }

  async cacheUser(apiKey, user) {
    if (!this.redis) return;
    
    try {
      const cacheKey = `user:${apiKey}`;
      await this.redis.setex(cacheKey, this.cacheExpiry.user, JSON.stringify(user));
    } catch (error) {
      console.warn('Redis cache set error:', error.message);
    }
  }

  async updateUsage(apiKey, requests = 1, ipAddress = '', method = '') {
    const user = await this.getUserByApiKey(apiKey);
    if (!user) return false;

    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        await client.query(`
          UPDATE users 
          SET requests_used = requests_used + $1, last_used = CURRENT_TIMESTAMP 
          WHERE api_key = $2
        `, [requests, apiKey]);

        await client.query(`
          INSERT INTO usage_logs (user_uuid, requests, ip_address, method)
          VALUES ($1, $2, $3, $4)
        `, [user.uuid, requests, ipAddress, method]);
      } finally {
        client.release();
      }
    } else {
      await this.db.run(`
        UPDATE users 
        SET requests_used = requests_used + ?, last_used = CURRENT_TIMESTAMP 
        WHERE api_key = ?
      `, [requests, apiKey]);

      await this.db.run(`
        INSERT INTO usage_logs (user_uuid, requests, ip_address, method)
        VALUES (?, ?, ?, ?)
      `, [user.uuid, requests, ipAddress, method]);
    }

    // Invalidate cache
    if (this.redis) {
      try {
        await this.redis.del(`user:${apiKey}`);
        await this.redis.del('stats:usage');
      } catch (error) {
        console.warn('Redis cache invalidation error:', error.message);
      }
    }

    return true;
  }

  async checkRateLimit(apiKey) {
    const user = await this.getUserByApiKey(apiKey);
    if (!user) return { allowed: false, reason: 'Invalid API key' };

    // Convert string values to numbers for PostgreSQL compatibility
    const monthlyRequests = parseInt(user.monthly_requests) || 0;
    const requestsUsed = parseInt(user.requests_used) || 0;
    const rateLimit = parseInt(user.rate_limit) || 0;

    // Check monthly limit (if not unlimited)
    if (monthlyRequests > 0 && requestsUsed >= monthlyRequests) {
      return { allowed: false, reason: 'Monthly quota exceeded', user };
    }

    return { allowed: true, user, rateLimit };
  }

  async listUsers() {
    const cacheKey = 'users:list';
    
    // Try Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn('Redis cache error:', error.message);
      }
    }

    let users;
    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        const result = await client.query(`
          SELECT uuid, email, name, plan_type, rate_limit, monthly_requests, 
                 requests_used, monthly_cost, status, created_at, last_used, notes
          FROM users 
          ORDER BY created_at DESC
        `);
        users = result.rows;
      } finally {
        client.release();
      }
    } else {
      users = await this.db.all(`
        SELECT uuid, email, name, plan_type, rate_limit, monthly_requests, 
               requests_used, monthly_cost, status, created_at, last_used, notes
        FROM users 
        ORDER BY created_at DESC
      `);
    }

    // Normalize data types for consistent handling
    if (users) {
      users = users.map(user => ({
        ...user,
        rate_limit: parseInt(user.rate_limit) || 0,
        monthly_requests: user.monthly_requests === '-1' ? -1 : parseInt(user.monthly_requests) || 0,
        requests_used: parseInt(user.requests_used) || 0,
        monthly_cost: parseFloat(user.monthly_cost) || 0
      }));
    }

    // Cache the results
    if (this.redis && users) {
      try {
        await this.redis.setex(cacheKey, this.cacheExpiry.stats, JSON.stringify(users));
      } catch (error) {
        console.warn('Redis cache set error:', error.message);
      }
    }

    return users || [];
  }

  async getUsageStats() {
    const cacheKey = 'stats:usage';
    
    // Try Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn('Redis cache error:', error.message);
      }
    }

    let stats, planBreakdown;
    
    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        const statsResult = await client.query(`
          SELECT 
            COUNT(*) as total_users,
            SUM(requests_used) as total_requests,
            SUM(monthly_cost) as total_revenue
          FROM users WHERE status = 'active'
        `);
        stats = statsResult.rows[0];

        const planResult = await client.query(`
          SELECT plan_type, COUNT(*) as user_count, SUM(monthly_cost) as revenue
          FROM users 
          WHERE status = 'active'
          GROUP BY plan_type
        `);
        planBreakdown = planResult.rows;
      } finally {
        client.release();
      }
    } else {
      stats = await this.db.get(`
        SELECT 
          COUNT(*) as total_users,
          SUM(requests_used) as total_requests,
          SUM(monthly_cost) as total_revenue
        FROM users WHERE status = 'active'
      `);

      planBreakdown = await this.db.all(`
        SELECT plan_type, COUNT(*) as user_count, SUM(monthly_cost) as revenue
        FROM users 
        WHERE status = 'active'
        GROUP BY plan_type
      `);
    }

    const result = { 
      ...stats, 
      planBreakdown: planBreakdown || [],
      total_users: parseInt(stats?.total_users) || 0,
      total_requests: parseInt(stats?.total_requests) || 0,
      total_revenue: parseFloat(stats?.total_revenue) || 0
    };

    // Ensure planBreakdown has proper data types
    if (result.planBreakdown) {
      result.planBreakdown = result.planBreakdown.map(plan => ({
        ...plan,
        user_count: parseInt(plan.user_count) || 0,
        revenue: parseFloat(plan.revenue) || 0
      }));
    }

    // Cache the results
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.cacheExpiry.stats, JSON.stringify(result));
      } catch (error) {
        console.warn('Redis cache set error:', error.message);
      }
    }

    return result;
  }

  async resetMonthlyUsage() {
    if (this.config.type === 'postgresql') {
      const client = await this.db.connect();
      try {
        await client.query('UPDATE users SET requests_used = 0');
      } finally {
        client.release();
      }
    } else {
      await this.db.run('UPDATE users SET requests_used = 0');
    }

    // Clear relevant caches
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.warn('Redis cache clear error:', error.message);
      }
    }

    console.log('Monthly usage reset for all users');
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
    
    if (this.config.type === 'postgresql' && this.db) {
      await this.db.end();
    } else if (this.db) {
      await this.db.close();
    }
    
    console.log('Database connections closed');
  }
}

export default DatabaseManager;