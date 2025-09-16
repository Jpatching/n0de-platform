// Claude Code Hook - Auto Deploy Check
// Provides deployment suggestions and auto-restart services when files are edited

const { exec } = require('child_process');
const path = require('path');

function autoDeployCheck(context) {
  const { filePath, editType, content } = context;
  
  console.log(`🔧 File edited: ${path.basename(filePath)} (${editType})`);
  
  // Backend payment file changes
  if (/backend.*payment/i.test(filePath)) {
    console.log('🔄 Payment backend file changed - restarting service...');
    exec('pm2 restart n0de-backend', (error) => {
      if (!error) {
        console.log('✅ Backend restarted successfully');
      } else {
        console.log('⚠️ Backend restart failed');
      }
    });
  }
  
  // Frontend payment file changes
  if (/frontend.*payment/i.test(filePath)) {
    console.log('💡 Frontend payment file changed');
    console.log('   Suggestion: Deploy to production with:');
    console.log('   cd frontend && vercel --prod');
  }
  
  // Environment file changes
  if (/\.env/i.test(filePath)) {
    console.log('⚠️ Environment configuration changed');
    console.log('   Services may need restart for changes to take effect');
  }
  
  // Critical payment service files
  const criticalFiles = ['payments.service', 'payments.controller', 'stripe.service', 'coinbase-commerce.service'];
  if (criticalFiles.some(file => filePath.includes(file))) {
    console.log('🧪 Critical payment file changed - running validation...');
    exec('/home/sol/n0de-deploy/scripts/verify-payment-provider-urls.sh', (error) => {
      if (!error) {
        console.log('✅ Payment system validation passed');
      } else {
        console.log('⚠️ Payment system validation issues detected');
      }
    });
  }
  
  // TypeScript files - lint check
  if (/\.(ts|tsx)$/i.test(filePath) && /frontend/i.test(filePath)) {
    console.log('💡 TypeScript file changed - consider running lint checks');
  }
  
  return true;
}

module.exports = autoDeployCheck;