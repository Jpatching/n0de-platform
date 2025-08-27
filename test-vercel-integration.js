#!/usr/bin/env node

/**
 * Test Vercel-Railway integration for n0de Platform
 * Validates frontend can connect to backend APIs
 */

import axios from 'axios';
import chalk from 'chalk';

const ENDPOINTS = {
  VERCEL_FRONTEND: 'https://n0de-website-umber.vercel.app',
  RAILWAY_BACKEND_OLD: 'https://n0de-backend-production.up.railway.app', 
  RAILWAY_BACKEND_NEW: 'https://n0de-backend-production-4e34.up.railway.app',
  LOCAL_ADMIN: 'http://localhost:3002',
  LOCAL_USER: 'http://localhost:3004',
  LOCAL_PAYMENT: 'http://localhost:3005'
};

async function testCORS(frontendUrl, backendUrl, endpoint = '') {
  try {
    // Simulate CORS request from frontend to backend
    const response = await axios.get(`${backendUrl}${endpoint}`, {
      headers: {
        'Origin': frontendUrl,
        'User-Agent': 'n0de-integration-test'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    const isCorsAllowed = corsHeaders === '*' || corsHeaders === frontendUrl;
    
    return {
      success: response.status < 500,
      status: response.status,
      cors: isCorsAllowed,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      cors: false
    };
  }
}

async function testVercelIntegration() {
  console.log(chalk.blue.bold('🔗 n0de Platform - Vercel Integration Test\\n'));
  
  // Test 1: Vercel Frontend Health
  console.log(chalk.yellow('1️⃣ Testing Vercel Frontend...'));
  const frontendTest = await testCORS('', ENDPOINTS.VERCEL_FRONTEND);
  if (frontendTest.success) {
    console.log(chalk.green(`✅ Vercel Frontend: ${frontendTest.status} - Accessible`));
  } else {
    console.log(chalk.red(`❌ Vercel Frontend: ${frontendTest.error}`));
  }
  
  // Test 2: Railway Backend APIs
  console.log(chalk.yellow('\\n2️⃣ Testing Railway Backend APIs...'));
  
  const railwayOldTest = await testCORS(ENDPOINTS.VERCEL_FRONTEND, ENDPOINTS.RAILWAY_BACKEND_OLD, '/health');
  console.log(`Railway (Old): ${railwayOldTest.success ? chalk.green('✅') : chalk.red('❌')} ${railwayOldTest.status || 'FAILED'}`);
  
  const railwayNewTest = await testCORS(ENDPOINTS.VERCEL_FRONTEND, ENDPOINTS.RAILWAY_BACKEND_NEW, '/health');
  console.log(`Railway (New): ${railwayNewTest.success ? chalk.green('✅') : chalk.red('❌')} ${railwayNewTest.status || 'FAILED'}`);
  
  // Test 3: Local APIs (for reference)
  console.log(chalk.yellow('\\n3️⃣ Testing Local APIs (Reference)...'));
  
  const localTests = await Promise.all([
    testCORS(ENDPOINTS.VERCEL_FRONTEND, ENDPOINTS.LOCAL_ADMIN, '/api/stats'),
    testCORS(ENDPOINTS.VERCEL_FRONTEND, ENDPOINTS.LOCAL_USER, '/health'),
    testCORS(ENDPOINTS.VERCEL_FRONTEND, ENDPOINTS.LOCAL_PAYMENT, '/health')
  ]);
  
  console.log(`Local Admin: ${localTests[0].success ? chalk.green('✅') : chalk.red('❌')} ${localTests[0].status || 'FAILED'} ${localTests[0].cors ? '(CORS OK)' : '(CORS Issue)'}`);
  console.log(`Local User API: ${localTests[1].success ? chalk.green('✅') : chalk.red('❌')} ${localTests[1].status || 'FAILED'} ${localTests[1].cors ? '(CORS OK)' : '(CORS Issue)'}`);
  console.log(`Local Payment: ${localTests[2].success ? chalk.green('✅') : chalk.red('❌')} ${localTests[2].status || 'FAILED'} ${localTests[2].cors ? '(CORS OK)' : '(CORS Issue)'}`);
  
  // Test 4: API Data Integration
  if (localTests[0].success && localTests[0].data) {
    console.log(chalk.yellow('\\n4️⃣ Testing API Data Integration...'));
    const stats = localTests[0].data;
    console.log(chalk.cyan(`📊 Available Data for Frontend:`));
    console.log(chalk.cyan(`   Users: ${stats.total_users || 'N/A'}`));
    console.log(chalk.cyan(`   Revenue: €${stats.total_revenue || 'N/A'}`));
    console.log(chalk.cyan(`   Requests: ${stats.total_requests?.toLocaleString() || 'N/A'}`));
    
    if (stats.planBreakdown) {
      console.log(chalk.cyan(`   Plans: ${stats.planBreakdown.map(p => `${p.plan_type}(${p.user_count})`).join(', ')}`));
    }
  }
  
  // Integration Summary
  console.log(chalk.blue.bold('\\n📋 Integration Analysis:'));
  console.log('================================================');
  
  const localWorking = localTests.every(test => test.success);
  const railwayWorking = railwayNewTest.success || railwayOldTest.success;
  
  if (localWorking && !railwayWorking) {
    console.log(chalk.yellow('⚠️ Local APIs working, Railway needs deployment'));
    console.log(chalk.cyan('📝 Next Steps:'));
    console.log('   1. Connect Railway to GitHub in dashboard');
    console.log('   2. Deploy n0de-platform repository to Railway'); 
    console.log('   3. Update Vercel environment variables with Railway URLs');
    console.log('   4. Test integration after Railway deployment');
  } else if (railwayWorking) {
    console.log(chalk.green('✅ Railway backend is accessible'));
    console.log(chalk.cyan('📝 Next Steps:'));
    console.log('   1. Update Vercel frontend to use Railway APIs');
    console.log('   2. Configure environment variables in Vercel');
    console.log('   3. Test complete user flow');
  } else {
    console.log(chalk.red('❌ Both local and Railway need attention'));
  }
  
  console.log(chalk.blue('\\n🔗 Railway-Vercel Integration Settings:'));
  console.log(`   Select Project: Jpatching/n0de`);
  console.log(`   Production Environment: n0de-platform-clean`);
  console.log(`   Preview Environment: No environment (or same as production)`);
  
  console.log(chalk.blue('\\n🌐 Current URLs:'));
  console.log(`   Vercel Frontend: ${ENDPOINTS.VERCEL_FRONTEND}`);
  console.log(`   Railway Backend: ${ENDPOINTS.RAILWAY_BACKEND_NEW}`);
  console.log(`   GitHub Backend: https://github.com/Jpatching/n0de-platform`);
  
  return {
    frontend: frontendTest.success,
    railway: railwayWorking,
    local: localWorking,
    integration_ready: localWorking
  };
}

// Run integration test
testVercelIntegration().catch(console.error);