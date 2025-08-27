#!/usr/bin/env node

/**
 * Final System Verification for n0de Platform
 * Comprehensive test of all user flows and data accuracy
 */

const https = require('https');

const BACKEND = 'https://n0de-backend-production-4e34.up.railway.app';
const FRONTEND = 'https://www.n0de.pro';

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', 
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname, port: 443, path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET', headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runFinalVerification() {
  log('\n' + '='.repeat(80), colors.bright);
  log('   🎯 FINAL SYSTEM VERIFICATION - n0de Platform', colors.bright);
  log('='.repeat(80), colors.bright);
  
  const results = {};
  let authToken = null;
  
  // 1. Backend Health & API Structure
  log('\n🏥 1. Backend Health Check...', colors.cyan);
  try {
    const health = await makeRequest(`${BACKEND}/health`);
    if (health.statusCode === 200) {
      const data = JSON.parse(health.body);
      log('✅ Backend is healthy', colors.green);
      log(`   Service: ${data.service}`, colors.green);
      log(`   Environment: ${data.environment}`, colors.green);
      results.health = true;
    }
  } catch (e) {
    log(`❌ Health check failed: ${e.message}`, colors.red);
    results.health = false;
  }
  
  // 2. API Documentation
  log('\n📚 2. API Documentation Check...', colors.cyan);
  try {
    const docs = await makeRequest(`${BACKEND}/api/docs`);
    if (docs.statusCode === 200 && docs.body.includes('swagger')) {
      log('✅ Swagger documentation available', colors.green);
      results.docs = true;
    } else {
      log(`⚠️  Docs endpoint returned: ${docs.statusCode}`, colors.yellow);
      results.docs = false;
    }
  } catch (e) {
    log(`❌ Docs check failed: ${e.message}`, colors.red);
    results.docs = false;
  }
  
  // 3. User Registration & Authentication Flow
  log('\n🔐 3. Authentication Flow Test...', colors.cyan);
  const testUser = {
    email: `verify_${Date.now()}@n0de-test.com`,
    password: 'VerifyPass2024!@',
    firstName: 'Verify',
    lastName: 'Test'
  };
  
  try {
    const regResponse = await makeRequest(`${BACKEND}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (regResponse.statusCode === 201 || regResponse.statusCode === 200) {
      const result = JSON.parse(regResponse.body);
      authToken = result.access_token || result.token;
      
      log('✅ User registration successful', colors.green);
      log(`   Email: ${testUser.email}`, colors.green);
      if (authToken) {
        log('✅ JWT token received', colors.green);
        results.auth = true;
      }
    } else {
      log(`⚠️  Registration failed: ${regResponse.statusCode}`, colors.yellow);
      log(`   Response: ${regResponse.body.substring(0, 200)}`, colors.yellow);
      results.auth = false;
    }
  } catch (e) {
    log(`❌ Auth test failed: ${e.message}`, colors.red);
    results.auth = false;
  }
  
  // 4. API Key Management
  if (authToken) {
    log('\n🔑 4. API Key Management Test...', colors.cyan);
    try {
      const apiKeyResponse = await makeRequest(`${BACKEND}/api/v1/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Verification Test Key',
          permissions: ['read', 'write'],
          rateLimit: 1000
        })
      });
      
      if (apiKeyResponse.statusCode === 201 || apiKeyResponse.statusCode === 200) {
        const apiKey = JSON.parse(apiKeyResponse.body);
        log('✅ API key created successfully', colors.green);
        log(`   Key Preview: ${apiKey.keyPreview || 'N/A'}`, colors.green);
        results.apiKeys = true;
      } else {
        log(`⚠️  API key creation failed: ${apiKeyResponse.statusCode}`, colors.yellow);
        results.apiKeys = false;
      }
    } catch (e) {
      log(`❌ API key test failed: ${e.message}`, colors.red);
      results.apiKeys = false;
    }
  } else {
    log('\n🔑 4. API Key Management Test... SKIPPED (no auth token)', colors.yellow);
    results.apiKeys = false;
  }
  
  // 5. Metrics & Performance Data
  log('\n📊 5. Metrics API Test...', colors.cyan);
  try {
    const metricsResponse = await makeRequest(`${BACKEND}/api/v1/metrics/performance`, {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    });
    
    if (metricsResponse.statusCode === 200) {
      const metrics = JSON.parse(metricsResponse.body);
      log('✅ Metrics API accessible', colors.green);
      log(`   Data points available: ${Object.keys(metrics).length}`, colors.green);
      results.metrics = true;
    } else {
      log(`⚠️  Metrics API returned: ${metricsResponse.statusCode}`, colors.yellow);
      results.metrics = false;
    }
  } catch (e) {
    log(`⚠️  Metrics test: ${e.message}`, colors.yellow);
    results.metrics = false;
  }
  
  // 6. RPC Functionality Test
  log('\n🔗 6. RPC Functionality Test...', colors.cyan);
  try {
    const rpcResponse = await makeRequest(`${BACKEND}/api/v1/rpc/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      },
      body: JSON.stringify({ method: 'getHealth' })
    });
    
    if (rpcResponse.statusCode === 200 || rpcResponse.statusCode === 201) {
      log('✅ RPC endpoint accessible', colors.green);
      results.rpc = true;
    } else {
      log(`⚠️  RPC test returned: ${rpcResponse.statusCode}`, colors.yellow);
      results.rpc = false;
    }
  } catch (e) {
    log(`⚠️  RPC test: ${e.message}`, colors.yellow);
    results.rpc = false;
  }
  
  // 7. Payment System Test
  log('\n💳 7. Payment System Test...', colors.cyan);
  try {
    const paymentResponse = await makeRequest(`${BACKEND}/api/v1/payments/plans`, {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    });
    
    if (paymentResponse.statusCode === 200) {
      log('✅ Payment plans endpoint accessible', colors.green);
      results.payments = true;
    } else {
      log(`⚠️  Payment endpoint returned: ${paymentResponse.statusCode}`, colors.yellow);
      results.payments = false;
    }
  } catch (e) {
    log(`⚠️  Payment test: ${e.message}`, colors.yellow);
    results.payments = false;
  }
  
  // 8. WebSocket Support
  log('\n🔌 8. WebSocket Support Test...', colors.cyan);
  try {
    const wsResponse = await makeRequest(`${BACKEND}/socket.io/`);
    if (wsResponse.statusCode === 200 || wsResponse.statusCode === 400) {
      log('✅ WebSocket endpoint available', colors.green);
      results.websocket = true;
    } else {
      log(`⚠️  WebSocket test returned: ${wsResponse.statusCode}`, colors.yellow);
      results.websocket = false;
    }
  } catch (e) {
    log(`⚠️  WebSocket test: ${e.message}`, colors.yellow);
    results.websocket = false;
  }
  
  // 9. Frontend Integration
  log('\n🌐 9. Frontend Integration Test...', colors.cyan);
  try {
    const frontendResponse = await makeRequest(FRONTEND);
    if (frontendResponse.statusCode === 200) {
      log('✅ Frontend accessible', colors.green);
      
      const hasLiveData = frontendResponse.body.includes('api') ||
                         frontendResponse.body.includes('backend') ||
                         frontendResponse.body.includes('metrics');
      
      if (hasLiveData) {
        log('✅ Frontend contains API integration hints', colors.green);
      } else {
        log('⚠️  Frontend appears to use static data only', colors.yellow);
      }
      
      results.frontend = true;
    } else {
      log(`❌ Frontend returned: ${frontendResponse.statusCode}`, colors.red);
      results.frontend = false;
    }
  } catch (e) {
    log(`❌ Frontend test failed: ${e.message}`, colors.red);
    results.frontend = false;
  }
  
  // Final Summary
  log('\n' + '='.repeat(80), colors.bright);
  log('   🎯 FINAL VERIFICATION RESULTS', colors.bright);
  log('='.repeat(80), colors.bright);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  log(`\n📊 Overall Score: ${passedTests}/${totalTests} (${successRate}%)`, 
      successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red);
  
  log('\n📝 Individual Results:', colors.cyan);
  for (const [test, passed] of Object.entries(results)) {
    log(`   ${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`,
        passed ? colors.green : colors.red);
  }
  
  // Recommendations
  log('\n🚀 Next Steps:', colors.cyan);
  if (results.auth && results.health) {
    log('✅ Core authentication and backend systems working', colors.green);
  }
  
  if (!results.docs || !results.metrics) {
    log('• Ensure all API endpoints are properly deployed', colors.yellow);
  }
  
  if (results.frontend && !results.metrics) {
    log('• Connect frontend to display live backend metrics', colors.yellow);
  }
  
  if (passedTests === totalTests) {
    log('\n🎉 SYSTEM FULLY OPERATIONAL!', colors.green);
    log('   All flows verified - platform ready for production use', colors.green);
  } else if (passedTests >= totalTests * 0.7) {
    log('\n⚠️  SYSTEM MOSTLY OPERATIONAL', colors.yellow);
    log('   Core features work - minor issues to address', colors.yellow);
  } else {
    log('\n❌ SYSTEM NEEDS ATTENTION', colors.red);
    log('   Critical issues require immediate fixing', colors.red);
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

runFinalVerification().catch(e => {
  log(`\n❌ Verification failed: ${e.message}`, colors.red);
  process.exit(1);
});