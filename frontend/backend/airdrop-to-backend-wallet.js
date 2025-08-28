const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
require('dotenv').config();

async function airdropToBackendWallet() {
  try {
    console.log('🚀 Airdropping SOL to backend wallet...');
    
    // Get the private key from environment variable (the wallet backend actually uses)
    const privateKeyArray = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    console.log('💰 Backend wallet address:', wallet.publicKey.toString());
    
    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Check current balance
    const currentBalance = await connection.getBalance(wallet.publicKey);
    console.log('🔍 Current balance:', currentBalance / LAMPORTS_PER_SOL, 'SOL');
    
    // Airdrop 5 SOL to the backend wallet
    const airdropAmount = 5 * LAMPORTS_PER_SOL;
    console.log('💸 Requesting airdrop of 5 SOL...');
    
    const airdropSignature = await connection.requestAirdrop(
      wallet.publicKey,
      airdropAmount
    );
    
    console.log('⏳ Airdrop signature:', airdropSignature);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for confirmation
    await connection.confirmTransaction(airdropSignature, 'confirmed');
    
    // Check new balance
    const newBalance = await connection.getBalance(wallet.publicKey);
    console.log('✅ New balance:', newBalance / LAMPORTS_PER_SOL, 'SOL');
    console.log('🎉 Airdrop successful!');
    
    console.log('\n🔧 Backend wallet is now funded and ready for match creation!');
    
  } catch (error) {
    console.error('❌ Airdrop failed:', error.message);
    
    if (error.message.includes('airdrop request limit')) {
      console.log('\n💡 Airdrop limit reached. Try again in a few minutes or use a different wallet for funding.');
    }
  }
}

airdropToBackendWallet(); 