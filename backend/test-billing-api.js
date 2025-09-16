const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:4000';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-jwt-token-here';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function testBillingAPI() {
  console.log('🧪 Testing N0DE Billing API Endpoints\n');
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const tests = [
    {
      name: '1. Health Check',
      url: `${BASE_URL}/health`,
      method: 'GET',
      requiresAuth: false
    },
    {
      name: '2. Get Billing Usage',
      url: `${BASE_URL}/api/v1/billing/usage`,
      method: 'GET',
      requiresAuth: true
    },
    {
      name: '3. Get Subscription Info',
      url: `${BASE_URL}/api/v1/billing/subscription`,
      method: 'GET',
      requiresAuth: true
    },
    {
      name: '4. Get Billing History',
      url: `${BASE_URL}/api/v1/billing/history`,
      method: 'GET',
      requiresAuth: true
    }
  ];

  for (const test of tests) {
    try {
      console.log(`${test.name}...`);
      
      const options = {
        method: test.method,
        headers: test.requiresAuth ? headers : { 'Content-Type': 'application/json' },
        ...(test.data && { data: test.data })
      };

      const response = await makeRequest(test.url, options);
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
      console.log('');
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }
  }
}

if (!TEST_TOKEN || TEST_TOKEN === 'your-jwt-token-here') {
  console.log('❌ Please provide a valid JWT token:');
  console.log('TEST_AUTH_TOKEN="your-actual-jwt-token" node test-billing-api.js');
  console.log('\n💡 Get token from browser DevTools > Application > Local Storage');
  process.exit(1);
}

testBillingAPI().catch(console.error);
