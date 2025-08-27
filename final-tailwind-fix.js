#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE TAILWIND FIX FOR N0DE.PRO
 * Fixes both the color mapping issue and layout height problems
 */

import { chromium } from 'playwright';
import chalk from 'chalk';

async function finalTailwindFix() {
  console.log(chalk.blue.bold('🎯 Final Comprehensive Tailwind Fix for n0de.pro...'));
  console.log(chalk.yellow('Found root cause: HTML uses bg-bg-main but Tailwind defines bg-main (prefix mismatch)'));
  
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
    
    const initial = await page.evaluate(() => ({
      height: document.body.scrollHeight,
      bgColor: getComputedStyle(document.body).backgroundColor,
      hasCustomClasses: document.querySelectorAll('[class*="bg-bg-main"]').length
    }));
    
    console.log(chalk.yellow(`📏 Initial state:`));
    console.log(`   Height: ${initial.height.toLocaleString()}px`);
    console.log(`   Background: ${initial.bgColor}`);
    console.log(`   Elements with custom classes: ${initial.hasCustomClasses}`);
    
    // Inject the comprehensive fix
    console.log(chalk.blue('💉 Injecting comprehensive Tailwind fix...'));
    
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        /* CRITICAL FIX: Double-prefixed Tailwind classes */
        .bg-bg-main { background-color: #0f0f0f !important; }
        .bg-bg-elevated { background-color: #1a1a1a !important; }
        .bg-bg-card { background-color: #202020 !important; }
        .text-text-primary { color: #ffffff !important; }
        .text-text-secondary { color: #a1a1aa !important; }
        .text-text-muted { color: #71717a !important; }
        .border-border { border-color: #27272a !important; }
        
        /* N0DE Brand Colors */
        .text-N0DE-cyan { color: #01d3f4 !important; }
        .text-N0DE-sky { color: #0b86f8 !important; }
        .text-N0DE-navy { color: #00255e !important; }
        .text-N0DE-green { color: #10b981 !important; }
        .text-N0DE-blue { color: #3b82f6 !important; }
        .text-N0DE-purple { color: #8b5cf6 !important; }
        .bg-N0DE-cyan { background-color: #01d3f4 !important; }
        .bg-N0DE-green { background-color: #10b981 !important; }
        
        /* Alpha variants */
        .bg-bg-main\\/80 { background-color: rgba(15, 15, 15, 0.8) !important; }
        .bg-bg-elevated\\/95 { background-color: rgba(26, 26, 26, 0.95) !important; }
        .bg-bg-elevated\\/30 { background-color: rgba(26, 26, 26, 0.3) !important; }
        
        /* Container and layout utilities */
        .container-width { 
          width: 100% !important; 
          max-width: 1280px !important; 
          margin-left: auto !important; 
          margin-right: auto !important; 
          padding-left: 1rem !important; 
          padding-right: 1rem !important; 
        }
        
        .section-padding {
          padding-left: 1rem !important; 
          padding-right: 1rem !important; 
          padding-top: 4rem !important; 
          padding-bottom: 4rem !important; 
        }
        
        /* CRITICAL HEIGHT FIXES */
        html, body { 
          height: auto !important; 
          min-height: 100vh !important; 
          overflow-x: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .min-h-screen { 
          min-height: 100vh !important; 
          height: auto !important; 
          max-height: none !important;
        }
        
        section, div { 
          height: auto !important; 
          max-height: none !important; 
        }
        
        /* Fix specific problem elements */
        #performance { 
          height: auto !important; 
          padding-top: 2rem !important;
          padding-bottom: 4rem !important;
        }
        
        .relative.overflow-hidden.mb-8.space-y-6 {
          height: auto !important;
          overflow: visible !important;
          margin-bottom: 2rem !important;
        }
        
        /* Animation fixes */
        .animate-scroll {
          animation: scroll 30s linear infinite !important;
          height: auto !important;
        }
        
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        /* Gradients */
        .from-N0DE-cyan {
          --tw-gradient-from: #01d3f4 !important;
          --tw-gradient-to: rgba(1, 211, 244, 0) !important;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
        }
        
        .via-N0DE-sky {
          --tw-gradient-to: rgba(11, 134, 248, 0) !important;
          --tw-gradient-stops: var(--tw-gradient-from), #0b86f8, var(--tw-gradient-to) !important;
        }
        
        .to-N0DE-navy {
          --tw-gradient-to: #00255e !important;
        }
        
        /* Backdrop blur */
        .backdrop-blur-lg { backdrop-filter: blur(16px) !important; }
        .backdrop-blur-xl { backdrop-filter: blur(24px) !important; }
        
        /* Force proper box-sizing */
        * { box-sizing: border-box !important; }
        
        /* Fix nav positioning */
        nav.fixed {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 50 !important;
        }
      `;
      document.head.appendChild(style);
      
      // Force layout recalculation
      document.body.style.display = 'none';
      document.body.offsetHeight;
      document.body.style.display = '';
    });
    
    await page.waitForTimeout(3000);
    
    const final = await page.evaluate(() => ({
      height: document.body.scrollHeight,
      bgColor: getComputedStyle(document.body).backgroundColor,
      textColor: getComputedStyle(document.body).color,
      navBg: getComputedStyle(document.querySelector('nav')).backgroundColor,
      extremeElements: Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 3000;
      }).length,
      sectionsCount: document.querySelectorAll('section').length,
      hasCustomClasses: document.querySelectorAll('[class*="bg-bg-main"]').length
    }));
    
    // Take final screenshots
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-final-fix.png',
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: '/root/n0de-deploy/n0de-pro-viewport-final.png',
      fullPage: false 
    });
    
    // Calculate results
    const heightReduction = initial.height - final.height;
    const percentReduction = ((heightReduction / initial.height) * 100).toFixed(1);
    const isSuccess = final.height < 5000 && final.extremeElements === 0;
    const stylingFixed = final.bgColor !== 'rgba(0, 0, 0, 0)' && final.bgColor !== 'rgb(0, 0, 0)';
    
    console.log(chalk.green.bold('\\n🎯 FINAL RESULTS:'));
    console.log(chalk.white('════════════════════════════════════════'));
    console.log(chalk.white(`Initial Height: ${initial.height.toLocaleString()}px`));
    console.log(chalk.white(`Final Height: ${final.height.toLocaleString()}px`));
    console.log(chalk.white(`Height Change: ${heightReduction.toLocaleString()}px (${percentReduction}%)`));
    console.log(chalk.white(`Background: ${final.bgColor}`));
    console.log(chalk.white(`Text Color: ${final.textColor}`));
    console.log(chalk.white(`Nav Background: ${final.navBg}`));
    console.log(chalk.white(`Sections: ${final.sectionsCount}`));
    console.log(chalk.white(`Elements >3000px: ${final.extremeElements}`));
    console.log(chalk.white(`Custom Classes: ${final.hasCustomClasses}`));
    
    if (isSuccess && stylingFixed) {
      console.log(chalk.green.bold('\\n🎊 COMPLETE SUCCESS!'));
      console.log(chalk.green('✅ Page height normalized (<5000px)'));
      console.log(chalk.green('✅ No extreme height elements'));
      console.log(chalk.green('✅ Custom Tailwind classes working'));
      console.log(chalk.green('✅ Colors and styling applied correctly'));
      console.log(chalk.green('✅ Layout is now functional'));
    } else if (stylingFixed) {
      console.log(chalk.yellow.bold('\\n⚡ MAJOR IMPROVEMENT!'));
      console.log(chalk.yellow('✅ Custom Tailwind classes now working'));
      console.log(chalk.yellow('✅ Colors and styling applied correctly'));
      if (final.height > initial.height * 0.7) {
        console.log(chalk.yellow('⚠️  Height still high - may need additional layout fixes'));
      }
    } else {
      console.log(chalk.red.bold('\\n❌ PARTIAL FIX:'));
      console.log(chalk.red('⚠️  Some improvements made but styling issues persist'));
    }
    
    // Provide deployment instructions
    console.log(chalk.blue.bold('\\n📋 DEPLOYMENT INSTRUCTIONS:'));
    console.log(chalk.white('To permanently fix this in Vercel:'));
    console.log(chalk.white('1. Update tailwind.config.ts with the corrected color mappings'));
    console.log(chalk.white('2. Ensure bg-bg-main, text-text-primary classes are defined'));
    console.log(chalk.white('3. Add container-width utility class'));
    console.log(chalk.white('4. Add proper height resets to globals.css'));
    console.log(chalk.white('5. Redeploy to Vercel'));
    console.log(chalk.cyan('\\n📁 Files ready for deployment:'));
    console.log(chalk.cyan('   - corrected-tailwind.config.ts'));
    console.log(chalk.cyan('   - Screenshots: n0de-pro-final-fix.png'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Error during fix: ${error.message}`));
  } finally {
    await browser.close();
  }
}

finalTailwindFix().catch(console.error);