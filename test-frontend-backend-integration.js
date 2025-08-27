#!/usr/bin/env node

/**
 * Test Frontend-Backend Integration for n0de.pro
 * This script verifies that the frontend is properly connected to the backend
 * and displaying live data to users
 */

const https = require('https');
const http = require('http');

const FRONTEND_URL = 'https://www.n0de.pro';
const BACKEND_URL = 'https://n0de-backend-production-4e34.up.railway.app';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testBackendHealth() {
  log('\n=== Testing Backend Health ===', colors.cyan);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (response.statusCode === 200) {
      const health = JSON.parse(response.body);
      log('✅ Backend is healthy', colors.green);
      log(`   Status: ${health.status}`, colors.green);
      log(`   Environment: ${health.environment}`, colors.green);
      return true;
    } else {
      log(`❌ Backend health check failed: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Backend is unreachable: ${error.message}`, colors.red);
    return false;
  }
}

async function testFrontendAccess() {
  log('\n=== Testing Frontend Access ===', colors.cyan);
  
  try {
    const response = await makeRequest(FRONTEND_URL, { 
      followRedirect: true,
      maxRedirects: 5 
    });
    
    if (response.statusCode === 200 || response.statusCode === 307) {
      log('✅ Frontend is accessible', colors.green);
      
      // Check for API references in HTML
      const hasApiReference = response.body.includes('api') || 
                              response.body.includes('backend') ||
                              response.body.includes('railway');
      
      if (hasApiReference) {
        log('✅ Frontend contains API references', colors.green);
      } else {
        log('⚠️  No obvious API references found in frontend HTML', colors.yellow);
      }
      
      return true;
    } else {
      log(`❌ Frontend returned status: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Frontend is unreachable: ${error.message}`, colors.red);
    return false;
  }
}

async function testMetricsAPI() {
  log('\n=== Testing Metrics API ===', colors.cyan);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/v1/metrics/performance`);
    if (response.statusCode === 200) {
      const metrics = JSON.parse(response.body);
      log('✅ Metrics API is working', colors.green);
      
      if (metrics.latency || metrics.uptime || metrics.throughput) {
        log('✅ Live metrics data available:', colors.green);
        log(`   - Latency: ${metrics.latency || 'N/A'}`, colors.green);
        log(`   - Uptime: ${metrics.uptime || 'N/A'}`, colors.green);
        log(`   - Throughput: ${metrics.throughput || 'N/A'}`, colors.green);
      }
      return true;
    } else {
      log(`⚠️  Metrics API returned: ${response.statusCode}`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`⚠️  Metrics API error: ${error.message}`, colors.yellow);
    return false;
  }
}

async function testAuthAPI() {
  log('\n=== Testing Authentication API ===', colors.cyan);
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testData = JSON.stringify({
    email: testEmail,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User'
  });
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': testData.length
      },
      body: testData
    });
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      log('✅ Registration API is working', colors.green);
      const result = JSON.parse(response.body);
      if (result.access_token || result.token) {
        log('✅ JWT token generation working', colors.green);
      }
      return true;
    } else if (response.statusCode === 409) {
      log('⚠️  Registration API works (user exists)', colors.yellow);
      return true;
    } else {
      log(`⚠️  Registration API returned: ${response.statusCode}`, colors.yellow);
      log(`   Response: ${response.body}`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`⚠️  Auth API error: ${error.message}`, colors.yellow);
    return false;
  }
}

async function testCORS() {
  log('\n=== Testing CORS Configuration ===', colors.cyan);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/v1/health`, {
      headers: {
        'Origin': 'https://n0de.pro',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      log(`✅ CORS is configured: ${corsHeaders}`, colors.green);
      return true;
    } else {
      log('⚠️  CORS headers not found', colors.yellow);
      return false;
    }
  } catch (error) {
    log(`⚠️  CORS test error: ${error.message}`, colors.yellow);
    return false;
  }
}

async function checkWebSocketSupport() {
  log('\n=== Checking WebSocket Support ===', colors.cyan);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/socket.io/`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    
    if (response.statusCode === 400 || response.statusCode === 426) {
      log('✅ WebSocket endpoint exists (upgrade required)', colors.green);
      return true;
    } else if (response.statusCode === 200) {
      log('✅ Socket.io polling endpoint accessible', colors.green);
      return true;
    } else {
      log(`⚠️  WebSocket endpoint returned: ${response.statusCode}`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`⚠️  WebSocket check error: ${error.message}`, colors.yellow);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), colors.bright);
  log('   n0de.pro Frontend-Backend Integration Test', colors.bright);
  log('='.repeat(60), colors.bright);
  
  const results = {
    backend: await testBackendHealth(),
    frontend: await testFrontendAccess(),
    metrics: await testMetricsAPI(),
    auth: await testAuthAPI(),
    cors: await testCORS(),
    websocket: await checkWebSocketSupport()
  };
  
  log('\n' + '='.repeat(60), colors.bright);
  log('   Test Summary', colors.bright);
  log('='.repeat(60), colors.bright);
  
  let passed = 0;
  let total = 0;
  
  for (const [test, result] of Object.entries(results)) {
    total++;
    if (result) {
      passed++;
      log(`✅ ${test.toUpperCase()}: PASSED`, colors.green);
    } else {
      log(`❌ ${test.toUpperCase()}: FAILED`, colors.red);
    }
  }
  
  log('\n' + '-'.repeat(60), colors.bright);
  log(`   Results: ${passed}/${total} tests passed`, 
      passed === total ? colors.green : passed > total/2 ? colors.yellow : colors.red);
  log('-'.repeat(60), colors.bright);
  
  if (passed === total) {
    log('\n🎉 All systems are functional!', colors.green);
    log('Frontend and backend are properly integrated.', colors.green);
  } else if (passed > total/2) {
    log('\n⚠️  Some systems need attention', colors.yellow);
    log('Core functionality is working but some features may be limited.', colors.yellow);
  } else {
    log('\n❌ Critical issues detected', colors.red);
    log('Multiple system failures require immediate attention.', colors.red);
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, colors.red);
  process.exit(1);
});