import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting N0DE Platform E2E Test Suite');
  console.log('⚙️ Global setup - validating environment...');
  
  // Get environment variables
  const backendUrl = process.env.RAILWAY_BACKEND_URL || 'https://n0de-backend-production-4e34.up.railway.app';
  const frontendUrl = process.env.VERCEL_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://www.n0de.pro';
  
  console.log(`🔗 Backend URL: ${backendUrl}`);
  console.log(`🌐 Frontend URL: ${frontendUrl}`);
  
  // Test basic connectivity before starting tests
  console.log('🔍 Testing basic service connectivity...');
  
  try {
    // Test backend health
    const backendResponse = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'N0DE-E2E-Setup/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (backendResponse.ok) {
      console.log('✅ Backend service is reachable');
    } else {
      console.log(`⚠️ Backend service responded with status: ${backendResponse.status}`);
    }
  } catch (error) {
    console.log(`⚠️ Backend connectivity check failed: ${error.message}`);
    console.log('   Tests will continue but may fail if backend is unreachable');
  }
  
  try {
    // Test frontend connectivity
    const frontendResponse = await fetch(frontendUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'N0DE-E2E-Setup/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend service is reachable');
    } else {
      console.log(`⚠️ Frontend service responded with status: ${frontendResponse.status}`);
    }
  } catch (error) {
    console.log(`⚠️ Frontend connectivity check failed: ${error.message}`);
    console.log('   Tests will continue but may fail if frontend is unreachable');
  }
  
  // Set up test environment variables for payment testing
  console.log('💳 Setting up payment test environment...');
  
  // Generate unique test identifiers
  const testSession = `test-session-${Date.now()}`;
  const testUser = `test-user-${Date.now()}@n0de.test`;
  
  // Store test identifiers in global scope for tests to use
  (globalThis as any).__TEST_SESSION__ = testSession;
  (globalThis as any).__TEST_USER__ = testUser;
  (globalThis as any).__BACKEND_URL__ = backendUrl;
  (globalThis as any).__FRONTEND_URL__ = frontendUrl;
  
  console.log(`🎭 Test session ID: ${testSession}`);
  console.log(`👤 Test user: ${testUser}`);
  
  // Validate critical test endpoints
  const criticalEndpoints = [
    `${backendUrl}/api/payments`,
    `${backendUrl}/api/subscriptions/plans`,
    `${backendUrl}/api/health`,
  ];
  
  console.log('🔍 Validating critical API endpoints...');
  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'N0DE-E2E-Setup/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.status < 500) {
        console.log(`✅ ${endpoint}: Accessible (${response.status})`);
      } else {
        console.log(`⚠️ ${endpoint}: Server error (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed (${error.message})`);
    }
  }
  
  console.log('✅ Global setup completed - ready to run tests');
  console.log('');
}

export default globalSetup;