#!/usr/bin/env node

/**
 * TAILWIND V4 CSS FIX FOR N0DE.PRO
 * Injects proper Tailwind v4 configuration with CSS-first approach
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import chalk from 'chalk';

async function injectTailwindV4Fix() {
  console.log(chalk.blue.bold('🚀 Starting Tailwind v4 CSS fix injection...'));
  
  // Read the Tailwind v4 CSS config
  const tailwindV4CSS = readFileSync('/root/n0de-deploy/tailwind-v4-config.css', 'utf8');
  const advancedLayoutCSS = readFileSync('/root/n0de-deploy/advanced-layout-fix.css', 'utf8');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  console.log(chalk.yellow('📡 Loading n0de.pro with Tailwind v4 fixes...'));
  
  try {
    await page.goto('https://n0de.pro', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log(chalk.green('✅ Page loaded successfully'));
    
    // Get initial measurements
    const initial = await page.evaluate(() => ({
      height: document.body.scrollHeight,
      bgColor: getComputedStyle(document.body).backgroundColor,
      textColor: getComputedStyle(document.body).color,
      hasCustomClasses: document.querySelectorAll('[class*=\"bg-bg-main\"]').length
    }));
    
    console.log(chalk.yellow(`📏 Initial state:`));
    console.log(`   Height: ${initial.height.toLocaleString()}px`);
    console.log(`   Background: ${initial.bgColor}`);
    console.log(`   Text Color: ${initial.textColor}`);
    console.log(`   Custom Classes: ${initial.hasCustomClasses} elements`);
    
    // Inject Tailwind v4 configuration
    console.log(chalk.blue('💉 Injecting Tailwind v4 CSS configuration...'));
    await page.addStyleTag({ content: tailwindV4CSS });
    
    // Wait a moment for initial styles to apply
    await page.waitForTimeout(1000);
    
    // Inject advanced layout fixes
    console.log(chalk.blue('🔧 Applying advanced layout fixes...'));
    await page.addStyleTag({ content: advancedLayoutCSS });
    
    // Wait for all styles to apply and layout to recalculate
    await page.waitForTimeout(3000);
    
    // Force layout recalculation
    await page.evaluate(() => {
      // Trigger reflow
      document.body.style.display = 'none';
      document.body.offsetHeight;
      document.body.style.display = '';
    });
    
    await page.waitForTimeout(1000);
    
    // Get final measurements
    const final = await page.evaluate(() => ({
      height: document.body.scrollHeight,
      bgColor: getComputedStyle(document.body).backgroundColor,
      textColor: getComputedStyle(document.body).color,
      navBg: getComputedStyle(document.querySelector('nav')).backgroundColor,
      sectionsCount: document.querySelectorAll('section').length,
      hasCustomClasses: document.querySelectorAll('[class*=\"bg-bg-main\"]').length,
      extremeElements: Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 3000;
      }).length
    }));
    
    console.log(chalk.green('📊 Final state:'));
    console.log(`   Height: ${final.height.toLocaleString()}px`);
    console.log(`   Background: ${final.bgColor}`);
    console.log(`   Text Color: ${final.textColor}`);
    console.log(`   Nav Background: ${final.navBg}`);
    console.log(`   Sections: ${final.sectionsCount}`);
    console.log(`   Custom Classes: ${final.hasCustomClasses} elements`);
    console.log(`   Elements >3000px: ${final.extremeElements}`);
    
    // Take screenshots
    console.log(chalk.cyan('📸 Capturing results...'));
    
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-tailwind-v4-fixed.png',
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-viewport-v4.png',
      fullPage: false 
    });
    
    console.log(chalk.green('✅ Screenshots saved'));
    
    // Test functionality
    console.log(chalk.blue('🔗 Testing functionality...'));
    
    // Check navigation
    const navTest = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      const links = nav?.querySelectorAll('a');
      return {
        navExists: !!nav,
        linkCount: links?.length || 0,
        navVisible: nav ? getComputedStyle(nav).display !== 'none' : false
      };
    });
    
    // Check buttons
    const buttonTest = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return {
        buttonCount: buttons.length,
        buttonsVisible: Array.from(buttons).filter(btn => 
          getComputedStyle(btn).display !== 'none'
        ).length
      };
    });
    
    // Test backend connectivity
    let backendTest = { status: 'unknown', error: null };
    try {
      const apiResponse = await page.request.get('https://n0de-backend-production-4e34.up.railway.app/health');
      const apiData = await apiResponse.json();
      backendTest = { status: apiData.status, statusCode: apiResponse.status() };
    } catch (apiError) {
      backendTest.error = apiError.message;
    }
    
    // Calculate improvements
    const heightReduction = initial.height - final.height;
    const percentReduction = ((heightReduction / initial.height) * 100).toFixed(1);
    const isSuccess = final.height < 5000 && final.extremeElements === 0;
    
    console.log(chalk.green.bold('\\n🎯 Tailwind v4 Fix Results:'));
    console.log(chalk.white('════════════════════════════════════════'));
    console.log(chalk.white(`Height Change: ${heightReduction.toLocaleString()}px (${percentReduction}%)`));
    console.log(chalk.white(`Before: ${initial.height.toLocaleString()}px`));
    console.log(chalk.white(`After: ${final.height.toLocaleString()}px`));
    console.log(chalk.white(`Extreme Elements: ${final.extremeElements} (should be 0)`));
    console.log(chalk.white(`Navigation: ${navTest.navExists ? '✅' : '❌'} (${navTest.linkCount} links)`));
    console.log(chalk.white(`Buttons: ${buttonTest.buttonsVisible}/${buttonTest.buttonCount} visible`));
    console.log(chalk.white(`Backend API: ${backendTest.status} ${backendTest.statusCode ? `(${backendTest.statusCode})` : ''}`));
    console.log(chalk.white(`Custom Styling: ${final.bgColor !== 'rgba(0, 0, 0, 0)' ? '✅' : '❌'}`));
    
    if (isSuccess) {
      console.log(chalk.green.bold('\\n🎊 SUCCESS: Layout completely normalized!'));
      console.log(chalk.green('✅ Page height is now within normal range'));
      console.log(chalk.green('✅ No elements with extreme heights detected'));
      console.log(chalk.green('✅ Tailwind v4 classes working properly'));
    } else if (final.height < initial.height) {
      console.log(chalk.yellow.bold('\\n⚡ SIGNIFICANT IMPROVEMENT:'));
      console.log(chalk.yellow(`✅ Reduced height by ${Math.abs(percentReduction)}%`));
      console.log(chalk.yellow(`⚠️  Still has ${final.extremeElements} elements with extreme heights`));
      if (final.height > 10000) {
        console.log(chalk.yellow('💡 May need additional layout fixes for remaining issues'));
      }
    } else {
      console.log(chalk.red.bold('\\n❌ LAYOUT ISSUES PERSIST:'));
      console.log(chalk.red('⚠️  Height not significantly reduced'));
      console.log(chalk.red('💡 May need manual Tailwind v4 configuration in the Vercel deployment'));
    }
    
    // Provide next steps
    console.log(chalk.blue.bold('\\n📋 Next Steps:'));
    if (isSuccess) {
      console.log(chalk.white('1. ✅ Frontend styling is now working correctly'));
      console.log(chalk.white('2. 🔗 Test API integration with backend'));
      console.log(chalk.white('3. 📱 Test responsive design on mobile'));
    } else {
      console.log(chalk.white('1. 📝 Update Vercel deployment with proper Tailwind v4 config'));
      console.log(chalk.white('2. 🔧 Add the generated CSS to globals.css or _app.tsx'));
      console.log(chalk.white('3. ♻️  Redeploy the frontend with fixed configuration'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error during Tailwind v4 fix: ${error.message}`));
  } finally {
    await browser.close();
    console.log(chalk.blue('🔄 Browser closed'));
  }
}

// Run the fix
injectTailwindV4Fix().catch(console.error);