#!/usr/bin/env node

/**
 * Test script to verify billing API responses match frontend expectations
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''; // Set this to a valid JWT token

// Test function
async function testBillingAPIs() {
  console.log('🧪 Testing N0DE Billing APIs...\n');

  // Set up headers
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Test 1: GET /api/v1/billing/usage
  console.log('📊 Testing GET /api/v1/billing/usage...');
  try {
    const usageResponse = await axios.get(`${API_URL}/api/v1/billing/usage`, { headers });
    const usage = usageResponse.data;

    console.log('✅ Usage API Response:');
    console.log(JSON.stringify(usage, null, 2));

    // Validate required fields
    const requiredUsageFields = [
      'usage.requests_used',
      'usage.requests_limit',
      'usage.bandwidth_used',
      'usage.bandwidth_limit',
      'usage.storage_used',
      'usage.storage_limit',
    ];

    const missingFields = [];
    requiredUsageFields.forEach(field => {
      const parts = field.split('.');
      let value = usage;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value === undefined) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
    } else {
      console.log('✅ All required usage fields present');
    }

  } catch (error) {
    console.error('❌ Usage API Error:', error.response?.data || error.message);
  }

  console.log('\n---\n');

  // Test 2: GET /api/v1/billing/subscription
  console.log('💳 Testing GET /api/v1/billing/subscription...');
  try {
    const subscriptionResponse = await axios.get(`${API_URL}/api/v1/billing/subscription`, { headers });
    const subscription = subscriptionResponse.data;

    console.log('✅ Subscription API Response:');
    console.log(JSON.stringify(subscription, null, 2));

    // Validate required fields
    const requiredSubscriptionFields = [
      'plan.name',
      'plan.price',
      'plan.billing_cycle',
      'plan.status',
    ];

    const missingFields = [];
    requiredSubscriptionFields.forEach(field => {
      const parts = field.split('.');
      let value = subscription;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value === undefined) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
    } else {
      console.log('✅ All required subscription fields present');
    }

    // Check field types
    if (subscription.plan) {
      if (typeof subscription.plan.price !== 'number') {
        console.error('❌ plan.price should be a number');
      }
      if (typeof subscription.plan.name !== 'string') {
        console.error('❌ plan.name should be a string');
      }
    }

  } catch (error) {
    console.error('❌ Subscription API Error:', error.response?.data || error.message);
  }

  console.log('\n---\n');
  console.log('📋 Summary:');
  console.log('- Usage API: Returns requests, bandwidth, and storage usage with limits');
  console.log('- Subscription API: Returns plan details, payment methods, and billing info');
  console.log('\n⚠️  Make sure AUTH_TOKEN environment variable is set with a valid JWT token');
}

// Run tests
if (!AUTH_TOKEN) {
  console.error('❌ ERROR: Please set TEST_AUTH_TOKEN environment variable with a valid JWT token');
  console.log('\nExample:');
  console.log('TEST_AUTH_TOKEN="your-jwt-token" node test-billing-api.js');
  process.exit(1);
}

testBillingAPIs().catch(console.error);