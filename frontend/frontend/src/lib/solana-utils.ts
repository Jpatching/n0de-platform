import { Keypair, PublicKey } from '@solana/web3.js';

/**
 * Generate a new Solana wallet keypair
 * Used for creating wallets for email/authenticator users
 */
export function generateWallet(): string {
  try {
    const keypair = Keypair.generate();
    console.log('🔑 Generated wallet:', keypair.publicKey.toString().substring(0, 8) + '...');
    
    // TODO: In production, you might want to:
    // 1. Encrypt and store the private key securely
    // 2. Allow users to export/import their wallet
    // 3. Implement wallet recovery mechanisms
    
    return keypair.publicKey.toString();
  } catch (error: any) {
    console.error('❌ Wallet generation error:', error);
    throw new Error('Failed to generate wallet');
  }
}

/**
 * Derive PDA vault address for a given wallet
 * This ensures consistent vault addresses across the application
 * 
 * @param walletAddress - The user's wallet address
 * @param programId - The program ID (optional, defaults to system program for testing)
 * @returns The PDA vault address
 */
export async function derivePDAVault(
  walletAddress: string, 
  programId?: string
): Promise<string> {
  try {
    // Convert wallet address to PublicKey
    const userPubkey = new PublicKey(walletAddress);
    
    // Use provided program ID or default to system program
    const program = new PublicKey(
      programId || '11111111111111111111111111111112' // System program for testing
    );
    
    // Derive PDA with the same seeds used throughout the application
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('session'),
        userPubkey.toBuffer()
      ],
      program
    );
    
    return pda.toString();
  } catch (error: any) {
    console.error('❌ PDA derivation error:', error);
    throw new Error('Failed to derive PDA vault');
  }
}

/**
 * Validate that a string is a valid Solana public key
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the PDA vault for the current user
 * This is the main function used by the application
 */
export async function getUserPDAVault(
  walletAddress: string,
  programId?: string
): Promise<{
  vault: string;
  isValid: boolean;
  error?: string;
}> {
  try {
    if (!isValidSolanaAddress(walletAddress)) {
      return {
        vault: '',
        isValid: false,
        error: 'Invalid wallet address'
      };
    }

    const vault = await derivePDAVault(walletAddress, programId);
    
    return {
      vault,
      isValid: true
    };
  } catch (error: any) {
    return {
      vault: '',
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Test wallet generation and PDA consistency
 * Used for development and testing
 */
export async function testWalletSystem(): Promise<{
  success: boolean;
  results: {
    walletGeneration: boolean;
    pdaConsistency: boolean;
    differentWallets: boolean;
    differentVaults: boolean;
  };
  details: any;
}> {
  try {
    // Test wallet generation
    const wallet1 = generateWallet();
    const wallet2 = generateWallet();
    
    // Test PDA vault derivation
    const vault1 = await derivePDAVault(wallet1);
    const vault2 = await derivePDAVault(wallet2);
    
    // Test consistency - same wallet should always produce same PDA
    const vault1Again = await derivePDAVault(wallet1);
    
    const results = {
      walletGeneration: !!(wallet1 && wallet2),
      pdaConsistency: vault1 === vault1Again,
      differentWallets: wallet1 !== wallet2,
      differentVaults: vault1 !== vault2
    };
    
    return {
      success: Object.values(results).every(Boolean),
      results,
      details: {
        wallet1: wallet1.substring(0, 8) + '...',
        wallet2: wallet2.substring(0, 8) + '...',
        vault1: vault1.substring(0, 8) + '...',
        vault2: vault2.substring(0, 8) + '...',
        vault1Again: vault1Again.substring(0, 8) + '...'
      }
    };
  } catch (error: any) {
    return {
      success: false,
      results: {
        walletGeneration: false,
        pdaConsistency: false,
        differentWallets: false,
        differentVaults: false
      },
      details: { error: error.message }
    };
  }
} 