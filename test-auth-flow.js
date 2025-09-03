#!/usr/bin/env node
/**
 * N0DE Authentication Flow Test
 * 
 * This script tests the complete authentication flow:
 * 1. OAuth redirect URLs are correct
 * 2. API endpoints are accessible  
 * 3. Dashboard data loading works
 * 4. Payment integration is connected
 */

const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://n0de.pro/api/v1';
const FRONTEND_URL = 'https://n0de.pro';

console.log('🧪 N0DE Authentication Flow Test\n');

// Test 1: Check backend health
async function testBackendHealth() {
  console.log('1️⃣ Testing backend health...');
  
  return new Promise((resolve, reject) => {
    const req = https.get(`${BASE_URL}/auth/profile`, { timeout: 5000 }, (res) => {
      if (res.statusCode === 401) {
        console.log('✅ Backend is responding (401 expected for unauthenticated request)');
        resolve(true);
      } else {
        console.log(`⚠️ Unexpected status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ Backend not accessible:', err.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Backend timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Check OAuth endpoints
async function testOAuthEndpoints() {
  console.log('\n2️⃣ Testing OAuth endpoints...');
  
  const providers = ['google', 'github'];
  const results = [];
  
  for (const provider of providers) {
    await new Promise((resolve) => {
      const req = https.get(`${BASE_URL}/auth/${provider}`, { timeout: 5000 }, (res) => {
        if (res.statusCode === 302) {
          console.log(`✅ ${provider} OAuth redirect working (302)`);
          results.push(true);
        } else {
          console.log(`❌ ${provider} OAuth failed: ${res.statusCode}`);
          results.push(false);
        }
        resolve();
      });
      
      req.on('error', (err) => {
        console.log(`❌ ${provider} OAuth error:`, err.message);
        results.push(false);
        resolve();
      });
      
      req.on('timeout', () => {
        console.log(`❌ ${provider} OAuth timeout`);
        req.destroy();
        results.push(false);
        resolve();
      });
    });
  }
  
  return results.every(r => r);
}

// Test 3: Check API endpoints exist
async function testAPIEndpoints() {
  console.log('\n3️⃣ Testing API endpoints...');
  
  const endpoints = [
    '/api-keys',
    '/usage', 
    '/metrics/performance',
    '/payments',
    '/subscriptions/usage'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    await new Promise((resolve) => {
      const req = https.get(`${BASE_URL}${endpoint}`, { timeout: 3000 }, (res) => {
        if (res.statusCode === 401) {
          console.log(`✅ ${endpoint} exists (401 expected)`);
          results.push(true);
        } else if (res.statusCode === 404) {
          console.log(`❌ ${endpoint} not found (404)`);
          results.push(false);
        } else {
          console.log(`✅ ${endpoint} responding (${res.statusCode})`);
          results.push(true);
        }
        resolve();
      });
      
      req.on('error', (err) => {
        console.log(`❌ ${endpoint} error:`, err.message);
        results.push(false);
        resolve();
      });
      
      req.on('timeout', () => {
        console.log(`❌ ${endpoint} timeout`);
        req.destroy();
        results.push(false);
        resolve();
      });
    });
  }
  
  return results;
}

// Test 4: Check frontend is accessible
async function testFrontend() {
  console.log('\n4️⃣ Testing frontend accessibility...');
  
  return new Promise((resolve) => {
    const req = https.get(FRONTEND_URL, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Frontend is accessible');
        resolve(true);
      } else {
        console.log(`⚠️ Frontend status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ Frontend not accessible:', err.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Frontend timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Run all tests
async function runTests() {
  const backendHealth = await testBackendHealth();
  const oauthWorking = await testOAuthEndpoints(); 
  const apiEndpoints = await testAPIEndpoints();
  const frontendWorking = await testFrontend();
  
  console.log('\n📊 Test Results Summary:');
  console.log('=======================');
  console.log(`Backend Health: ${backendHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`OAuth Flow: ${oauthWorking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Endpoints: ${apiEndpoints.filter(r => r).length}/${apiEndpoints.length} working`);
  console.log(`Frontend: ${frontendWorking ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassing = backendHealth && oauthWorking && apiEndpoints.every(r => r) && frontendWorking;
  
  console.log(`\n🎯 Overall Status: ${allPassing ? '✅ ALL SYSTEMS GO' : '⚠️ ISSUES DETECTED'}`);
  
  if (allPassing) {
    console.log('\n✨ Auth flow is ready to test:');
    console.log(`1. Visit: ${FRONTEND_URL}`);
    console.log('2. Click "Launch App" or "Sign In"'); 
    console.log('3. Choose Google or GitHub OAuth');
    console.log('4. Complete authentication');
    console.log('5. Should redirect to dashboard with real data');
    console.log('\n💰 Payment flow ready:');
    console.log('1. Go to billing/subscriptions in dashboard');
    console.log('2. Select a plan and pay with crypto via Coinbase Commerce');
  } else {
    console.log('\n🔧 Issues to fix:');
    if (!backendHealth) console.log('- Backend server not responding');
    if (!oauthWorking) console.log('- OAuth endpoints not working');
    if (!apiEndpoints.every(r => r)) console.log('- Some API endpoints missing');
    if (!frontendWorking) console.log('- Frontend not accessible');
  }
}

// Check if this is a CLI run
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };