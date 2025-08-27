#!/usr/bin/env node

/**
 * Frontend Analysis with Playwright
 * Analyzes n0de frontend for styling and functionality issues
 */

import { chromium } from 'playwright';

async function analyzeFrontend() {
  console.log('🔍 Starting frontend analysis...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('api') || request.url().includes('backend')) {
      console.log('📤 API Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('api') || response.url().includes('backend')) {
      console.log('📥 API Response:', response.status(), response.url());
    }
  });
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Frontend Error:', msg.text());
    }
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    console.log('🚫 Network Failure:', request.failure().errorText, request.url());
  });
  
  try {
    // Test different potential frontend URLs
    const frontendUrls = [
      'https://n0de-website-umber.vercel.app',
      'https://n0de-website.vercel.app',
      'https://n0de.com',
      'https://www.n0de.com'
    ];
    
    for (const url of frontendUrls) {
      console.log(`\n🌐 Testing: ${url}`);
      
      try {
        const response = await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        console.log(`✅ Status: ${response.status()}`);
        
        // Check if page loaded successfully
        const title = await page.title();
        console.log(`📄 Page Title: ${title}`);
        
        // Check for styling issues
        const hasCSS = await page.evaluate(() => {
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
          return stylesheets.length > 0;
        });
        console.log(`🎨 CSS Present: ${hasCSS ? 'Yes' : 'No'}`);
        
        // Check for API calls
        const apiCalls = await page.evaluate(() => {
          return window.performance.getEntriesByType('resource')
            .filter(entry => entry.name.includes('api') || entry.name.includes('backend'))
            .map(entry => ({ url: entry.name, status: entry.responseStatus }));
        });
        
        if (apiCalls.length > 0) {
          console.log('📡 API Calls detected:');
          apiCalls.forEach(call => console.log(`  - ${call.url} (${call.status || 'pending'})`));
        }
        
        // Check for layout issues
        const hasContent = await page.evaluate(() => {
          return document.body.innerText.trim().length > 0;
        });
        console.log(`📝 Has Content: ${hasContent ? 'Yes' : 'No'}`);
        
        // Take screenshot for analysis
        await page.screenshot({ 
          path: `/root/n0de-deploy/screenshot-${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
          fullPage: true 
        });
        console.log('📸 Screenshot saved');
        
        // Check for common errors
        const errors = await page.evaluate(() => {
          const errorMessages = [];
          const errorElements = document.querySelectorAll('[class*="error"], .error, #error');
          errorElements.forEach(el => errorMessages.push(el.innerText));
          return errorMessages;
        });
        
        if (errors.length > 0) {
          console.log('⚠️  Error messages found:');
          errors.forEach(error => console.log(`  - ${error}`));
        }
        
        break; // Stop at first successful load
        
      } catch (error) {
        console.log(`❌ Failed to load: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Also test backend connectivity
async function testBackend() {
  console.log('\n🔧 Testing backend connectivity...');
  
  const backendUrl = 'https://n0de-backend-production-4e34.up.railway.app';
  
  try {
    const response = await fetch(`${backendUrl}/health`);
    const data = await response.json();
    console.log('✅ Backend Health:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Backend Error:', error.message);
  }
  
  try {
    const response = await fetch(`${backendUrl}/api`);
    const data = await response.json();
    console.log('✅ Backend API:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ API Error:', error.message);
  }
}

// Run analysis
analyzeFrontend().then(() => testBackend()).then(() => {
  console.log('\n✅ Frontend analysis complete!');
}).catch(error => {
  console.error('❌ Analysis error:', error);
});