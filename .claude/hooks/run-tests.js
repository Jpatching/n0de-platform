// Claude Code Hook - Run Tests
// Automatically runs relevant tests when tasks are completed

const { exec } = require('child_process');

function runTests(context) {
  const { taskDescription, completedFiles } = context;
  
  console.log('🧪 Task completed - running relevant tests...');
  
  // Payment-related task completion
  if (/payment|billing|subscription/i.test(taskDescription)) {
    console.log('💳 Payment task completed - running payment system tests...');
    
    // Run automated payment tests
    exec('/home/sol/n0de-deploy/scripts/automated-payment-tests.sh', (error, stdout) => {
      if (!error) {
        console.log('✅ Payment system tests: PASSED');
      } else {
        console.log('⚠️ Payment system tests: Some issues detected');
      }
    });
    
    // Test webhook endpoints
    exec('/home/sol/n0de-deploy/scripts/test-all-webhooks.sh', (error) => {
      if (!error) {
        console.log('✅ Webhook tests: PASSED');
      } else {
        console.log('⚠️ Webhook tests: Issues detected');
      }
    });
  }
  
  // Security-related task completion
  if (/security|auth|encrypt/i.test(taskDescription)) {
    console.log('🔒 Security task completed - running security checks...');
    
    exec('/home/sol/n0de-deploy/scripts/security-hardening.sh', (error) => {
      if (!error) {
        console.log('✅ Security checks: PASSED');
      } else {
        console.log('⚠️ Security checks: Issues detected');
      }
    });
  }
  
  // Frontend-related task completion
  if (/frontend|ui|component/i.test(taskDescription)) {
    console.log('🌐 Frontend task completed - checking build status...');
    
    exec('cd /home/sol/n0de-deploy/frontend && npm run build', (error) => {
      if (!error) {
        console.log('✅ Frontend build: SUCCESS');
        console.log('💡 Consider deploying: vercel --prod');
      } else {
        console.log('⚠️ Frontend build: FAILED');
      }
    });
  }
  
  // Database-related task completion
  if (/database|migration|schema/i.test(taskDescription)) {
    console.log('🗄️ Database task completed - checking connectivity...');
    
    exec('PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT version();"', (error) => {
      if (!error) {
        console.log('✅ Database connectivity: OK');
      } else {
        console.log('⚠️ Database connectivity: Issues detected');
      }
    });
  }
  
  return true;
}

module.exports = runTests;