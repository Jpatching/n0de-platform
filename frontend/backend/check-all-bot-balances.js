const { Keypair, PublicKey, Connection } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Read bot private keys from JSON files
function loadBotKeys() {
  const botKeys = {};
  for (let i = 1; i <= 6; i++) {
    try {
      const botFilePath = path.join(__dirname, '..', `bot${i}.json`);
      const botData = JSON.parse(fs.readFileSync(botFilePath, 'utf8'));
      botKeys[i] = botData;
    } catch (error) {
      console.log(`❌ Failed to load bot ${i}: ${error.message}`);
    }
  }
  return botKeys;
}

const PV3_PROGRAM_ID = '7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W';
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

async function checkAllBotBalances() {
  console.log('🔍 Checking all bot wallet and session vault balances...\n');
  
  const connection = new Connection(SOLANA_RPC_URL);
  const botKeys = loadBotKeys();
  
  if (Object.keys(botKeys).length === 0) {
    console.log('❌ No bot keys loaded. Exiting...');
    return;
  }
  
  console.log(`Found ${Object.keys(botKeys).length} bot wallets\n`);
  
  let totalWalletBalance = 0;
  let totalVaultBalance = 0;
  
  for (const [botId, privateKeyArray] of Object.entries(botKeys)) {
    try {
      console.log(`Bot ${botId}:`);
      
      // Convert private key array to Keypair
      const botKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      const botWallet = botKeypair.publicKey.toString();
      
      console.log(`  Wallet Address: ${botWallet}`);
      
      // Get wallet balance
      const walletBalance = await connection.getBalance(botKeypair.publicKey);
      const walletSOL = walletBalance / 1e9;
      console.log(`  Wallet Balance: ${walletSOL} SOL`);
      totalWalletBalance += walletSOL;
      
      // Calculate session vault PDA
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), botKeypair.publicKey.toBuffer()],
        new PublicKey(PV3_PROGRAM_ID)
      );
      
      console.log(`  Session Vault PDA: ${sessionVaultPDA.toString()}`);
      
      // Check session vault balance
      try {
        const vaultBalance = await connection.getBalance(sessionVaultPDA);
        const vaultSOL = vaultBalance / 1e9;
        console.log(`  Session Vault Balance: ${vaultSOL} SOL`);
        totalVaultBalance += vaultSOL;
        
        if (vaultBalance === 0) {
          console.log(`  ❌ Session vault has 0 balance`);
        } else {
          console.log(`  ✅ Session vault has balance`);
        }
      } catch (error) {
        console.log(`  ❌ Session vault does not exist (0 SOL)`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ Error checking bot ${botId}: ${error.message}\n`);
    }
  }
  
  console.log('📊 Summary:');
  console.log(`Total wallet balances: ${totalWalletBalance.toFixed(4)} SOL`);
  console.log(`Total session vault balances: ${totalVaultBalance.toFixed(4)} SOL`);
  console.log(`Grand total: ${(totalWalletBalance + totalVaultBalance).toFixed(4)} SOL`);
  
  if (totalVaultBalance === 0) {
    console.log('\n⚠️ No session vaults have balances. Run the funding script to add SOL.');
  } else {
    console.log('\n✅ Some session vaults have balances. Bots should be able to play matches.');
  }
}

// Run the script
checkAllBotBalances().catch(console.error); 