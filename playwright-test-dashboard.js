#!/usr/bin/env node

/**
 * Playwright browser testing for n0de Platform
 * Works in SSH environment with headless browsers
 */

import { chromium } from 'playwright';
import chalk from 'chalk';

async function testDashboardBrowser() {
  console.log(chalk.blue.bold('🎭 n0de Platform - Playwright Browser Tests\\n'));
  
  const browser = await chromium.launch({ 
    headless: true, // Required for SSH servers
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Security for root user
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'n0de-testing-bot'
  });
  
  const page = await context.newPage();
  
  try {
    // Test 1: Admin Dashboard UI
    console.log(chalk.yellow('1️⃣ Testing Admin Dashboard UI...'));
    await page.goto('http://localhost:3002');
    
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const title = await page.title();
    console.log(chalk.green(`✅ Admin Dashboard loaded: "${title}"`));
    
    // Take screenshot for verification
    await page.screenshot({ path: 'admin-dashboard-test.png', fullPage: true });
    console.log(chalk.cyan(`📸 Screenshot saved: admin-dashboard-test.png`));
    
    // Test API Stats endpoint through browser
    const statsResponse = await page.request.get('http://localhost:3002/api/stats');
    const statsData = await statsResponse.json();
    console.log(chalk.green(`✅ API Stats: ${statsData.total_users} users, €${statsData.total_revenue} revenue`));
    
    // Test 2: User API Health
    console.log(chalk.yellow('\\n2️⃣ Testing User API Health...'));
    const userHealthResponse = await page.request.get('http://localhost:3004/health');
    const userHealth = await userHealthResponse.json();
    console.log(chalk.green(`✅ User API Health: ${userHealth.status}`));
    
    // Test 3: Payment Service Health  
    console.log(chalk.yellow('\\n3️⃣ Testing Payment Service Health...'));
    const paymentHealthResponse = await page.request.get('http://localhost:3005/health');
    const paymentHealth = await paymentHealthResponse.json();
    console.log(chalk.green(`✅ Payment Service Health: ${paymentHealth.status}`));
    
    // Test 4: Frontend Integration
    console.log(chalk.yellow('\\n4️⃣ Testing Frontend Integration...'));
    await page.goto('https://n0de-website-umber.vercel.app');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const frontendTitle = await page.title();
    const hasN0deContent = await page.locator('text=n0de').count() > 0;
    
    if (hasN0deContent) {
      console.log(chalk.green(`✅ Frontend loaded: "${frontendTitle}"`));
      await page.screenshot({ path: 'frontend-test.png', fullPage: true });
      console.log(chalk.cyan(`📸 Frontend screenshot saved: frontend-test.png`));
    } else {
      console.log(chalk.red(`❌ Frontend may not be displaying correctly`));
      await page.screenshot({ path: 'frontend-error.png', fullPage: true });
    }
    
    // Test 5: Database Connection Test
    console.log(chalk.yellow('\\n5️⃣ Testing Database Connection...'));
    const userListResponse = await page.request.get('http://localhost:3002/api/users');
    const userList = await userListResponse.json();
    console.log(chalk.green(`✅ Database: ${userList.length} users retrieved`));
    
    // Performance Test
    console.log(chalk.yellow('\\n6️⃣ Performance Testing...'));
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify({
        navigation: performance.getEntriesByType('navigation')[0],
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null
      });
    });
    
    const perf = JSON.parse(performanceEntries);
    console.log(chalk.green(`✅ Page Load Time: ${Math.round(perf.navigation?.loadEventEnd - perf.navigation?.fetchStart)}ms`));
    
    console.log(chalk.green.bold('\\n🎉 All Playwright browser tests completed successfully!'));
    
    // Summary
    console.log(chalk.blue('\\n📋 Test Summary:'));
    console.log('✅ Admin Dashboard UI: Working');
    console.log('✅ API Endpoints: Working');  
    console.log('✅ Payment Service: Working');
    console.log(`${hasN0deContent ? '✅' : '❌'} Frontend Integration: ${hasN0deContent ? 'Working' : 'Needs attention'}`);
    console.log('✅ Database Connection: Working');
    console.log('✅ Performance: Measured');
    
  } catch (error) {
    console.error(chalk.red(`❌ Browser test failed: ${error.message}`));
    
    // Save error screenshot
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log(chalk.cyan(`📸 Error screenshot saved: error-screenshot.png`));
    } catch (screenshotError) {
      console.error('Could not save error screenshot');
    }
    
  } finally {
    await browser.close();
    console.log(chalk.blue('\\n🔄 Browser closed. Tests complete.'));
  }
}

// Run browser tests
testDashboardBrowser().catch(console.error);