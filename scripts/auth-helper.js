#!/usr/bin/env node

/**
 * Authentication Helper for N0DE Payment Testing
 * Helps get JWT tokens and manage user authentication for testing
 */

const axios = require('axios');
const colors = require('colors/safe');
const { Client } = require('pg');

const API_URL = 'http://localhost:4000';
const DB_CONFIG = {
  connectionString: 'postgresql://postgres:postgres@localhost:5432/n0de_production'
};

class AuthHelper {
  constructor() {
    this.token = null;
    this.user = null;
  }

  async createTestUser() {
    console.log(colors.cyan('Creating test user...'));
    
    const testUser = {
      email: 'test@n0de.pro',
      password: 'TestPassword123!',
      name: 'Test User'
    };

    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/register`, testUser);
      console.log(colors.green('✅ Test user created successfully'));
      return testUser;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(colors.yellow('⚠️  Test user already exists'));
        return testUser;
      } else {
        console.error(colors.red('❌ Failed to create test user:'), error.message);
        throw error;
      }
    }
  }

  async login(email = 'test@n0de.pro', password = 'TestPassword123!') {
    console.log(colors.cyan(`Logging in as ${email}...`));
    
    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email,
        password
      });

      this.token = response.data.access_token;
      this.user = response.data.user;
      
      console.log(colors.green('✅ Login successful'));
      console.log(colors.gray(`User ID: ${this.user.id}`));
      console.log(colors.gray(`JWT Token: ${this.token.substring(0, 50)}...`));
      
      return {
        token: this.token,
        user: this.user
      };
    } catch (error) {
      console.error(colors.red('❌ Login failed:'), error.response?.data?.message || error.message);
      throw error;
    }
  }

  async getExistingUser() {
    console.log(colors.cyan('Checking for existing users...'));
    
    const client = new Client(DB_CONFIG);
    try {
      await client.connect();
      
      const result = await client.query(`
        SELECT id, email, name, "createdAt" 
        FROM users 
        ORDER BY "createdAt" DESC 
        LIMIT 5
      `);
      
      if (result.rows.length > 0) {
        console.log(colors.green(`Found ${result.rows.length} existing users:`));
        result.rows.forEach((user, index) => {
          console.log(colors.gray(`  ${index + 1}. ${user.email} (${user.id})`));
        });
        return result.rows;
      } else {
        console.log(colors.yellow('No existing users found'));
        return [];
      }
    } catch (error) {
      console.error(colors.red('❌ Database query failed:'), error.message);
      return [];
    } finally {
      await client.end();
    }
  }

  async testAPIWithAuth() {
    if (!this.token) {
      throw new Error('No authentication token. Call login() first.');
    }

    console.log(colors.cyan('Testing authenticated API access...'));

    try {
      // Test protected endpoint
      const response = await axios.get(`${API_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      console.log(colors.green('✅ Authenticated API access working'));
      console.log(colors.gray('User data:'), response.data);
      return response.data;
    } catch (error) {
      console.error(colors.red('❌ API authentication test failed:'), error.response?.data || error.message);
      throw error;
    }
  }

  getAuthHeaders() {
    if (!this.token) {
      throw new Error('No authentication token available. Call login() first.');
    }
    
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  exportToken() {
    if (this.token) {
      console.log(colors.cyan('Export this token to use in other scripts:'));
      console.log(colors.yellow(`export JWT_TOKEN="${this.token}"`));
      console.log(colors.cyan('Or use in curl:'));
      console.log(colors.yellow(`curl -H "Authorization: Bearer ${this.token}" ${API_URL}/api/v1/users/me`));
    }
  }
}

async function main() {
  const helper = new AuthHelper();

  console.log(colors.cyan('\n========================================'));
  console.log(colors.cyan('   N0DE Authentication Helper'));
  console.log(colors.cyan('========================================\n'));

  try {
    // Check existing users
    const existingUsers = await helper.getExistingUser();
    
    // Create test user if none exist
    if (existingUsers.length === 0) {
      await helper.createTestUser();
    }

    // Try to login
    const loginResult = await helper.login();
    
    // Test authenticated API
    await helper.testAPIWithAuth();
    
    // Export token for other scripts
    helper.exportToken();
    
    console.log(colors.green('\n✅ Authentication setup complete!'));
    console.log(colors.cyan('You can now run payment tests with authentication.'));
    
  } catch (error) {
    console.error(colors.red('\n❌ Authentication setup failed:'), error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = AuthHelper;

// Run if called directly
if (require.main === module) {
  main();
}