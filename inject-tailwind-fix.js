#!/usr/bin/env node

/**
 * TAILWIND CSS INJECTION FIX FOR N0DE.PRO
 * This script injects the missing Tailwind CSS classes to fix the styling issues
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import chalk from 'chalk';

async function injectTailwindFix() {
  console.log(chalk.blue.bold('🔧 Starting Tailwind CSS fix injection...'));
  
  // Read the CSS fix file
  const cssContent = readFileSync('/root/n0de-deploy/tailwind-fix.css', 'utf8');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  console.log(chalk.yellow('📡 Loading n0de.pro...'));
  
  try {
    await page.goto('https://n0de.pro', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log(chalk.green('✅ Page loaded successfully'));
    
    // Get initial page height
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(chalk.yellow(`📏 Initial page height: ${initialHeight.toLocaleString()}px`));
    
    // Inject the CSS fix
    console.log(chalk.blue('💉 Injecting Tailwind CSS fix...'));
    
    await page.addStyleTag({
      content: cssContent
    });
    
    // Wait for styles to apply
    await page.waitForTimeout(2000);
    
    // Get new page height
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(chalk.green(`📏 New page height: ${newHeight.toLocaleString()}px`));
    
    // Check styling improvements
    const styleCheck = await page.evaluate(() => {
      const body = document.body;
      const nav = document.querySelector('nav');
      const sections = document.querySelectorAll('section');
      
      const bgColor = getComputedStyle(body).backgroundColor;
      const textColor = getComputedStyle(body).color;
      const navBg = nav ? getComputedStyle(nav).backgroundColor : 'none';
      
      return {
        bodyBackground: bgColor,
        bodyTextColor: textColor,
        navBackground: navBg,
        sectionsCount: sections.length,
        hasProperStyling: bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgb(0, 0, 0)'
      };
    });
    
    console.log(chalk.blue('🎨 Style Analysis:'));
    console.log(`   Background: ${styleCheck.bodyBackground}`);
    console.log(`   Text Color: ${styleCheck.bodyTextColor}`);
    console.log(`   Nav Background: ${styleCheck.navBackground}`);
    console.log(`   Sections: ${styleCheck.sectionsCount}`);
    console.log(`   Proper Styling: ${styleCheck.hasProperStyling ? '✅' : '❌'}`);
    
    // Take screenshots for comparison
    console.log(chalk.cyan('📸 Taking screenshot after fix...'));
    
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-fixed.png',
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-viewport-fixed.png',
      fullPage: false 
    });
    
    console.log(chalk.green('✅ Screenshots saved'));
    
    // Test API connectivity (bonus check)
    console.log(chalk.blue('🔗 Testing API connectivity...'));
    
    try {
      const apiResponse = await page.request.get('https://n0de-backend-production-4e34.up.railway.app/health');
      const apiData = await apiResponse.json();
      console.log(chalk.green(`✅ Backend API: ${apiData.status} (${apiResponse.status()})`));
    } catch (apiError) {
      console.log(chalk.red(`❌ Backend API error: ${apiError.message}`));
    }
    
    // Calculate improvement
    const heightReduction = initialHeight - newHeight;
    const percentReduction = ((heightReduction / initialHeight) * 100).toFixed(1);
    
    console.log(chalk.green.bold('\\n🎉 Tailwind CSS Fix Results:'));
    console.log(chalk.white(`   Height reduction: ${heightReduction.toLocaleString()}px (${percentReduction}%)`));
    console.log(chalk.white(`   Before: ${initialHeight.toLocaleString()}px`));
    console.log(chalk.white(`   After: ${newHeight.toLocaleString()}px`));
    console.log(chalk.white(`   Styling fixed: ${styleCheck.hasProperStyling ? '✅ Yes' : '❌ No'}`));
    
    if (newHeight < 5000) {
      console.log(chalk.green.bold('🎊 SUCCESS: Page height normalized!'));
    } else {
      console.log(chalk.yellow.bold('⚠️  PARTIAL: Some improvement, but may need additional fixes'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error during CSS injection: ${error.message}`));
  } finally {
    await browser.close();
    console.log(chalk.blue('🔄 Browser closed'));
  }
}

// Run the fix
injectTailwindFix().catch(console.error);