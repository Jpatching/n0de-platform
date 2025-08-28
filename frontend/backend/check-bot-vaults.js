const { Keypair, PublicKey, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');
const fetch = require('node-fetch');

// Bot private keys from Railway environment
const BOT_PRIVATE_KEYS = {
  1: [0,208,93,110,7,28,73,114,232,124,112,29,36,241,28,3,79,162,223,30,7,124,60,198,15,175,145,233,30,213,52,127,19,184,72,97,75,142,40,25,11,108,98,196,97,191,234,50,110,18,171,154,47,90,50,69,1,8,244,46,15,183,120,16],
  2: [237,167,2,155,47,30,243,116,17,173,88,140,111,55,56,19,97,65,15,59,78,173,49,101,208,134,86,74,189,232,15,137,55,21,106,235,216,250,37,45,176,181,38,52,85,210,54,230,68,175,246,32,238,167,91,213,144,139,163,148,170,99,254,136],
  3: [227,204,132,61,90,204,55,97,133,25,117,91,249,137,91,157,104,66,114,62,143,135,242,179,63,206,141,91,132,151,218,233,40,181,110,170,194,74,144,230,196,86,92,222,134,103,99,102,239,2,208,159,107,55,173,25,103,196,5,213,215,202,170,20],
  4: [8,176,58,37,217,216,37,232,246,152,106,41,57,139,75,25,129,188,39,66,90,202,127,19,171,104,114,196,125,89,168,65,217,46,251,239,95,142,70,27,27,109,31,61,177,176,228,117,154,174,29,193,117,213,10,211,16,224,71,6,160,94,78,92],
  5: [159,59,11,3,232,144,57,113,119,197,7,42,210,210,45,195,186,171,209,112,60,76,118,13,27,107,19,134,95,112,72,215,87,184,2,118,127,231,96,16,68,155,171,30,210,216,90,162,218,68,156,239,61,188,225,136,58,143,161,227,133,78,229,238],
  6: [148,251,101,93,204,117,118,100,46,171,6,148,55,1,47,141,238,19,193,217,135,109,182,75,177,94,108,73,246,160,33,14,246,247,224,225,93,76,63,38,235,179,171,7,171,4,81,241,171,51,141,123,95,227,37,0,28,39,201,141,104,145,82,41]
};

const PV3_PROGRAM_ID = '7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W';
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

async function checkBotVaults() {
  console.log('🤖 Checking bot wallet addresses and session vault balances...\n');
  
  const connection = new Connection(SOLANA_RPC_URL);
  
  for (const [botId, privateKeyArray] of Object.entries(BOT_PRIVATE_KEYS)) {
    try {
      // Convert private key array to Keypair
      const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      const walletAddress = keypair.publicKey.toString();
      
      console.log(`Bot ${botId}:`);
      console.log(`  Wallet: ${walletAddress}`);
      
      // Get wallet SOL balance
      const walletBalance = await connection.getBalance(keypair.publicKey);
      console.log(`  Wallet Balance: ${walletBalance / 1e9} SOL`);
      
      // Calculate session vault PDA
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), keypair.publicKey.toBuffer()],
        new PublicKey(PV3_PROGRAM_ID)
      );
      
      console.log(`  Session Vault PDA: ${sessionVaultPDA.toString()}`);
      
      // Check session vault balance
      try {
        const vaultBalance = await connection.getBalance(sessionVaultPDA);
        console.log(`  Session Vault Balance: ${vaultBalance / 1e9} SOL`);
        
        if (vaultBalance === 0) {
          console.log(`  ❌ Session vault exists but has 0 balance`);
        } else {
          console.log(`  ✅ Session vault has balance`);
        }
      } catch (error) {
        console.log(`  ❌ Session vault does not exist`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ Error checking bot ${botId}: ${error.message}\n`);
    }
  }
  
  // Check for any available matches
  console.log('🎮 Checking for available matches...');
  try {
    const response = await fetch('https://pv3-backend-api-production.up.railway.app/api/v1/matches/available');
    const matches = await response.json();
    console.log(`Found ${matches.length} available matches:`);
    matches.forEach(match => {
      console.log(`  - ${match.gameType} (${match.wager} SOL) - ID: ${match.id}`);
    });
  } catch (error) {
    console.log(`❌ Error fetching matches: ${error.message}`);
  }
}

checkBotVaults().catch(console.error); 