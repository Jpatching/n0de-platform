// Claude Code Hook - Payment System Check
// Automatically validates payment system when working on payment-related code

const fs = require('fs');
const { exec } = require('child_process');

function checkPaymentSystem(context) {
  const { files, prompt } = context;
  
  // Check if working on payment-related files
  const paymentFiles = files.filter(file => 
    /payment|billing|stripe|coinbase|webhook|subscription/i.test(file)
  );
  
  if (paymentFiles.length > 0) {
    console.log('🚨 Payment-related files detected. Running system checks...');
    
    // Check API health
    exec('curl -s -w "%{http_code}" -o /dev/null https://api.n0de.pro/health --max-time 5', (error, stdout) => {
      if (stdout === '200') {
        console.log('✅ Payment API: HEALTHY');
      } else {
        console.log(`⚠️ Payment API: Issues detected (Status: ${stdout})`);
      }
    });
    
    // Check payment monitor service
    exec('systemctl is-active --quiet n0de-payment-monitor', (error) => {
      if (!error) {
        console.log('✅ Payment Monitor: ACTIVE');
      } else {
        console.log('⚠️ Payment Monitor: Not running');
      }
    });
    
    // Check database connectivity
    exec('PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT COUNT(*) FROM payments;" 2>/dev/null', (error) => {
      if (!error) {
        console.log('✅ Payment Database: CONNECTED');
      } else {
        console.log('⚠️ Payment Database: Connection issues');
      }
    });
  }
  
  // Check frontend status if working on frontend files
  if (files.some(file => /frontend|src|components/i.test(file))) {
    exec('curl -s -w "%{http_code}" -o /dev/null https://n0de.pro --max-time 5', (error, stdout) => {
      if (stdout === '200') {
        console.log('✅ Frontend: LIVE');
      } else {
        console.log(`⚠️ Frontend: Status ${stdout}`);
      }
    });
  }
  
  return true;
}

module.exports = checkPaymentSystem;