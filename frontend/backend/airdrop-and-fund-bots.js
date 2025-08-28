const { Keypair, PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
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
      console.log(`✅ Loaded bot ${i} private key`);
    } catch (error) {
      console.log(`❌ Failed to load bot ${i}: ${error.message}`);
    }
  }
  return botKeys;
}

const PV3_PROGRAM_ID = '7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W';
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const AIRDROP_AMOUNT = 5; // 5 SOL total airdrop
const DISTRIBUTION_AMOUNT = 0.8; // 0.8 SOL per bot (5 SOL / 6 bots = 0.83 SOL each, leaving some for fees)

async function airdropAndFundBots() {
  console.log('💰 Starting bot session vault funding process...\n');
  
  const connection = new Connection(SOLANA_RPC_URL);
  const botKeys = loadBotKeys();
  
  if (Object.keys(botKeys).length === 0) {
    console.log('❌ No bot keys loaded. Exiting...');
    return;
  }
  
  // Create a main funding wallet (we'll use bot1 as the main distributor)
  const mainKeypair = Keypair.fromSecretKey(new Uint8Array(botKeys[1]));
  const mainWallet = mainKeypair.publicKey.toString();
  
  console.log(`🏦 Main wallet (Bot 1): ${mainWallet}`);
  
  // Step 1: Airdrop SOL to main wallet
  console.log(`\n💸 Step 1: Airdropping ${AIRDROP_AMOUNT} SOL to main wallet...`);
  try {
    const airdropSignature = await connection.requestAirdrop(
      mainKeypair.publicKey,
      AIRDROP_AMOUNT * LAMPORTS_PER_SOL
    );
    
    console.log(`📝 Airdrop signature: ${airdropSignature}`);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
    
    const newBalance = await connection.getBalance(mainKeypair.publicKey);
    console.log(`✅ Main wallet balance after airdrop: ${newBalance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.log(`❌ Airdrop failed: ${error.message}`);
    console.log('⚠️ Continuing with existing balance...');
  }
  
  // Step 2: Check current balance
  const currentBalance = await connection.getBalance(mainKeypair.publicKey);
  console.log(`💰 Current main wallet balance: ${currentBalance / LAMPORTS_PER_SOL} SOL`);
  
  if (currentBalance < (DISTRIBUTION_AMOUNT * Object.keys(botKeys).length + 0.1) * LAMPORTS_PER_SOL) {
    console.log('❌ Insufficient balance to fund all bots. Please ensure you have enough SOL.');
    return;
  }
  
  // Step 3: Distribute to each bot's session vault
  console.log(`\n🎯 Step 2: Distributing ${DISTRIBUTION_AMOUNT} SOL to each bot session vault...\n`);
  
  for (const [botId, privateKeyArray] of Object.entries(botKeys)) {
    try {
      console.log(`Processing Bot ${botId}...`);
      
      // Convert private key array to Keypair
      const botKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      const botWallet = botKeypair.publicKey.toString();
      
      console.log(`  Bot ${botId} Wallet: ${botWallet}`);
      
      // Calculate session vault PDA
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), botKeypair.publicKey.toBuffer()],
        new PublicKey(PV3_PROGRAM_ID)
      );
      
      console.log(`  Session Vault PDA: ${sessionVaultPDA.toString()}`);
      
      // Check current session vault balance
      let currentVaultBalance = 0;
      try {
        currentVaultBalance = await connection.getBalance(sessionVaultPDA);
        console.log(`  Current Vault Balance: ${currentVaultBalance / LAMPORTS_PER_SOL} SOL`);
      } catch (error) {
        console.log(`  Session vault does not exist yet (0 SOL)`);
      }
      
      // Skip if already has sufficient balance
      if (currentVaultBalance >= DISTRIBUTION_AMOUNT * LAMPORTS_PER_SOL) {
        console.log(`  ✅ Session vault already has sufficient balance`);
        continue;
      }
      
      // Create transfer transaction from main wallet to session vault
      const transferAmount = Math.floor(DISTRIBUTION_AMOUNT * LAMPORTS_PER_SOL);
      console.log(`  💸 Transferring ${DISTRIBUTION_AMOUNT} SOL to session vault...`);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: mainKeypair.publicKey,
          toPubkey: sessionVaultPDA,
          lamports: transferAmount,
        })
      );
      
      // Send transaction
      const signature = await connection.sendTransaction(transaction, [mainKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      console.log(`  📝 Transaction signature: ${signature}`);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Check new balance
      const newVaultBalance = await connection.getBalance(sessionVaultPDA);
      console.log(`  ✅ New Vault Balance: ${newVaultBalance / LAMPORTS_PER_SOL} SOL`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error processing bot ${botId}: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Step 4: Summary
  console.log('🎯 Final Summary:');
  console.log(`- Airdropped ${AIRDROP_AMOUNT} SOL to main wallet`);
  console.log(`- Distributed ${DISTRIBUTION_AMOUNT} SOL to each bot session vault`);
  console.log('- All bots should now have funded session vaults');
  console.log('- Bots can now join matches using their session vault balances');
  
  // Check final balances
  console.log('\n📊 Final Balance Check:');
  const finalMainBalance = await connection.getBalance(mainKeypair.publicKey);
  console.log(`Main wallet remaining: ${finalMainBalance / LAMPORTS_PER_SOL} SOL`);
  
  for (const [botId, privateKeyArray] of Object.entries(botKeys)) {
    const botKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('session_vault'), botKeypair.publicKey.toBuffer()],
      new PublicKey(PV3_PROGRAM_ID)
    );
    
    try {
      const vaultBalance = await connection.getBalance(sessionVaultPDA);
      console.log(`Bot ${botId} session vault: ${vaultBalance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      console.log(`Bot ${botId} session vault: 0 SOL (not created)`);
    }
  }
}

// Run the script
airdropAndFundBots().catch(console.error); 