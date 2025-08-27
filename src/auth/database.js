import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

class UserDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await open({
      filename: './data/users.db',
      driver: sqlite3.Database
    });

    // Create users table
    await this.db.exec(`
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
    `);

    // Create usage tracking table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uuid TEXT NOT NULL,
        requests INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        method TEXT,
        FOREIGN KEY (user_uuid) REFERENCES users (uuid)
      )
    `);

    // Create payment tiers table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        monthly_requests INTEGER NOT NULL,
        rate_limit INTEGER NOT NULL,
        monthly_cost REAL NOT NULL,
        features TEXT
      )
    `);

    // Insert default payment tiers
    const tiers = [
      { name: 'free', monthly_requests: 100000, rate_limit: 10, monthly_cost: 0, features: 'Basic RPC Access' },
      { name: 'starter', monthly_requests: 1000000, rate_limit: 50, monthly_cost: 29, features: 'Priority RPC, Email Support' },
      { name: 'pro', monthly_requests: 10000000, rate_limit: 200, monthly_cost: 99, features: 'High Performance, Priority Support, Analytics' },
      { name: 'enterprise', monthly_requests: 100000000, rate_limit: 1000, monthly_cost: 299, features: 'Dedicated Resources, SLA, 24/7 Support' },
      { name: 'unlimited', monthly_requests: -1, rate_limit: 10000, monthly_cost: 0, features: 'Full Testing Access' }
    ];

    for (const tier of tiers) {
      await this.db.run(`
        INSERT OR IGNORE INTO payment_tiers (name, monthly_requests, rate_limit, monthly_cost, features)
        VALUES (?, ?, ?, ?, ?)
      `, [tier.name, tier.monthly_requests, tier.rate_limit, tier.monthly_cost, tier.features]);
    }

    console.log('Database initialized successfully');
  }

  generateApiKey() {
    return 'n0de_' + crypto.randomBytes(32).toString('hex');
  }

  async createUser(email, name, planType = 'free', notes = '') {
    const uuid = uuidv4();
    const apiKey = this.generateApiKey();
    
    // Get plan details
    const tier = await this.db.get(`
      SELECT * FROM payment_tiers WHERE name = ?
    `, [planType]);

    if (!tier) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    const result = await this.db.run(`
      INSERT INTO users (uuid, email, name, api_key, plan_type, rate_limit, monthly_requests, monthly_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, email, name, apiKey, planType, tier.rate_limit, tier.monthly_requests, tier.monthly_cost, notes]);

    return {
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
  }

  async getUserByApiKey(apiKey) {
    return await this.db.get(`
      SELECT * FROM users WHERE api_key = ? AND status = 'active'
    `, [apiKey]);
  }

  async updateUsage(apiKey, requests = 1, ipAddress = '', method = '') {
    const user = await this.getUserByApiKey(apiKey);
    if (!user) return false;

    // Update user's request count
    await this.db.run(`
      UPDATE users 
      SET requests_used = requests_used + ?, last_used = CURRENT_TIMESTAMP 
      WHERE api_key = ?
    `, [requests, apiKey]);

    // Log usage
    await this.db.run(`
      INSERT INTO usage_logs (user_uuid, requests, ip_address, method)
      VALUES (?, ?, ?, ?)
    `, [user.uuid, requests, ipAddress, method]);

    return true;
  }

  async checkRateLimit(apiKey) {
    const user = await this.getUserByApiKey(apiKey);
    if (!user) return { allowed: false, reason: 'Invalid API key' };

    // Check monthly limit (if not unlimited)
    if (user.monthly_requests > 0 && user.requests_used >= user.monthly_requests) {
      return { allowed: false, reason: 'Monthly quota exceeded', user };
    }

    return { allowed: true, user, rateLimit: user.rate_limit };
  }

  async listUsers() {
    return await this.db.all(`
      SELECT uuid, email, name, plan_type, rate_limit, monthly_requests, 
             requests_used, monthly_cost, status, created_at, last_used, notes
      FROM users 
      ORDER BY created_at DESC
    `);
  }

  async updateUserPlan(uuid, planType) {
    const tier = await this.db.get(`
      SELECT * FROM payment_tiers WHERE name = ?
    `, [planType]);

    if (!tier) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    await this.db.run(`
      UPDATE users 
      SET plan_type = ?, rate_limit = ?, monthly_requests = ?, monthly_cost = ?
      WHERE uuid = ?
    `, [planType, tier.rate_limit, tier.monthly_requests, tier.monthly_cost, uuid]);

    return true;
  }

  async deleteUser(uuid) {
    await this.db.run(`UPDATE users SET status = 'deleted' WHERE uuid = ?`, [uuid]);
    return true;
  }

  async resetMonthlyUsage() {
    await this.db.run(`UPDATE users SET requests_used = 0`);
    console.log('Monthly usage reset for all users');
  }

  async getUsageStats() {
    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total_users,
        SUM(requests_used) as total_requests,
        SUM(monthly_cost) as total_revenue
      FROM users WHERE status = 'active'
    `);

    const planBreakdown = await this.db.all(`
      SELECT plan_type, COUNT(*) as user_count, SUM(monthly_cost) as revenue
      FROM users 
      WHERE status = 'active'
      GROUP BY plan_type
    `);

    return { ...stats, planBreakdown };
  }
}

export default UserDatabase;