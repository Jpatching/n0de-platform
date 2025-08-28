const { Keypair, PublicKey } = require('@solana/web3.js');
const https = require('https');
const bs58 = require('bs58');
const nacl = require('tweetnacl');

// Bot private keys from Railway environment (now including bot 4 with correct key)
const BOT_PRIVATE_KEYS = {
  1: [0,208,93,110,7,28,73,114,232,124,112,29,36,241,28,3,79,162,223,30,7,124,60,198,15,175,145,233,30,213,52,127,19,184,72,97,75,142,40,25,11,108,98,196,97,191,234,50,110,18,171,154,47,90,50,69,1,8,244,46,15,183,120,16],
  2: [237,167,2,155,47,30,243,116,17,173,88,140,111,55,56,19,97,65,15,59,78,173,49,101,208,134,86,74,189,232,15,137,55,21,106,235,216,250,37,45,176,181,38,52,85,210,54,230,68,175,246,32,238,167,91,213,144,139,163,148,170,99,254,136],
  3: [227,204,132,61,90,204,55,97,133,25,117,91,249,137,91,157,104,66,114,62,143,135,242,179,63,206,141,91,132,151,218,233,40,181,110,170,194,74,144,230,196,86,92,222,134,103,99,102,239,2,208,159,107,55,173,25,103,196,5,213,215,202,170,20],
  4: [184,152,126,162,180,48,141,101,252,214,1,183,132,220,175,172,131,254,131,178,246,205,21,202,100,235,180,223,237,72,31,165,133,41,16,194,130,136,107,198,249,66,241,13,129,48,248,108,194,50,60,5,95,173,32,92,41,244,201,205,123,92,27,120],
  5: [159,59,11,3,232,144,57,113,119,197,7,42,210,210,45,195,186,171,209,112,60,76,118,13,27,107,19,134,95,112,72,215,87,184,2,118,127,231,96,16,68,155,171,30,210,216,90,162,218,68,156,239,61,188,225,136,58,143,161,227,133,78,229,238],
  6: [148,251,101,93,204,117,118,100,46,171,6,148,55,1,47,141,238,19,193,217,135,109,182,75,177,94,108,73,246,160,33,14,246,247,224,225,93,76,63,38,235,179,171,7,171,4,81,241,171,51,141,123,95,227,37,0,28,39,201,141,104,145,82,41]
};

const API_BASE = 'https://pv3-backend-api-production.up.railway.app/api/v1';
const DEPOSIT_AMOUNT = 0.3; // Deposit 0.3 SOL to each session vault

// Simple fetch replacement using native https
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          };
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function botSignInAndDeposit() {
  console.log('🤖 Bot sign-in and session vault deposit process...\n');
  
  for (const [botId, privateKeyArray] of Object.entries(BOT_PRIVATE_KEYS)) {
    try {
      console.log(`Processing Bot ${botId}...`);
      
      // Convert private key array to Keypair
      const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      const walletAddress = keypair.publicKey.toString();
      
      console.log(`  Wallet: ${walletAddress}`);
      
      // Step 1: Get auth message from backend
      console.log('  🔐 Getting auth message...');
      const authMessageResponse = await makeRequest(`${API_BASE}/auth/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: walletAddress
        })
      });
      
      if (!authMessageResponse.ok) {
        throw new Error(`Failed to get auth message: ${authMessageResponse.status}`);
      }
      
      const authData = await authMessageResponse.json();
      const message = authData.message;
      console.log(`  📝 Auth message: ${message}`);
      
      // Step 2: Sign the message
      console.log('  ✍️ Signing auth message...');
      const messageBytes = new TextEncoder().encode(message);
      const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signatureBase58 = bs58.encode(signature);
      
      // Extract timestamp from the message (backend embeds it)
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      const messageTimestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
      console.log(`  ⏰ Extracted timestamp: ${messageTimestamp}`);
      
      // Step 3: Authenticate with backend
      console.log('  🔓 Authenticating with backend...');
      const authResponse = await makeRequest(`${API_BASE}/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: walletAddress,
          signature: signatureBase58,
          message: message,
          timestamp: messageTimestamp // Include timestamp like frontend does
        })
      });
      
      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.status}`);
      }
      
      const authResult = await authResponse.json();
      const token = authResult.token;
      console.log(`  ✅ Authenticated! Token: ${token.substring(0, 20)}...`);
      
      // Step 4: Create session vault if needed
      console.log('  🏦 Creating session vault...');
      const createVaultResponse = await makeRequest(`${API_BASE}/auth/vault/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (createVaultResponse.ok) {
        const vaultResult = await createVaultResponse.json();
        console.log(`  ✅ Session vault: ${vaultResult.sessionVaultAddress}`);
      } else {
        console.log(`  ℹ️ Session vault already exists`);
      }
      
      // Step 5: Check current session vault balance
      console.log('  💰 Checking session vault balance...');
      const balanceResponse = await makeRequest(`${API_BASE}/matches/session-vault/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (balanceResponse.ok) {
        const balanceResult = await balanceResponse.json();
        console.log(`  💰 Current balance: ${balanceResult.balanceSOL} SOL`);
        
        if (balanceResult.balanceSOL >= DEPOSIT_AMOUNT) {
          console.log(`  ✅ Session vault already has sufficient balance`);
          continue;
        }
      }
      
      // Step 6: Deposit to session vault
      console.log(`  💸 Depositing ${DEPOSIT_AMOUNT} SOL to session vault...`);
      const depositResponse = await makeRequest(`${API_BASE}/matches/session-vault/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userWallet: walletAddress,
          amount: DEPOSIT_AMOUNT
        })
      });
      
      if (depositResponse.ok) {
        const depositResult = await depositResponse.json();
        console.log(`  ✅ Deposit successful! Transaction: ${depositResult.signature}`);
      } else {
        const errorText = await depositResponse.text();
        console.log(`  ❌ Deposit failed: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`❌ Error processing bot ${botId}: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 Summary:');
  console.log('- Bots have signed in and attempted to deposit to session vaults');
  console.log('- Check the backend logs to see if deposits were successful');
  console.log('- Bots should now be able to join matches');
}

botSignInAndDeposit().catch(console.error); 