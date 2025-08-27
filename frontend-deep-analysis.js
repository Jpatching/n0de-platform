#!/usr/bin/env node

/**
 * Deep Frontend Analysis for N0DE Platform
 * Analyzes hydration, styling, and deployment issues
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function deepFrontendAnalysis() {
  console.log('🔍 Starting deep frontend analysis...');
  
  const browser = await chromium.launch({ 
    headless: true, // Headless mode for server environment
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const message = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    };
    consoleMessages.push(message);
    console.log(`🟦 Console ${msg.type()}: ${msg.text()}`);
  });
  
  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      resourceType: request.resourceType()
    });
  });
  
  // Capture network responses
  const networkResponses = [];
  page.on('response', response => {
    networkResponses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      contentType: response.headers()['content-type']
    });
  });
  
  // Capture failed requests
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText,
      method: request.method()
    });
  });
  
  try {
    console.log('\n🌐 Loading frontend...');
    const response = await page.goto('https://n0de-website-umber.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log(`✅ Initial load status: ${response.status()}`);
    
    // Wait for potential hydration
    await page.waitForTimeout(3000);
    
    // Check for hydration errors
    console.log('\n🔥 Checking for hydration errors...');
    const hydrationErrors = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('hydration') || 
      msg.text.toLowerCase().includes('hydrat') ||
      msg.text.toLowerCase().includes('server') && msg.text.toLowerCase().includes('client')
    );
    
    if (hydrationErrors.length > 0) {
      console.log('❌ Hydration errors found:');
      hydrationErrors.forEach(error => console.log(`  - ${error.text}`));
    } else {
      console.log('✅ No obvious hydration errors detected');
    }
    
    // Check React errors
    const reactErrors = consoleMessages.filter(msg => 
      msg.text.includes('React') || msg.text.includes('Warning:')
    );
    
    if (reactErrors.length > 0) {
      console.log('\n⚠️  React warnings/errors:');
      reactErrors.forEach(error => console.log(`  - ${error.text}`));
    }
    
    // Check CSS loading
    console.log('\n🎨 Analyzing CSS and styling...');
    const cssAnalysis = await page.evaluate(() => {
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const inlineStyles = Array.from(document.querySelectorAll('style'));
      
      return {
        externalCSS: stylesheets.map(link => ({
          href: link.href,
          loaded: link.sheet !== null,
          disabled: link.disabled
        })),
        inlineStyles: inlineStyles.length,
        computedStyles: {
          bodyFontFamily: getComputedStyle(document.body).fontFamily,
          bodyFontSize: getComputedStyle(document.body).fontSize,
          backgroundColor: getComputedStyle(document.body).backgroundColor
        }
      };
    });
    
    console.log('📄 CSS Analysis:');
    console.log(`  - External stylesheets: ${cssAnalysis.externalCSS.length}`);
    console.log(`  - Inline styles: ${cssAnalysis.inlineStyles}`);
    cssAnalysis.externalCSS.forEach(css => {
      console.log(`  - ${css.href}: ${css.loaded ? '✅ Loaded' : '❌ Failed'}`);
    });
    
    // Check for layout issues
    console.log('\n📐 Checking layout and rendering...');
    const layoutAnalysis = await page.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main') || document.querySelector('[role="main"]');
      
      return {
        bodyDimensions: {
          width: body.offsetWidth,
          height: body.offsetHeight,
          scrollHeight: body.scrollHeight
        },
        mainContentExists: !!main,
        visibleElements: document.querySelectorAll('*').length,
        hiddenElements: Array.from(document.querySelectorAll('*')).filter(el => 
          getComputedStyle(el).display === 'none'
        ).length
      };
    });
    
    console.log('📊 Layout Analysis:');
    console.log(`  - Body dimensions: ${layoutAnalysis.bodyDimensions.width}x${layoutAnalysis.bodyDimensions.height}`);
    console.log(`  - Main content exists: ${layoutAnalysis.mainContentExists ? '✅' : '❌'}`);
    console.log(`  - Visible elements: ${layoutAnalysis.visibleElements}`);
    console.log(`  - Hidden elements: ${layoutAnalysis.hiddenElements}`);
    
    // Check API calls
    console.log('\n📡 Analyzing API connectivity...');
    const apiRequests = networkRequests.filter(req => 
      req.url.includes('api') || 
      req.url.includes('backend') ||
      req.url.includes('n0de-backend')
    );
    
    const apiResponses = networkResponses.filter(res => 
      res.url.includes('api') || 
      res.url.includes('backend') ||
      res.url.includes('n0de-backend')
    );
    
    console.log(`📤 API Requests made: ${apiRequests.length}`);
    apiRequests.forEach(req => console.log(`  - ${req.method} ${req.url}`));
    
    console.log(`📥 API Responses: ${apiResponses.length}`);
    apiResponses.forEach(res => console.log(`  - ${res.status} ${res.url}`));
    
    // Check for JavaScript errors
    const jsErrors = consoleMessages.filter(msg => msg.type === 'error');
    if (jsErrors.length > 0) {
      console.log('\n❌ JavaScript errors:');
      jsErrors.forEach(error => console.log(`  - ${error.text}`));
    }
    
    // Check failed network requests
    if (failedRequests.length > 0) {
      console.log('\n🚫 Failed network requests:');
      failedRequests.forEach(req => console.log(`  - ${req.method} ${req.url}: ${req.failure}`));
    }
    
    // Test specific frontend functionality
    console.log('\n🧪 Testing frontend functionality...');
    
    // Test navigation
    const hasNavigation = await page.evaluate(() => {
      return !!document.querySelector('nav, [role="navigation"]');
    });
    console.log(`🧭 Navigation present: ${hasNavigation ? '✅' : '❌'}`);
    
    // Test buttons and interactions
    const interactiveElements = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const links = document.querySelectorAll('a[href]');
      const forms = document.querySelectorAll('form');
      
      return {
        buttons: buttons.length,
        links: links.length,
        forms: forms.length
      };
    });
    
    console.log('🔘 Interactive elements:');
    console.log(`  - Buttons: ${interactiveElements.buttons}`);
    console.log(`  - Links: ${interactiveElements.links}`);
    console.log(`  - Forms: ${interactiveElements.forms}`);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: '/root/n0de-deploy/frontend-analysis-full.png',
      fullPage: true 
    });
    console.log('📸 Full page screenshot saved');
    
    // Take viewport screenshot
    await page.screenshot({ 
      path: '/root/n0de-deploy/frontend-analysis-viewport.png',
      fullPage: false 
    });
    console.log('📸 Viewport screenshot saved');
    
    // Save analysis report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'https://n0de-website-umber.vercel.app',
      status: response.status(),
      consoleMessages,
      networkRequests: networkRequests.length,
      networkResponses: networkResponses.length,
      failedRequests,
      cssAnalysis,
      layoutAnalysis,
      apiRequests: apiRequests.length,
      hydrationErrors: hydrationErrors.length,
      jsErrors: jsErrors.length
    };
    
    await fs.writeFile('/root/n0de-deploy/frontend-analysis-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Analysis report saved to frontend-analysis-report.json');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the analysis
deepFrontendAnalysis().then(() => {
  console.log('\n✅ Deep frontend analysis complete!');
}).catch(error => {
  console.error('❌ Analysis error:', error);
});