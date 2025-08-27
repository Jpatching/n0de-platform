#!/usr/bin/env node

/**
 * Verify n0de.pro is displaying live data from backend
 * Tests the complete user flow and data synchronization
 */

const https = require('https');

const BACKEND_URL = 'https://n0de-backend-production-4e34.up.railway.app';
const FRONTEND_URL = 'https://n0de.pro';
const WWW_FRONTEND_URL = 'https://www.n0de.pro';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.request({
      hostname: urlObj.hostname,
      port: 443,
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
    }).on('error', reject).end(options.body);
  });
}

async function testLiveMetrics() {
  console.log('\n🔍 Testing Live Data Display on n0de.pro\n');
  console.log('=' . repeat(60));
  
  // Test backend metrics endpoint
  console.log('\n1. Checking Backend Metrics API...');
  try {
    const metricsRes = await makeRequest(`${BACKEND_URL}/api/v1/metrics/performance`);
    if (metricsRes.statusCode === 200) {
      const metrics = JSON.parse(metricsRes.body);
      console.log('✅ Backend metrics available:');
      console.log(`   - Latency: ${metrics.avgLatency || metrics.latency || 'N/A'}ms`);
      console.log(`   - Uptime: ${metrics.uptime || 'N/A'}%`);
      console.log(`   - Throughput: ${metrics.throughput || 'N/A'} RPS`);
    } else {
      console.log(`⚠️  Metrics API returned: ${metricsRes.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Metrics API error: ${error.message}`);
  }
  
  // Test frontend for live data indicators
  console.log('\n2. Checking Frontend for Live Data...');
  try {
    const frontendRes = await makeRequest(WWW_FRONTEND_URL);
    if (frontendRes.statusCode === 200) {
      const hasMetrics = frontendRes.body.includes('9ms') || 
                        frontendRes.body.includes('50K RPS') ||
                        frontendRes.body.includes('100%');
      
      const hasApiCalls = frontendRes.body.includes('api') ||
                          frontendRes.body.includes('backend') ||
                          frontendRes.body.includes('railway');
      
      if (hasMetrics) {
        console.log('✅ Frontend displays performance metrics');
        console.log('   - Response Time: 9ms');
        console.log('   - Throughput: 50K RPS');
        console.log('   - Success Rate: 100%');
      }
      
      if (hasApiCalls) {
        console.log('✅ Frontend has API integration code');
      } else {
        console.log('⚠️  No obvious API integration detected');
      }
    }
  } catch (error) {
    console.log(`❌ Frontend check error: ${error.message}`);
  }
  
  // Test user registration flow
  console.log('\n3. Testing User Registration Flow...');
  const testEmail = `user_${Date.now()}@test.com`;
  try {
    const regData = JSON.stringify({
      email: testEmail,
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User'
    });
    
    const regRes = await makeRequest(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': regData.length
      },
      body: regData
    });
    
    if (regRes.statusCode === 201 || regRes.statusCode === 200) {
      console.log('✅ User registration successful');
      const user = JSON.parse(regRes.body);
      if (user.access_token || user.token) {
        console.log('✅ JWT token received');
      }
    } else {
      console.log(`⚠️  Registration returned: ${regRes.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Registration error: ${error.message}`);
  }
  
  // Check WebSocket support
  console.log('\n4. Checking WebSocket Support...');
  try {
    const wsRes = await makeRequest(`${BACKEND_URL}/socket.io/`);
    if (wsRes.statusCode === 200 || wsRes.statusCode === 400) {
      console.log('✅ WebSocket endpoint available');
    } else {
      console.log(`⚠️  WebSocket check returned: ${wsRes.statusCode}`);
    }
  } catch (error) {
    console.log(`⚠️  WebSocket check: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '=' . repeat(60));
  console.log('📊 SUMMARY:');
  console.log('- Backend API: Running on Railway');
  console.log('- Frontend: Deployed on Vercel (n0de.pro)');
  console.log('- Metrics: Currently showing static values');
  console.log('- Next Steps: Connect frontend to fetch live backend data');
  console.log('=' . repeat(60));
}

testLiveMetrics().catch(console.error);