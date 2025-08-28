import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import pv3IDL from './pv3.json';

// Solana network configuration
export const SOLANA_NETWORK = 'devnet';
export const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

// RPC endpoints
export const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};

// PV3 Program ID
export const PROGRAM_ID = new PublicKey('7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W');

// Session vault configuration
export const SESSION_VAULT_SEED = 'session';
export const CONFIG_SEED = 'config';

// Solana configuration for PV3 Gaming Platform
export const SOLANA_CONFIG = {
  // Network configuration
  RPC_URL: SOLANA_RPC_URL,
  COMMITMENT: 'confirmed' as const,
  
  // ✅ UPDATED: New deployed program ID with timestamp fix
  PROGRAM_ID: PROGRAM_ID,
  
  // ✅ VERIFIED: Platform wallets (matching contract initialization)
  TREASURY_WALLET: new PublicKey('59sK3SsSd76QkjzeN2ZmRUtEsC54e4mjdzmjmYPbZ7rN'),
  REFERRAL_WALLET: new PublicKey('GcH9Y4fM7cycgtNpiBFKCUXWqTjrtpAyuMQ3vupyRH69'),
  VERIFIER_WALLET: 'GnZr6UsC1HE6a5kAr8remPcDf3ArmWngoDFXiQzv3ies',
  
  // Admin wallets (for transparency)
  ADMIN_WALLETS: [
    'BA128mWgxnkxot8WXstYNfvXjnaSveEbg7zhwmy7gwj4',
    '5sqfWKUqrWdjt8sWoJzEM1RpF3cLs9EvXpBjYFRWpueL', 
    'CGSjjrNJrCAseUATBgkWBY59VGoYGqMQMakY8KMPyAa8'
  ],
  
  // Platform fees (matching contract)
  PLATFORM_FEE_BPS: 650, // 6.5%
  TREASURY_FEE_BPS: 550, // 5.5%
  REFERRAL_FEE_BPS: 100, // 1%
  
  // Game configuration
  MIN_WAGER: 0.1, // 0.1 SOL (matches smart contract requirement)
  MAX_WAGER: 10.0, // 10 SOL
  
  // Game types (for compatibility with existing code)
  GAME_TYPES: {
    COIN_FLIP: 'coin-flip',
    ROCK_PAPER_SCISSORS: 'rock-paper-scissors', 
    DICE_DUEL: 'dice-duel',
    CHESS_BLITZ: 'chess-blitz'
  },
  
  // Numeric game type constants (for legacy compatibility)
  GAME_TYPE_IDS: {
    COIN_FLIP: 1,
    ROCK_PAPER_SCISSORS: 2,
    DICE_DUEL: 3,
    CHESS_BLITZ: 5
  },
  
  // Fees object (for compatibility)
  FEES: {
    PLATFORM_FEE_BPS: 650,
    TREASURY_FEE_BPS: 550,
    REFERRAL_FEE_BPS: 100
  }
} as const;

// Connection instance
export const connection = new Connection(SOLANA_CONFIG.RPC_URL, SOLANA_CONFIG.COMMITMENT);

// PDA derivation helpers (matching smart contract seeds)
export const derivePDAs = {
  config: () => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      new PublicKey(SOLANA_CONFIG.PROGRAM_ID)
    );
  },
  
  sessionVault: (userPubkey: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('session'), userPubkey.toBuffer()],
      new PublicKey(SOLANA_CONFIG.PROGRAM_ID)
    );
  },
  
  // ✅ FIXED: Match PDA with timestamp (avoids race conditions)
  match: (creator: PublicKey, gameId: string, timestamp: number) => {
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(timestamp));
    
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('match'),
        creator.toBuffer(),
        Buffer.from(gameId),
        timestampBuffer
      ],
      new PublicKey(SOLANA_CONFIG.PROGRAM_ID)
    );
  },
  
  escrow: (matchPubkey: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), matchPubkey.toBuffer()],
      new PublicKey(SOLANA_CONFIG.PROGRAM_ID)
    );
  }
};

// Helper to create program instance
export const createProgramInstance = (provider: AnchorProvider) => {
  const programId = new PublicKey(SOLANA_CONFIG.PROGRAM_ID);
  
  // Force correct IDL metadata to prevent DeclaredProgramIdMismatch
  const correctedIDL = {
    ...pv3IDL,
    metadata: {
      address: programId.toString()
    }
  };
  
  return new Program(correctedIDL as any, programId, provider);
};

// Export the IDL
export const PV3_IDL = pv3IDL;

// Export PV3_CONFIG alias for compatibility
export const PV3_CONFIG = SOLANA_CONFIG;

// Utility functions
export const formatSOL = (lamports: number): string => {
  return (lamports / 1e9).toFixed(9);
};

export const parseSOL = (sol: string): number => {
  return parseFloat(sol) * 1e9;
};

export const generateMatchId = (): string => {
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const GAME_CONFIG = {
  CHESS: {
    TIME_CONTROL_SECONDS: 300, // 5 minutes
    INCREMENT_SECONDS: 0,
  },
  WAGERING: {
    MIN_WAGER: 0.1, // 0.1 SOL (matches smart contract requirement)
    MAX_WAGER: 10.0, // 10 SOL
    SUPPORTED_AMOUNTS: [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
  },
  TIMEOUTS: {
    MATCH_CREATION: 30000, // 30 seconds
    MOVE_TIMEOUT: 60000, // 1 minute
  },
}; 
