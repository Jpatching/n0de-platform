import Redis from 'ioredis';
import crypto from 'crypto';
import chalk from 'chalk';

class RedisUserManager {
  constructor() {
    this.redis = new Redis({
      port: 6379,
      host: '127.0.0.1',
      family: 4,
      db: 0,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    // Payment plans configuration
    this.plans = {
      free: { requests_per_month: 100000, rate_limit: 10, cost: 0 },
      starter: { requests_per_month: 1000000, rate_limit: 50, cost: 29 },
      pro: { requests_per_month: 10000000, rate_limit: 200, cost: 99 },
      enterprise: { requests_per_month: 100000000, rate_limit: 1000, cost: 299 },
      unlimited: { requests_per_month: -1, rate_limit: 10000, cost: 0 }
    };
  }

  generateApiKey() {
    return 'n0de_' + crypto.randomBytes(32).toString('hex');
  }

  async createUser(email, name, plan = 'free', notes = '') {
    const apiKey = this.generateApiKey();
    const planDetails = this.plans[plan];
    
    if (!planDetails) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    const userData = {
      email,
      name,
      plan,
      api_key: apiKey,
      rate_limit: planDetails.rate_limit,
      requests_per_month: planDetails.requests_per_month,
      requests_used: 0,
      monthly_cost: planDetails.cost,
      created_at: new Date().toISOString(),
      last_used: null,
      status: 'active',
      notes
    };

    // Store user data
    await this.redis.hset(`user:${apiKey}`, userData);
    
    // Add to user index for listing
    await this.redis.sadd('users:all', apiKey);
    await this.redis.hset('users:by_email', email, apiKey);
    
    // Set up rate limiting bucket
    await this.redis.set(`rate:${apiKey}:limit`, planDetails.rate_limit);
    
    return {
      ...userData,
      apiKey
    };
  }

  async getUserByApiKey(apiKey) {
    const userData = await this.redis.hgetall(`user:${apiKey}`);
    if (!userData || !userData.email) return null;
    
    // Convert string numbers back to numbers
    userData.rate_limit = parseInt(userData.rate_limit);
    userData.requests_per_month = parseInt(userData.requests_per_month);
    userData.requests_used = parseInt(userData.requests_used);
    userData.monthly_cost = parseFloat(userData.monthly_cost);
    
    return userData;
  }

  async validateAndTrackRequest(apiKey, ipAddress = '') {
    const user = await this.getUserByApiKey(apiKey);
    if (!user) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (user.status !== 'active') {
      return { valid: false, error: 'Account suspended' };
    }

    // Check monthly limit
    if (user.requests_per_month > 0 && user.requests_used >= user.requests_per_month) {
      return { valid: false, error: 'Monthly quota exceeded' };
    }

    // Check rate limit (requests per second)
    const now = Date.now();
    const second = Math.floor(now / 1000);
    const rateKey = `rate:${apiKey}:${second}`;
    
    const current = await this.redis.incr(rateKey);
    await this.redis.expire(rateKey, 2);
    
    if (current > user.rate_limit) {
      return { valid: false, error: 'Rate limit exceeded', retry_after: 1 };
    }

    // Update usage
    await this.redis.hincrby(`user:${apiKey}`, 'requests_used', 1);
    await this.redis.hset(`user:${apiKey}`, 'last_used', new Date().toISOString());
    
    // Log request
    const logKey = `log:${apiKey}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.hincrby(logKey, ipAddress || 'unknown', 1);
    await this.redis.expire(logKey, 86400 * 7); // Keep logs for 7 days
    
    return {
      valid: true,
      user: {
        name: user.name,
        plan: user.plan,
        rate_limit: user.rate_limit,
        requests_remaining: user.requests_per_month > 0 
          ? user.requests_per_month - user.requests_used - 1 
          : -1
      }
    };
  }

  async listUsers() {
    const apiKeys = await this.redis.smembers('users:all');
    const users = [];
    
    for (const apiKey of apiKeys) {
      const user = await this.getUserByApiKey(apiKey);
      if (user) users.push(user);
    }
    
    return users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async updateUserPlan(apiKey, newPlan) {
    const planDetails = this.plans[newPlan];
    if (!planDetails) {
      throw new Error(`Invalid plan: ${newPlan}`);
    }

    const user = await this.getUserByApiKey(apiKey);
    if (!user) {
      throw new Error('User not found');
    }

    await this.redis.hmset(`user:${apiKey}`, {
      plan: newPlan,
      rate_limit: planDetails.rate_limit,
      requests_per_month: planDetails.requests_per_month,
      monthly_cost: planDetails.cost
    });

    await this.redis.set(`rate:${apiKey}:limit`, planDetails.rate_limit);
    
    return true;
  }

  async deleteUser(apiKey) {
    await this.redis.hset(`user:${apiKey}`, 'status', 'deleted');
    await this.redis.srem('users:all', apiKey);
    return true;
  }

  async resetMonthlyUsage() {
    const apiKeys = await this.redis.smembers('users:all');
    
    for (const apiKey of apiKeys) {
      await this.redis.hset(`user:${apiKey}`, 'requests_used', 0);
    }
    
    return apiKeys.length;
  }

  async getStats() {
    const apiKeys = await this.redis.smembers('users:all');
    let totalUsers = 0;
    let totalRequests = 0;
    let totalRevenue = 0;
    const planBreakdown = {};
    
    for (const apiKey of apiKeys) {
      const user = await this.getUserByApiKey(apiKey);
      if (user && user.status === 'active') {
        totalUsers++;
        totalRequests += user.requests_used;
        totalRevenue += user.monthly_cost;
        
        if (!planBreakdown[user.plan]) {
          planBreakdown[user.plan] = { count: 0, revenue: 0 };
        }
        planBreakdown[user.plan].count++;
        planBreakdown[user.plan].revenue += user.monthly_cost;
      }
    }
    
    return {
      total_users: totalUsers,
      total_requests: totalRequests,
      total_revenue: totalRevenue,
      plan_breakdown: planBreakdown,
      server_cost: 429,
      profit: totalRevenue - 429
    };
  }

  async close() {
    await this.redis.quit();
  }
}

export default RedisUserManager;