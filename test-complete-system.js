#!/usr/bin/env node

/**
 * Complete system testing for n0de Platform
 * Tests local services, Vercel frontend, and Railway deployment
 */

import axios from 'axios';
import chalk from 'chalk';

const TESTS = {
  LOCAL_ADMIN: 'http://localhost:3002',
  LOCAL_USER: 'http://localhost:3004', 
  LOCAL_PAYMENT: 'http://localhost:3005',
  RAILWAY_BACKEND: 'https://n0de-backend-production-4e34.up.railway.app',
  VERCEL_FRONTEND: 'https://n0de-website-umber.vercel.app'
};

async function testEndpoint(name, url, endpoint = '', expectedStatus = 200) {
  try {
    const response = await axios.get(`${url}${endpoint}`, { timeout: 5000 });
    if (response.status === expectedStatus) {
      console.log(chalk.green(`✅ ${name}: ${response.status} - OK`));
      return { success: true, data: response.data, status: response.status };
    } else {
      console.log(chalk.yellow(`⚠️ ${name}: ${response.status} - Unexpected status`));
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(chalk.red(`❌ ${name}: ${error.response?.status || 'FAILED'} - ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function testAPI(name, url, endpoint, headers = {}) {
  try {
    const response = await axios.get(`${url}${endpoint}`, { 
      headers, 
      timeout: 5000,
      validateStatus: () => true 
    });
    console.log(chalk.blue(`📡 ${name}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`));
    return { success: response.status < 500, data: response.data, status: response.status };
  } catch (error) {
    console.log(chalk.red(`❌ ${name}: FAILED - ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function runCompleteSystemTest() {
  console.log(chalk.blue.bold('🧪 n0de Platform - Complete System Test\\n'));
  
  const results = {
    local: {},
    production: {},
    apis: {}
  };
  
  // Test Local Services
  console.log(chalk.yellow.bold('1️⃣ Testing Local Services...'));
  results.local.admin = await testEndpoint('Admin Dashboard', TESTS.LOCAL_ADMIN, '/api/stats');
  results.local.user = await testEndpoint('User API Health', TESTS.LOCAL_USER, '/health');  
  results.local.payment = await testEndpoint('Payment Service', TESTS.LOCAL_PAYMENT, '/health');
  
  // Test API Functionality
  console.log(chalk.yellow.bold('\\n2️⃣ Testing API Endpoints...'));
  results.apis.adminStats = await testAPI('Admin Stats', TESTS.LOCAL_ADMIN, '/api/stats');
  results.apis.adminUsers = await testAPI('Admin Users', TESTS.LOCAL_ADMIN, '/api/users');
  results.apis.userProfile = await testAPI('User Profile', TESTS.LOCAL_USER, '/api/user/profile', {
    'x-api-key': 'sk_live_demo_pro_key_12345'
  });
  results.apis.paymentHealth = await testAPI('Payment Health', TESTS.LOCAL_PAYMENT, '/health');
  
  // Test Production Services
  console.log(chalk.yellow.bold('\\n3️⃣ Testing Production Services...'));
  results.production.railway = await testEndpoint('Railway Backend', TESTS.RAILWAY_BACKEND, '/health');
  results.production.frontend = await testEndpoint('Vercel Frontend', TESTS.VERCEL_FRONTEND, '');
  
  // Calculate Results
  const totalTests = Object.values(results).reduce((sum, category) => 
    sum + Object.keys(category).length, 0
  );
  
  const passedTests = Object.values(results).reduce((sum, category) =>
    sum + Object.values(category).filter(result => result.success).length, 0
  );
  
  // Summary Report
  console.log(chalk.blue.bold('\\n📊 Test Results Summary:'));
  console.log('================================================');
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const statusColor = percentage >= 80 ? chalk.green : percentage >= 60 ? chalk.yellow : chalk.red;
  
  console.log(statusColor(`📈 Overall Score: ${passedTests}/${totalTests} tests passed (${percentage}%)`));
  
  if (results.local.admin?.success && results.local.admin?.data) {
    console.log(chalk.cyan(`👥 Users: ${results.local.admin.data.total_users || 'N/A'}`));
    console.log(chalk.cyan(`💰 Revenue: €${results.local.admin.data.total_revenue || 'N/A'}`));
    console.log(chalk.cyan(`📊 Requests: ${results.local.admin.data.total_requests?.toLocaleString() || 'N/A'}`));
  }
  
  console.log(chalk.blue('\\n🌐 Service URLs:'));
  console.log(`   Local Admin: ${TESTS.LOCAL_ADMIN}`);
  console.log(`   Local User API: ${TESTS.LOCAL_USER}`);
  console.log(`   Local Payments: ${TESTS.LOCAL_PAYMENT}`);
  console.log(`   Railway Backend: ${TESTS.RAILWAY_BACKEND}`);
  console.log(`   Vercel Frontend: ${TESTS.VERCEL_FRONTEND}`);
  console.log(`   GitHub Repo: https://github.com/Jpatching/n0de-platform`);
  
  const allServicesHealthy = results.local.admin?.success && 
                            results.local.user?.success && 
                            results.local.payment?.success;
  
  if (allServicesHealthy) {
    console.log(chalk.green.bold('\\n🎉 All local services are healthy and ready for browser testing!'));
  } else {
    console.log(chalk.red.bold('\\n⚠️ Some local services need attention before proceeding.'));
  }
  
  return results;
}

// Run the test
runCompleteSystemTest().catch(console.error);