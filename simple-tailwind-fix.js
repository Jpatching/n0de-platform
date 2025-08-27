#!/usr/bin/env node

/**
 * SIMPLE TAILWIND FIX FOR N0DE.PRO
 * Focus on the core styling issues with minimal CSS
 */

import { chromium } from 'playwright';
import chalk from 'chalk';

async function simpleTailwindFix() {
  console.log(chalk.blue.bold('🔧 Simple Tailwind Fix for n0de.pro...'));
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    await page.goto('https://n0de.pro', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const initial = await page.evaluate(() => document.body.scrollHeight);
    console.log(chalk.yellow(`📏 Initial height: ${initial.toLocaleString()}px`));
    
    // Inject minimal CSS fix directly
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        /* Essential Tailwind class definitions */
        .bg-bg-main { background-color: #0f0f0f !important; }
        .text-text-primary { color: #ffffff !important; }
        .text-text-secondary { color: #a1a1aa !important; }
        .bg-bg-elevated { background-color: #1a1a1a !important; }
        .border-border { border-color: #27272a !important; }
        .text-N0DE-cyan { color: #01d3f4 !important; }
        .text-N0DE-sky { color: #0b86f8 !important; }
        .text-N0DE-navy { color: #00255e !important; }
        .text-N0DE-green { color: #10b981 !important; }
        .bg-bg-main\\/80 { background-color: rgba(15, 15, 15, 0.8) !important; }
        
        /* Container width utility */
        .container-width { 
          width: 100% !important; 
          max-width: 1280px !important; 
          margin-left: auto !important; 
          margin-right: auto !important; 
          padding-left: 1rem !important; 
          padding-right: 1rem !important; 
        }
        
        /* Critical height fixes */
        html, body { height: auto !important; min-height: 100vh !important; }
        .min-h-screen { min-height: 100vh !important; height: auto !important; }
        section { height: auto !important; max-height: none !important; }
        div { height: auto !important; max-height: none !important; }
        
        /* Force layout recalculation */
        * { box-sizing: border-box !important; }
      `;
      document.head.appendChild(style);
    });
    
    await page.waitForTimeout(2000);
    
    const final = await page.evaluate(() => ({
      height: document.body.scrollHeight,
      bgColor: getComputedStyle(document.body).backgroundColor,
      textColor: getComputedStyle(document.body).color
    }));
    
    const reduction = initial - final.height;
    const percent = ((reduction / initial) * 100).toFixed(1);
    
    console.log(chalk.green('📊 Results:'));
    console.log(`   Final height: ${final.height.toLocaleString()}px`);
    console.log(`   Reduction: ${reduction.toLocaleString()}px (${percent}%)`);
    console.log(`   Background: ${final.bgColor}`);
    console.log(`   Text: ${final.textColor}`);
    
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-simple-fix.png',
      fullPage: false 
    });
    
    if (final.height < 5000) {
      console.log(chalk.green.bold('🎊 SUCCESS: Layout normalized!'));
    } else {
      console.log(chalk.yellow.bold('⚡ PARTIAL: Some improvement made'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  } finally {
    await browser.close();
  }
}

simpleTailwindFix().catch(console.error);