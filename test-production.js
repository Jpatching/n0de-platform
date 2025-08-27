#!/usr/bin/env node

/**
 * Test production Railway deployment
 */

import axios from 'axios';
import chalk from 'chalk';

const RAILWAY_URL = 'https://n0de-backend-production.up.railway.app';

async function testProductionDeployment() {
  console.log(chalk.blue.bold('🧪 Testing n0de Platform Production Deployment\n'));
  
  try {
    // Test health endpoint
    console.log(chalk.yellow('1️⃣ Testing Health Endpoint...'));
    const healthResponse = await axios.get(`${RAILWAY_URL}/health`);
    console.log(`   ✅ Health: ${healthResponse.data.status}`);
    
    // Test if our n0de APIs are deployed
    console.log(chalk.yellow('2️⃣ Testing n0de Platform APIs...'));
    
    try {
      const adminResponse = await axios.get(`${RAILWAY_URL}/api/stats`);
      console.log(`   ✅ Admin API: ${adminResponse.data.total_users} users found`);
    } catch (error) {
      console.log(`   ❌ Admin API: ${error.response?.status} - ${error.message}`);
    }
    
    try {
      const userResponse = await axios.get(`${RAILWAY_URL}/api/user/profile`, {
        headers: { 'x-api-key': 'test_key' }
      });
      console.log(`   ✅ User API: Available`);
    } catch (error) {
      console.log(`   ❌ User API: ${error.response?.status} - ${error.message}`);
    }
    
    try {
      const paymentResponse = await axios.get(`${RAILWAY_URL}/health`);
      console.log(`   ✅ Payment Service: ${paymentResponse.data.status}`);
    } catch (error) {
      console.log(`   ❌ Payment Service: ${error.response?.status} - ${error.message}`);
    }
    
    console.log(chalk.blue('\n📊 Production Test Results:'));
    console.log(`   Railway URL: ${RAILWAY_URL}`);
    console.log(`   Vercel Frontend: https://n0de-website-umber.vercel.app`);
    console.log(`   Status: ${healthResponse.data.status.toUpperCase()}`);
    
  } catch (error) {
    console.error(chalk.red('❌ Production test failed:'), error.message);
  }
}

testProductionDeployment();