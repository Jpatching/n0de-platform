import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction, TransactionInstruction, Ed25519Program, ComputeBudgetProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import * as nacl from 'tweetnacl';
import { createHash } from 'crypto';
import pv3IDL from './pv3.json';

// Fallback BN import
const BN_FALLBACK = anchor.BN;

interface EscrowAccount {
  matchId: string;
  creator: PublicKey;
  joiner?: PublicKey;
  wagerAmount: number;
  status: string;
  createdAt: number;
}

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private connection: Connection;
  private program: Program<any>;
  private wallet: Wallet;
  private provider: AnchorProvider;
  private readonly PROGRAM_ID = new PublicKey(process.env.PV3_PROGRAM_ID || '7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W');
  private readonly treasuryWallet: PublicKey;
  private readonly referralWallet: PublicKey;
  private verifierWallet: anchor.Wallet;

  constructor() {
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // DETAILED LOGGING FOR DEBUGGING
    this.logger.log(`🚀 SolanaService Constructor Starting`);
    this.logger.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    this.logger.log(`🔑 PV3_PROGRAM_ID env var: ${process.env.PV3_PROGRAM_ID || 'NOT SET'}`);
          this.logger.log(`🎯 Fallback Program ID: 7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W`);
    this.logger.log(`📍 Final PROGRAM_ID: ${this.PROGRAM_ID.toString()}`);
    
    // Load treasury wallet (verifier/backend signer) from environment
    let secretKeyArray: number[];
    
    if (process.env.SOLANA_PRIVATE_KEY) {
      try {
        // Parse the environment variable
        const envKey = process.env.SOLANA_PRIVATE_KEY;
        this.logger.log(`🔑 SOLANA_PRIVATE_KEY env var found: ${envKey.substring(0, 50)}...`);
        this.logger.log(`🔑 SOLANA_PRIVATE_KEY length: ${envKey.length}`);
        this.logger.log(`🔑 SOLANA_PRIVATE_KEY starts with '[': ${envKey.startsWith('[')}`);
        this.logger.log(`🔑 SOLANA_PRIVATE_KEY ends with ']': ${envKey.endsWith(']')}`);
        
        if (envKey.startsWith('[') && envKey.endsWith(']')) {
          // Array format
          try {
            secretKeyArray = JSON.parse(envKey);
            this.logger.log(`📊 Parsed array format, length: ${secretKeyArray.length}`);
            
            // Validate the array
            if (!Array.isArray(secretKeyArray)) {
              throw new Error('Parsed value is not an array');
            }
            
            if (secretKeyArray.length !== 64) {
              throw new Error(`Expected 64 bytes, got ${secretKeyArray.length}`);
            }
            
            // Validate all elements are numbers
            for (let i = 0; i < secretKeyArray.length; i++) {
              if (typeof secretKeyArray[i] !== 'number' || secretKeyArray[i] < 0 || secretKeyArray[i] > 255) {
                throw new Error(`Invalid byte at index ${i}: ${secretKeyArray[i]}`);
              }
            }
            
            this.logger.log(`✅ Array validation passed`);
          } catch (parseError) {
            this.logger.error(`❌ JSON parse error: ${parseError.message}`);
            throw new Error(`Failed to parse array format: ${parseError.message}`);
          }
        } else if (envKey.endsWith(']') && !envKey.startsWith('[')) {
          // Railway truncation case: missing opening bracket
          this.logger.log(`🔧 Detected Railway truncation - adding missing opening bracket`);
          try {
            const fixedEnvKey = '[' + envKey;
            secretKeyArray = JSON.parse(fixedEnvKey);
            this.logger.log(`📊 Parsed fixed array format, length: ${secretKeyArray.length}`);
            
            // Validate the array
            if (!Array.isArray(secretKeyArray)) {
              throw new Error('Parsed value is not an array');
            }
            
            if (secretKeyArray.length !== 64) {
              throw new Error(`Expected 64 bytes, got ${secretKeyArray.length}`);
            }
            
            // Validate all elements are numbers
            for (let i = 0; i < secretKeyArray.length; i++) {
              if (typeof secretKeyArray[i] !== 'number' || secretKeyArray[i] < 0 || secretKeyArray[i] > 255) {
                throw new Error(`Invalid byte at index ${i}: ${secretKeyArray[i]}`);
              }
            }
            
            this.logger.log(`✅ Fixed array validation passed`);
          } catch (parseError) {
            this.logger.error(`❌ Fixed JSON parse error: ${parseError.message}`);
            throw new Error(`Failed to parse fixed array format: ${parseError.message}`);
          }
        } else {
          // Base58 format
          try {
            const keypair = Keypair.fromSecretKey(
              new Uint8Array(Buffer.from(envKey, 'base64'))
            );
            secretKeyArray = Array.from(keypair.secretKey);
            this.logger.log(`📊 Parsed base58 format, converted to array`);
          } catch (base58Error) {
            this.logger.error(`❌ Base58 parse error: ${base58Error.message}`);
            throw new Error(`Failed to parse base58 format: ${base58Error.message}`);
          }
        }
      } catch (error) {
        this.logger.error(`❌ Failed to parse SOLANA_PRIVATE_KEY: ${error.message}`);
        this.logger.error(`❌ Full error: ${error.stack}`);
        throw new Error(`Invalid SOLANA_PRIVATE_KEY format: ${error.message}`);
      }
    } else {
      this.logger.error(`❌ SOLANA_PRIVATE_KEY environment variable not set!`);
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
    }
    
    const secretKey = new Uint8Array(secretKeyArray);
    this.wallet = new Wallet(Keypair.fromSecretKey(secretKey));
    
    this.logger.log(`💼 Backend wallet public key: ${this.wallet.publicKey.toString()}`);
    this.logger.log(`🔐 Backend wallet secret key length: ${secretKeyArray.length}`);
    
    this.provider = new AnchorProvider(
      this.connection,
      this.wallet,
      { commitment: 'confirmed' }
    );
    
    this.treasuryWallet = new PublicKey('59sK3SsSd76QkjzeN2ZmRUtEsC54e4mjdzmjmYPbZ7rN');
    this.referralWallet = new PublicKey('GcH9Y4fM7cycgtNpiBFKCUXWqTjrtpAyuMQ3vupyRH69');
    
    this.logger.log(`🏦 Treasury wallet: ${this.treasuryWallet.toString()}`);
    this.logger.log(`🎁 Referral wallet: ${this.referralWallet.toString()}`);
    
    this.initializeProgram();
  }

  private initializeProgram() {
    // Setup provider globally
    anchor.setProvider(this.provider);

    // FORCE the correct program ID - bypass all IDL metadata checks
    try {
      // Log what we're trying to use
      this.logger.log(`🔧 Forcing Program ID: ${this.PROGRAM_ID.toString()}`);
      this.logger.log(`📊 Environment PV3_PROGRAM_ID: ${process.env.PV3_PROGRAM_ID || 'NOT SET'}`);
      
      // Create a completely clean IDL with forced metadata
      const cleanIDL = JSON.parse(JSON.stringify(pv3IDL)); // Deep clone
      cleanIDL.metadata = {
        address: this.PROGRAM_ID.toString()
      };
      
      // Force program creation with explicit program ID
      this.program = new Program(cleanIDL as any, this.PROGRAM_ID, this.provider);
      
      this.logger.log(`✅ PV3 Program FORCE initialized`);
      this.logger.log(`📋 Program ID used: ${this.program.programId.toString()}`);
      this.logger.log(`📋 IDL metadata: ${cleanIDL.metadata.address}`);
      
      // Verify the program ID matches
      if (this.program.programId.toString() !== this.PROGRAM_ID.toString()) {
        throw new Error(`Program ID mismatch: expected ${this.PROGRAM_ID.toString()}, got ${this.program.programId.toString()}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Failed to initialize program: ${error.message}`);
      this.logger.error(`❌ Stack trace: ${error.stack}`);
      
      // Try alternative initialization without IDL metadata
      try {
        this.logger.log(`🔄 Attempting alternative initialization...`);
        const minimalIDL = {
          ...pv3IDL,
          metadata: undefined // Remove metadata entirely
        };
        this.program = new Program(minimalIDL as any, this.PROGRAM_ID, this.provider);
        this.logger.log(`✅ Alternative initialization successful`);
      } catch (altError) {
        this.logger.error(`❌ Alternative initialization also failed: ${altError.message}`);
        throw new Error(`All program initialization methods failed: ${error.message}`);
      }
    }
  }

  /**
   * Check and initialize the smart contract if needed
   */
  async initializeContractIfNeeded(): Promise<void> {
    try {
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );

      // Check if contract is initialized
      try {
        await this.program.account.platformConfig.fetch(configPDA);
        this.logger.log(`✅ Contract already initialized`);
      } catch (error) {
        if (error.message.includes('Account does not exist')) {
          this.logger.log(`🔧 Initializing smart contract...`);
          
          // ✅ FIXED: Initialize the simplified contract with only 3 parameters
          const tx = await this.program.methods
            .initialize(
              this.treasuryWallet,    // treasury
              this.referralWallet,    // referral_pool  
              this.wallet.publicKey   // verifier_pubkey
            )
            .accounts({
              config: configPDA,
              payer: this.wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
          
          this.logger.log(`✅ Contract initialized successfully: ${tx}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to initialize contract: ${error.message}`);
      throw new Error(`Contract initialization failed: ${error.message}`);
    }
  }

  /**
   * Check session vault exists with sufficient balance - NO AUTO-DEPOSIT
   */
  async ensureSessionVault(userWallet: string, requiredAmount: number): Promise<string> {
    // First ensure contract is initialized
    await this.initializeContractIfNeeded();
    
    const creator = new PublicKey(userWallet);
    
    const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('session_vault'), creator.toBuffer()],
      this.PROGRAM_ID
    );

    this.logger.log(`🔍 Session vault PDA: ${sessionVaultPDA.toString()}`);

    // Calculate transaction fees (rent for match account + escrow account + transaction fee)
    const MATCH_ACCOUNT_RENT = 2_500_000; // ~0.0025 SOL for match account rent
    const ESCROW_ACCOUNT_RENT = 890_880;   // ~0.0009 SOL for escrow account rent  
    const TRANSACTION_FEE = 10_000;        // ~0.00001 SOL for transaction fee
    const TOTAL_FEES = MATCH_ACCOUNT_RENT + ESCROW_ACCOUNT_RENT + TRANSACTION_FEE;
    
    // Total amount needed = wager + fees (user pays their own fees)
    const totalRequired = requiredAmount + TOTAL_FEES;
    
    this.logger.log(`💰 Wager: ${requiredAmount / LAMPORTS_PER_SOL} SOL`);
    this.logger.log(`💸 Fees: ${TOTAL_FEES / LAMPORTS_PER_SOL} SOL`);
    this.logger.log(`💎 Total required: ${totalRequired / LAMPORTS_PER_SOL} SOL`);

    try {
      // Try to fetch existing session vault
      const sessionVaultAccount = await this.program.account.sessionVault.fetch(sessionVaultPDA) as any;
      this.logger.log(`✅ Session vault exists with balance: ${sessionVaultAccount.balance / LAMPORTS_PER_SOL} SOL`);
      
      // Check if sufficient balance (including fees)
      if (sessionVaultAccount.balance >= totalRequired) {
        return sessionVaultPDA.toString();
      } else {
        // Insufficient balance - throw error instead of auto-depositing
        const shortfall = totalRequired - sessionVaultAccount.balance;
        this.logger.error(`❌ Insufficient session vault balance. Need ${shortfall / LAMPORTS_PER_SOL} SOL more`);
        throw new BadRequestException(
          `Insufficient session vault balance. You have ${sessionVaultAccount.balance / LAMPORTS_PER_SOL} SOL but need ${totalRequired / LAMPORTS_PER_SOL} SOL. Please deposit ${shortfall / LAMPORTS_PER_SOL} SOL to your session vault.`
        );
      }
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        // Session vault doesn't exist - user needs to create and fund it
        this.logger.error(`❌ Session vault does not exist for ${userWallet}`);
        throw new BadRequestException(
          `Session vault does not exist. Please create and fund your session vault with at least ${totalRequired / LAMPORTS_PER_SOL} SOL before creating matches.`
        );
      } else if (error instanceof BadRequestException) {
        throw error; // Re-throw our custom insufficient balance error
      } else {
        this.logger.error(`❌ Error checking session vault: ${error.message}`);
        throw new BadRequestException(`Failed to check session vault: ${error.message}`);
      }
    }
  }

  /**
   * Create deposit transaction manually - COMPLETELY AVOID ANCHOR BACKEND WALLET
   */
  async createDepositTransaction(userWallet: string, amount: number): Promise<{ transaction: string; message: string }> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      // Add input validation and logging
      this.logger.log(`🔍 Creating deposit transaction - userWallet: ${userWallet}, amount: ${amount}`);
      
      if (!userWallet || typeof userWallet !== 'string') {
        throw new BadRequestException(`Invalid userWallet: ${userWallet}`);
      }
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new BadRequestException(`Invalid amount: ${amount}`);
      }

      const user = new PublicKey(userWallet);
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), user.toBuffer()],
        this.PROGRAM_ID
      );

      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      this.logger.log(`💰 Amount in lamports: ${amountLamports}`);

      // Check if session vault exists
      let vaultExists = false;
      try {
        await this.program.account.sessionVault.fetch(sessionVaultPDA);
        vaultExists = true;
      } catch (error) {
        if (error.message.includes('Account does not exist')) {
          vaultExists = false;
        } else {
          throw error;
        }
      }

      let tx;

      // Create BN instance with better error handling
      let amountBN;
      try {
        amountBN = new BN(amountLamports);
        this.logger.log(`✅ BN created successfully: ${amountBN.toString()}`);
      } catch (bnError) {
        this.logger.error(`❌ Failed to create BN: ${bnError.message}`);
        // Try fallback
        try {
          amountBN = new BN_FALLBACK(amountLamports);
          this.logger.log(`✅ BN_FALLBACK created successfully: ${amountBN.toString()}`);
        } catch (fallbackError) {
          this.logger.error(`❌ BN_FALLBACK also failed: ${fallbackError.message}`);
          throw new BadRequestException(`Failed to create BigNumber: ${bnError.message}`);
        }
      }

      if (!vaultExists) {
        // First deposit - create vault and deposit in one transaction
        this.logger.log(`🔧 Creating session vault and depositing ${amount} SOL (user pays everything)`);
        
        // Create session vault first
          const createTx = await this.program.methods
            .createSessionVault(new BN(20_000_000)) // 0.02 SOL infrastructure prepayment
            .accounts({
              sessionVault: sessionVaultPDA,
              user: user,
              systemProgram: SystemProgram.programId,
            })
          .transaction();

        // Then deposit to it
        const depositTx = await this.program.methods
          .depositToSession(amountBN)
          .accounts({
            user: user,
            sessionVault: sessionVaultPDA,
            sessionVaultAccount: sessionVaultPDA,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Combine both transactions
        tx = new Transaction();
        tx.add(...createTx.instructions);
        tx.add(...depositTx.instructions);
        
      } else {
        // Vault exists - just deposit
        this.logger.log(`💰 Adding ${amount} SOL to existing session vault`);
        
        tx = await this.program.methods
          .depositToSession(amountBN)
        .accounts({
          user: user,
          sessionVault: sessionVaultPDA,
          sessionVaultAccount: sessionVaultPDA,
          systemProgram: SystemProgram.programId,
        })
          .transaction();
      }

      // Get recent blockhash and set user as fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = user; // ✅ USER PAYS TRANSACTION FEE

      // Serialize transaction for frontend
      const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64');

      const message = vaultExists 
        ? `Deposit ${amount} SOL to your session vault`
        : `Create session vault and deposit ${amount} SOL (you pay all costs)`;

      this.logger.log(`✅ Created deposit transaction: ${amount} SOL from ${user.toString()} to session vault`);
      this.logger.log(`🔧 Vault exists: ${vaultExists}`);

      return {
        transaction: serializedTx,
        message: message
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create deposit transaction: ${error.message}`);
      this.logger.error(`❌ Stack trace: ${error.stack}`);
      throw new BadRequestException(`Failed to create deposit transaction: ${error.message}`);
    }
  }

  /**
   * Map match ID prefix or game type string to smart contract GameType enum
   */
  private mapGameTypeToEnum(input: string): any {
    // ✅ COMPLETE MAPPING: All 27 game types from smart contract
    
    // Turn-based games
    if (input === 'chess') return { chess: {} };
    if (input === 'dice-roll' || input === 'diceroll') return { diceRoll: {} };
    if (input === 'rock-paper-scissors' || input === 'rps') return { rockPaperScissors: {} };
    if (input === 'coin-flip' || input === 'coinflip') return { coinFlip: {} };
    
    // Unity WebGL Games
    if (input === 'unity-racing') return { unityRacing: {} };
    if (input === 'unity-fighting') return { unityFighting: {} };
    if (input === 'unity-strategy') return { unityStrategy: {} };
    if (input === 'unity-sports') return { unitySports: {} };
    if (input === 'unity-puzzle') return { unityPuzzle: {} };
    
    // HTML5 WebSocket Games
    if (input === 'sports-heads') return { sportsHeads: {} };
    if (input === 'racing') return { racing: {} };
    if (input === 'fighting') return { fighting: {} };
    if (input === 'platformer-battle') return { platformerBattle: {} };
    if (input === 'bubble-shooter') return { bubbleShooter: {} };
    if (input === 'snake') return { snake: {} };
    if (input === 'tetris') return { tetris: {} };
    if (input === 'breakout') return { breakout: {} };
    
    // Quick Decision Games
    if (input === 'crash') return { crash: {} };
    if (input === 'mines') return { mines: {} };
    if (input === 'reaction-ring') return { reactionRing: {} };
    if (input === 'mind-stab') return { mindStab: {} };
    if (input === 'mirror-move') return { mirrorMove: {} };
    if (input === 'hi-lo') return { hiLo: {} };
    
    // Strategy/Logic Games
    if (input === 'connect4') return { connect4: {} };
    if (input === 'high-card-duel') return { highCardDuel: {} };
    if (input === 'math-duel') return { mathDuel: {} };
    if (input === 'dice-duel') return { diceDuel: {} };
    
    // If it's a match ID, extract prefix and map
    if (input.length > 3) {
      const prefix = input.substring(0, 3);
    switch (prefix) {
      case 'chs': return { chess: {} };
      case 'dic': return { diceRoll: {} };
        case 'rps': return { rockPaperScissors: {} };
        case 'cnf': return { coinFlip: {} };
        case 'ura': return { unityRacing: {} };
        case 'ufg': return { unityFighting: {} };
        case 'ust': return { unityStrategy: {} };
        case 'usp': return { unitySports: {} };
        case 'upz': return { unityPuzzle: {} };
        case 'sph': return { sportsHeads: {} };
        case 'rac': return { racing: {} };
        case 'fgt': return { fighting: {} };
        case 'plb': return { platformerBattle: {} };
        case 'bbs': return { bubbleShooter: {} };
        case 'snk': return { snake: {} };
        case 'tet': return { tetris: {} };
        case 'brk': return { breakout: {} };
        case 'cra': return { crash: {} };
        case 'min': return { mines: {} };
        case 'rrg': return { reactionRing: {} };
        case 'mst': return { mindStab: {} };
        case 'mmv': return { mirrorMove: {} };
        case 'hlo': return { hiLo: {} };
        case 'c4': return { connect4: {} };
        case 'hcd': return { highCardDuel: {} };
        case 'mtd': return { mathDuel: {} };
        case 'dcd': return { diceDuel: {} };
    }
    }
    
    // Default fallback
    return { chess: {} };
  }

  /**
   * Get the byte value for game type enum (matches smart contract enum order)
   */
  private getGameTypeByteValue(gameTypeEnum: any): number {
    // ✅ FIXED: Based on smart contract GameType enum order (EXACT MATCH):
    // Chess = 0, DiceRoll = 1, RockPaperScissors = 2, CoinFlip = 3, 
    // UnityRacing = 4, UnityFighting = 5, UnityStrategy = 6, UnitySports = 7, UnityPuzzle = 8,
    // SportsHeads = 9, Racing = 10, Fighting = 11, PlatformerBattle = 12,
    // BubbleShooter = 13, Snake = 14, Tetris = 15, Breakout = 16,
    // Crash = 17, Mines = 18, ReactionRing = 19, MindStab = 20, MirrorMove = 21, HiLo = 22,
    // Connect4 = 23, HighCardDuel = 24, MathDuel = 25, DiceDuel = 26
    if (gameTypeEnum.chess) return 0;
    if (gameTypeEnum.diceRoll) return 1;
    if (gameTypeEnum.rockPaperScissors) return 2;
    if (gameTypeEnum.coinFlip) return 3;
    if (gameTypeEnum.unityRacing) return 4;
    if (gameTypeEnum.unityFighting) return 5;
    if (gameTypeEnum.unityStrategy) return 6;
    if (gameTypeEnum.unitySports) return 7;
    if (gameTypeEnum.unityPuzzle) return 8;
    if (gameTypeEnum.sportsHeads) return 9;
    if (gameTypeEnum.racing) return 10;
    if (gameTypeEnum.fighting) return 11;
    if (gameTypeEnum.platformerBattle) return 12;
    if (gameTypeEnum.bubbleShooter) return 13;
    if (gameTypeEnum.snake) return 14;
    if (gameTypeEnum.tetris) return 15;
    if (gameTypeEnum.breakout) return 16;
    if (gameTypeEnum.crash) return 17;
    if (gameTypeEnum.mines) return 18;
    if (gameTypeEnum.reactionRing) return 19;
    if (gameTypeEnum.mindStab) return 20;
    if (gameTypeEnum.mirrorMove) return 21;
    if (gameTypeEnum.hiLo) return 22;
    if (gameTypeEnum.connect4) return 23;
    if (gameTypeEnum.highCardDuel) return 24;
    if (gameTypeEnum.mathDuel) return 25;
    if (gameTypeEnum.diceDuel) return 26;
    return 0; // Default to Chess
  }

  /**
   * Create match using session vault - FRICTIONLESS GAMING
   */
  async createMatchWithSessionVault(matchId: string, playerWallet: string, wager: number): Promise<string> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      this.logger.log(`🚀 Creating match with session vault - matchId: ${matchId}, playerWallet: ${playerWallet}, wager: ${wager}`);
      
      const creator = new PublicKey(playerWallet);
      const wagerLamports = Math.floor(wager * LAMPORTS_PER_SOL);
      const timestamp = Math.floor(Date.now() / 1000);
      const timestampBuffer = Buffer.alloc(8);
      timestampBuffer.writeBigInt64LE(BigInt(timestamp));

      const gameTypeForPDA = this.mapGameTypeToEnum(matchId);
      const gameTypeByte = this.getGameTypeByteValue(gameTypeForPDA);
      
      // Derive PDAs
      const [matchPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('match'), creator.toBuffer(), Buffer.from([gameTypeByte]), timestampBuffer],
        this.PROGRAM_ID
      );

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), matchPDA.toBuffer()],
        this.PROGRAM_ID
      );

      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );

      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), creator.toBuffer()],
        this.PROGRAM_ID
      );

      // Calculate expiry time (1 hour from now)
      const expiryTime = Math.floor(Date.now() / 1000) + 3600;

      // 🚀 OPTIMIZED: Build transaction with priority fees and better timeout handling
      const transaction = await this.program.methods
        .createMatchWithSession(
          gameTypeForPDA,
          new BN(wagerLamports),
          new BN(expiryTime),
          new BN(timestamp)
        )
        .accounts({
          matchAccount: matchPDA,
          matchEscrow: escrowPDA,
          config: configPDA,
          creator: creator,
          sessionVault: sessionVaultPDA,
          sessionVaultAccount: sessionVaultPDA,
          verifier: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.wallet.payer])
        .transaction();

      // 🚀 Add priority fee to ensure faster processing
      const computeUnitPrice = 1000; // Micro-lamports per compute unit
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeUnitPrice,
      });
      transaction.instructions.unshift(priorityFeeIx);

      // 🚀 Send transaction with extended timeout and retry logic
      let retries = 3;
      let lastError: Error;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          this.logger.log(`⏳ Sending transaction (attempt ${attempt}/${retries})...`);
          
          const txSignature = await this.connection.sendTransaction(transaction, [this.wallet.payer], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
          });

          this.logger.log(`📡 Transaction submitted: ${txSignature}`);

          // 🚀 Wait for confirmation with extended timeout (60 seconds)
          const confirmation = await this.connection.confirmTransaction({
            signature: txSignature,
            blockhash: transaction.recentBlockhash!,
            lastValidBlockHeight: transaction.lastValidBlockHeight!,
          }, 'confirmed');

          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          this.logger.log(`✅ Match created with session vault: ${txSignature}`);
          return escrowPDA.toString();

        } catch (error) {
          lastError = error;
          this.logger.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
          
          if (attempt < retries) {
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      throw lastError;

    } catch (error) {
      this.logger.error(`❌ Failed to create match with session vault: ${error.message}`);
      throw new BadRequestException(`Failed to create match: ${error.message}`);
    }
  }

  /**
   * Join match using session vault - FRICTIONLESS GAMING
   */
  async joinMatchWithSessionVault(escrowAddress: string, playerWallet: string): Promise<string> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      this.logger.log(`🚀 Joining match with session vault - escrow: ${escrowAddress}, player: ${playerWallet}`);
      
      const joiner = new PublicKey(playerWallet);
      const escrowPDA = new PublicKey(escrowAddress);
      
      // Find match PDA from escrow - CORRECTED METHOD
      let matchPDA: PublicKey;
      try {
        const allMatches = await this.program.account.match.all();
        const targetMatch = allMatches.find(match => {
          const [derivedEscrow] = PublicKey.findProgramAddressSync(
            [Buffer.from('escrow'), match.publicKey.toBuffer()],
            this.PROGRAM_ID
          );
          return derivedEscrow.equals(escrowPDA);
        });
        
        if (!targetMatch) {
          throw new Error(`Match not found for escrow ${escrowAddress}`);
        }
        
        matchPDA = targetMatch.publicKey;
        this.logger.log(`✅ Found match PDA: ${matchPDA.toString()}`);
      } catch (error) {
        this.logger.error(`❌ Failed to find match account: ${error.message}`);
        throw new Error(`Could not find match account for escrow ${escrowAddress}`);
      }

      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), joiner.toBuffer()],
        this.PROGRAM_ID
      );

      // 🚀 OPTIMIZED: Build transaction with priority fees and better timeout handling
      const transaction = await this.program.methods
        .joinMatchWithSession()
        .accounts({
          matchAccount: matchPDA,
          matchEscrow: escrowPDA,
          joiner: joiner,
          sessionVault: sessionVaultPDA,
          sessionVaultAccount: sessionVaultPDA,
          verifier: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.wallet.payer])
        .transaction();

      // 🚀 Add priority fee to ensure faster processing
      const computeUnitPrice = 1000; // Micro-lamports per compute unit
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeUnitPrice,
      });
      transaction.instructions.unshift(priorityFeeIx);

      // 🚀 Send transaction with extended timeout and retry logic
      let retries = 3;
      let lastError: Error;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          this.logger.log(`⏳ Sending join transaction (attempt ${attempt}/${retries})...`);
          
          const txSignature = await this.connection.sendTransaction(transaction, [this.wallet.payer], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
          });

          this.logger.log(`📡 Join transaction submitted: ${txSignature}`);

          // 🚀 Wait for confirmation with extended timeout (60 seconds)
          const confirmation = await this.connection.confirmTransaction({
            signature: txSignature,
            blockhash: transaction.recentBlockhash!,
            lastValidBlockHeight: transaction.lastValidBlockHeight!,
          }, 'confirmed');

          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          this.logger.log(`✅ Match joined with session vault: ${txSignature}`);
          return txSignature;

        } catch (error) {
          lastError = error;
          this.logger.warn(`⚠️ Join attempt ${attempt} failed: ${error.message}`);
          
          if (attempt < retries) {
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      throw lastError;

    } catch (error) {
      this.logger.error(`❌ Failed to join match with session vault: ${error.message}`);
      throw new BadRequestException(`Failed to join match: ${error.message}`);
    }
  }

  /**
   * Create match escrow using smart contract - LEGACY DIRECT WALLET METHOD
   */
  async createMatchEscrow(matchId: string, playerWallet: string, wager: number): Promise<string> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      this.logger.log(`🚀 Creating match - matchId: ${matchId}, playerWallet: ${playerWallet}, wager: ${wager}`);
      
      // Validate inputs
      if (!playerWallet || typeof playerWallet !== 'string') {
        throw new Error(`Invalid playerWallet: ${playerWallet}`);
      }
      
      if (!wager || typeof wager !== 'number' || wager <= 0) {
        throw new Error(`Invalid wager: ${wager}`);
      }
      
      if (!matchId || typeof matchId !== 'string') {
        throw new Error(`Invalid matchId: ${matchId}`);
      }

      const creator = new PublicKey(playerWallet);
      const wagerLamports = Math.floor(wager * LAMPORTS_PER_SOL);
      
      // Calculate timestamp for deterministic PDA derivation
      const timestamp = Math.floor(Date.now() / 1000);
      const timestampBuffer = Buffer.alloc(8);
      timestampBuffer.writeBigInt64LE(BigInt(timestamp));

      // Map game type to smart contract enum value (single byte)
      const gameTypeForPDA = this.mapGameTypeToEnum(matchId);
      const gameTypeByte = this.getGameTypeByteValue(gameTypeForPDA);
      
      // Derive PDAs using the exact same seeds as the smart contract
      const [matchPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('match'), 
          creator.toBuffer(), 
          Buffer.from([gameTypeByte]), // Single byte for game type
          timestampBuffer
        ],
        this.PROGRAM_ID
      );

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), matchPDA.toBuffer()],
        this.PROGRAM_ID
      );

      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );

      this.logger.log(`📋 Match PDA: ${matchPDA.toString()}`);
      this.logger.log(`🏦 Escrow PDA: ${escrowPDA.toString()}`);

      // Map game type to smart contract enum for the RPC call
      const gameTypeForRPC = this.mapGameTypeToEnum(matchId);
      
      this.logger.log(`🔍 GAME TYPE DEBUG:`);
      this.logger.log(`🔍 matchId: ${matchId}`);
      this.logger.log(`🔍 gameTypeForRPC: ${JSON.stringify(gameTypeForRPC)}`);
      this.logger.log(`🔍 gameTypeByte: ${this.getGameTypeByteValue(gameTypeForRPC)}`);

      // ✅ FIXED: Use simplified smart contract interface (no session vaults)
      const tx = await this.program.methods
        .createMatch(
          gameTypeForRPC,
          new BN(wagerLamports),
          new BN(timestamp + 3600), // 1 hour expiry
          new BN(timestamp)
        )
        .accounts({
          matchAccount: matchPDA,
          matchEscrow: escrowPDA,
          config: configPDA,
          creator: creator, // ✅ Creator must sign for wallet transactions
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // ✅ No backend signing - creator must sign via frontend
        .transaction(); // ✅ Return transaction for frontend signing

      // ✅ RETURN TRANSACTION FOR FRONTEND SIGNING
      const recentBlockhash = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = recentBlockhash.blockhash;
      tx.feePayer = creator;

      const serializedTx = tx.serialize({ requireAllSignatures: false });
      const base64Tx = serializedTx.toString('base64');

      this.logger.log(`✅ Match transaction prepared for signing!`);
      this.logger.log(`🏦 Escrow PDA: ${escrowPDA.toString()}`);

      // Return both the transaction and escrow address
      return JSON.stringify({
        transaction: base64Tx,
        escrowAddress: escrowPDA.toString(),
        matchPDA: matchPDA.toString()
      });

    } catch (error) {
      this.logger.error(`❌ Failed to create match escrow: ${error.message}`);
      throw new BadRequestException(`Failed to create match escrow: ${error.message}`);
    }
  }

  /**
   * Join match using smart contract
   */
  async joinMatch(escrowAddress: string, playerWallet: string, wager: number): Promise<string> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      const joiner = new PublicKey(playerWallet);
      const escrowPDA = new PublicKey(escrowAddress);

      this.logger.log(`🔍 Finding match account for escrow: ${escrowAddress}`);
      
      // ✅ Find the match account by searching all matches and checking their escrow PDAs
      let matchAccountAddress: PublicKey;
      try {
        const allMatches = await this.program.account.match.all();
        const targetMatch = allMatches.find(match => {
          const [derivedEscrow] = PublicKey.findProgramAddressSync(
            [Buffer.from('escrow'), match.publicKey.toBuffer()],
            this.PROGRAM_ID
          );
          return derivedEscrow.equals(escrowPDA);
        });
        
        if (!targetMatch) {
          throw new Error(`Match not found for escrow ${escrowAddress}`);
        }
        
        matchAccountAddress = targetMatch.publicKey;
        this.logger.log(`✅ Found match PDA: ${matchAccountAddress.toString()}`);
      } catch (error) {
        this.logger.error(`❌ Failed to find match account: ${error.message}`);
        throw new Error(`Could not find match account for escrow ${escrowAddress}. The match may not exist or the escrow address is invalid.`);
      }

      this.logger.log(`🎮 Joining match - escrow: ${escrowAddress}, joiner: ${playerWallet}`);
      this.logger.log(`📋 Match PDA: ${matchAccountAddress.toString()}`);

      // ✅ FIXED: Use simplified smart contract interface (no session vaults)
      const tx = await this.program.methods
        .joinMatch()
        .accounts({
          matchAccount: matchAccountAddress,
          matchEscrow: escrowPDA,
          joiner: joiner, // ✅ Joiner must sign for wallet transactions
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // ✅ No backend signing - joiner must sign via frontend
        .transaction(); // ✅ Return transaction for frontend signing

      // ✅ RETURN TRANSACTION FOR FRONTEND SIGNING
      const recentBlockhash = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = recentBlockhash.blockhash;
      tx.feePayer = joiner;

      const serializedTx = tx.serialize({ requireAllSignatures: false });
      const base64Tx = serializedTx.toString('base64');

      this.logger.log(`✅ Join match transaction prepared for signing!`);
      this.logger.log(`📄 Transaction ready for frontend`);

      return base64Tx;
    } catch (error) {
      this.logger.error(`❌ Failed to join match: ${error.message}`);
      throw new BadRequestException(`Failed to join match: ${error.message}`);
    }
  }

  /**
   * Submit match result using smart contract with Ed25519 signature verification
   */
  async submitMatchResult(escrowAddress: string, winnerWallet: string, signature: string, gameData?: any): Promise<string> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      const winner = new PublicKey(winnerWallet);
      const escrowPDA = new PublicKey(escrowAddress);

      this.logger.log(`🎯 Submitting match result - escrow: ${escrowAddress}, winner: ${winnerWallet}`);
      
      // ✅ Find the match account by searching all matches and checking their escrow PDAs
      let matchAccountAddress: PublicKey;
      try {
        const allMatches = await this.program.account.match.all();
        const targetMatch = allMatches.find(match => {
          const [derivedEscrow] = PublicKey.findProgramAddressSync(
            [Buffer.from('escrow'), match.publicKey.toBuffer()],
        this.PROGRAM_ID
      );
          return derivedEscrow.equals(escrowPDA);
        });
        
        if (!targetMatch) {
          throw new Error(`Match not found for escrow ${escrowAddress}`);
        }
        
        matchAccountAddress = targetMatch.publicKey;
        this.logger.log(`✅ Found match PDA: ${matchAccountAddress.toString()}`);
      } catch (error) {
        this.logger.error(`❌ Failed to find match account: ${error.message}`);
        throw new Error(`Could not find match account for escrow ${escrowAddress}`);
      }

      // Get required PDAs
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );

      // ✅ CRITICAL FIX: Get winner's session vault PDA for payout
      const [winnerSessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), winner.toBuffer()],
        this.PROGRAM_ID
      );

      // ✅ Check if winner has a session vault
      let hasSessionVault = false;
      try {
        await this.program.account.sessionVault.fetch(winnerSessionVaultPDA);
        hasSessionVault = true;
        this.logger.log(`✅ Winner has session vault - payout will go to session vault`);
      } catch (error) {
        this.logger.log(`ℹ️ Winner has no session vault - payout will go to wallet`);
      }

      // ✅ Create cryptographic result hash
      const resultData = {
        matchId: matchAccountAddress.toString(),
        winner: winnerWallet,
        timestamp: Date.now(),
        gameData: gameData || {}
      };
      
      const resultHash = createHash('sha256')
        .update(JSON.stringify(resultData))
        .digest();

      // ✅ Create message exactly as smart contract expects
      const message = Buffer.concat([
        matchAccountAddress.toBuffer(), // 32 bytes - match_id
        winner.toBuffer(),              // 32 bytes - winner
        resultHash                      // 32 bytes - result_hash
      ]);

      // ✅ Sign with Ed25519 using verifier private key
      const ed25519Signature = nacl.sign.detached(message, this.wallet.payer.secretKey);
      
      this.logger.log(`🔐 Created Ed25519 signature for result submission`);
      this.logger.log(`📝 Result hash: ${resultHash.toString('hex')}`);

      // ✅ CRITICAL FIX: Create Ed25519 instruction for signature verification
      // Ed25519 instruction data format according to Solana docs:
      // [num_signatures: u8, padding: u8, signature_offset: u16, signature_instruction_index: u16, 
      //  public_key_offset: u16, public_key_instruction_index: u16, message_data_offset: u16, 
      //  message_data_size: u16, message_instruction_index: u16, signature: [u8; 64], pubkey: [u8; 32], message: [u8]]
      
      const signatureOffset = 16;
      const pubkeyOffset = 80; 
      const messageOffset = 112;
      
      const instructionData = Buffer.alloc(112 + message.length);
      
      // Header (16 bytes)
      instructionData.writeUInt8(1, 0); // num_signatures
      instructionData.writeUInt8(0, 1); // padding
      instructionData.writeUInt16LE(signatureOffset, 2); // signature_offset
      instructionData.writeUInt16LE(0, 4); // signature_instruction_index (same instruction)
      instructionData.writeUInt16LE(pubkeyOffset, 6); // public_key_offset
      instructionData.writeUInt16LE(0, 8); // public_key_instruction_index (same instruction)
      instructionData.writeUInt16LE(messageOffset, 10); // message_data_offset
      instructionData.writeUInt16LE(message.length, 12); // message_data_size
      instructionData.writeUInt16LE(0, 14); // message_instruction_index (same instruction)
      
      // Signature (64 bytes at offset 16)
      Buffer.from(ed25519Signature).copy(instructionData, signatureOffset);
      
      // Public key (32 bytes at offset 80)
      this.wallet.publicKey.toBuffer().copy(instructionData, pubkeyOffset);
      
      // Message (variable length at offset 112)
      message.copy(instructionData, messageOffset);
      
      const ed25519Instruction = new TransactionInstruction({
        programId: new PublicKey('Ed25519SigVerify111111111111111111111111111'),
        keys: [],
        data: instructionData,
      });

      // ✅ FIXED: Include winner's session vault for payout
      const accounts: any = {
          matchAccount: matchAccountAddress,
          matchEscrow: escrowPDA,
          winner: winner,
          treasury: this.treasuryWallet,
          referralPool: this.referralWallet,
          config: configPDA,
        instructionSysvar: new PublicKey('Sysvar1nstructions1111111111111111111111111'),
          verifier: this.wallet.publicKey,
      };

      // Add session vault accounts if winner has one
      if (hasSessionVault) {
        accounts.winnerSessionVault = winnerSessionVaultPDA;
        accounts.winnerSessionVaultAccount = winnerSessionVaultPDA;
        this.logger.log(`💰 Including winner session vault in payout: ${winnerSessionVaultPDA.toString()}`);
      }

      // ✅ Build transaction with Ed25519 instruction first
      const submitResultInstruction = await this.program.methods
        .submitResult(
          winner,                           // winner_pubkey
          Array.from(resultHash),          // result_hash [u8; 32]
          Array.from(ed25519Signature),    // ed25519_signature [u8; 64]
          0                                // ed25519_instruction_index u8 (Ed25519 will be at index 0)
        )
        .accounts(accounts)
        .instruction();

      // Create transaction with Ed25519 instruction first, then submit_result
      const transaction = new Transaction();
      transaction.add(ed25519Instruction);
      transaction.add(submitResultInstruction);

      // ✅ CRITICAL FIX: Add transaction validation and proper error handling
      this.logger.log(`🚀 Attempting to send transaction...`);
      
      let tx;
      try {
        tx = await this.provider.sendAndConfirm(transaction, [], {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          skipPreflight: false // Enable preflight checks to catch errors early
        });
      } catch (sendError) {
        this.logger.error(`❌ Transaction send failed:`, sendError);
        throw sendError;
      }

      // ✅ Verify transaction actually exists on-chain
      this.logger.log(`🔍 Verifying transaction on-chain: ${tx}`);
      
      try {
        const txInfo = await this.connection.getTransaction(tx, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });
        
        if (!txInfo) {
          throw new Error(`Transaction ${tx} not found on-chain - possible fake success`);
        }
        
        if (txInfo.meta?.err) {
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(txInfo.meta.err)}`);
        }
        
        this.logger.log(`✅ Transaction verified on-chain successfully!`);
        this.logger.log(`📄 Confirmed Transaction: ${tx}`);
        
      } catch (verifyError) {
        this.logger.error(`❌ Transaction verification failed:`, verifyError);
        throw new Error(`Payout failed - transaction not confirmed: ${verifyError.message}`);
      }

      return tx;
    } catch (error) {
      // ✅ CRITICAL FIX: Safe error message extraction
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      this.logger.error(`❌ Failed to submit match result: ${errorMessage}`);
      this.logger.error(`❌ Full error object:`, error);
      throw new BadRequestException(`Failed to process match result: ${errorMessage}`);
    }
  }

  /**
   * Cancel match on-chain by setting status to Cancelled
   */
  async cancelMatchOnChain(escrowAddress: string): Promise<void> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      this.logger.log(`🔄 Cancelling match on-chain for escrow: ${escrowAddress}`);
      
      const escrowPDA = new PublicKey(escrowAddress);
      
      // Find the match account
      const allMatches = await this.program.account.match.all();
      const targetMatch = allMatches.find(match => {
        const [derivedEscrow] = PublicKey.findProgramAddressSync(
          [Buffer.from('escrow'), match.publicKey.toBuffer()],
          this.PROGRAM_ID
        );
        return derivedEscrow.equals(escrowPDA);
      });
      
      if (!targetMatch) {
        throw new Error(`Match not found for escrow ${escrowAddress}`);
      }
      
      const matchPDA = targetMatch.publicKey;
      const matchAccount = targetMatch.account as any;
      
      this.logger.log(`📋 Found match: ${matchPDA.toString()}`);
      
      // Get config PDA
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );

      // Get creator's session vault PDA
      const [creatorSessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), matchAccount.creator.toBuffer()],
        this.PROGRAM_ID
      );

      // Check if creator has session vault
      let useSessionVault = false;
      try {
        await this.program.account.sessionVault.fetch(creatorSessionVaultPDA);
        useSessionVault = true;
        this.logger.log(`✅ Creator has session vault - using session vault cancel`);
      } catch (error) {
        this.logger.log(`ℹ️ Creator has no session vault - using traditional cancel`);
      }

      // Call the smart contract's cancel_match function
      const tx = await this.program.methods
        .cancelMatch(useSessionVault)
        .accounts({
          matchAccount: matchPDA,
          matchEscrow: escrowPDA,
          creator: matchAccount.creator,
          treasury: this.treasuryWallet, // Required for collecting 3% cancellation fee
          creatorSessionVault: useSessionVault ? creatorSessionVaultPDA : null,
        })
        .rpc();
      
      this.logger.log(`✅ Match cancelled on-chain with refund: ${tx}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to cancel match on-chain: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refund match - handles both traditional and session vault refunds
   */
  async refundMatch(escrowAddress: string): Promise<void> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      this.logger.log(`🔄 Processing refund for escrow: ${escrowAddress}`);
      
      const escrowPDA = new PublicKey(escrowAddress);
      
      // Derive match PDA from escrow PDA (reverse lookup)
      // We need to get the match account to find creator/joiner info
      let matchPDA: PublicKey;
      let matchAccount: any;
      
      // Try to find the match account by checking all possible match PDAs
      // This is a bit inefficient but necessary for the refund process
      try {
        // Get all program accounts to find the match
        const allMatches = await this.program.account.match.all();
        const targetMatch = allMatches.find(match => {
          const [derivedEscrow] = PublicKey.findProgramAddressSync(
            [Buffer.from('escrow'), match.publicKey.toBuffer()],
        this.PROGRAM_ID
      );
          return derivedEscrow.equals(escrowPDA);
        });
        
        if (!targetMatch) {
          throw new Error(`Match not found for escrow ${escrowAddress}`);
        }
        
        matchPDA = targetMatch.publicKey;
        matchAccount = targetMatch.account;
        
      } catch (error) {
        this.logger.error(`❌ Failed to find match for escrow ${escrowAddress}: ${error.message}`);
        throw error;
      }

      this.logger.log(`📋 Found match: ${matchPDA.toString()}`);
      this.logger.log(`👤 Creator: ${matchAccount.creator.toString()}`);
      this.logger.log(`👤 Joiner: ${matchAccount.joiner.toString()}`);

      // Derive session vault PDAs
      const [creatorSessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), matchAccount.creator.toBuffer()],
        this.PROGRAM_ID
      );

      const [joinerSessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), matchAccount.joiner.toBuffer()],
        this.PROGRAM_ID
      );

      // Check if session vaults exist (determines refund method)
      let useSessionVault = false;
      try {
        await this.program.account.sessionVault.fetch(creatorSessionVaultPDA);
        useSessionVault = true;
        this.logger.log(`✅ Creator has session vault - using session vault refund`);
      } catch (error) {
        this.logger.log(`ℹ️ Creator has no session vault - using traditional refund`);
      }

      // Execute refund
      const hasJoiner = !matchAccount.joiner.equals(PublicKey.default);
      
      const tx = await this.program.methods
        .refundMatch(useSessionVault) // ✅ Pass the use_session_vault parameter
        .accounts({
          matchAccount: matchPDA,
          matchEscrow: escrowPDA,
          creator: matchAccount.creator,
          joiner: hasJoiner ? matchAccount.joiner : matchAccount.creator, // Use creator as joiner if no real joiner
          creatorSessionVault: useSessionVault ? creatorSessionVaultPDA : null,
          joinerSessionVault: useSessionVault && hasJoiner ? joinerSessionVaultPDA : null,
        })
        .rpc();

      this.logger.log(`✅ Match refunded successfully: ${escrowAddress}`);
      this.logger.log(`📄 Refund transaction: ${tx}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to refund match: ${error.message}`);
      // Don't throw here - let the cancellation proceed even if refund fails
      this.logger.warn(`⚠️ Continuing with match cancellation despite refund failure`);
    }
  }

  /**
   * Get escrow account data
   */
  async getEscrowData(escrowAddress: string): Promise<EscrowAccount | null> {
    if (!this.program) {
        return null;
      }

    try {
      // For now, return mock data since account fetching requires proper setup
      return {
        matchId: `match_${escrowAddress.slice(-8)}`,
        creator: this.wallet.publicKey,
        joiner: undefined,
        wagerAmount: 1.0,
        status: 'pending',
        createdAt: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to get escrow data: ${error.message}`);
      return null;
    }
  }

  /**
   * Create session vault account on-chain - BACKEND PAYS FOR ACCOUNT CREATION
   */
  async createSessionVault(userWallet: string): Promise<string> {
    try {
      const user = new PublicKey(userWallet);

      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), user.toBuffer()],
        this.PROGRAM_ID
      );

      // Check if vault already exists
      try {
        await this.program.account.sessionVault.fetch(sessionVaultPDA);
        throw new BadRequestException('Session vault already exists for this wallet');
      } catch (error) {
        if (!error.message.includes('Account does not exist')) {
          throw error; // Re-throw if it's not the "doesn't exist" error
        }
        // Vault doesn't exist - create it now
      }

      this.logger.log(`🏗️ Creating session vault for user: ${userWallet}`);
      this.logger.log(`📍 Session vault PDA: ${sessionVaultPDA.toString()}`);

      // Backend creates and pays for the vault on behalf of the user
      // This enables seamless onboarding for email/authenticator users
      const infrastructurePrepayment = new BN(0.02 * LAMPORTS_PER_SOL); // 0.02 SOL minimum prepayment
      
      const tx = await this.program.methods
        .createSessionVaultForUser(user, infrastructurePrepayment)
        .accounts({
          sessionVault: sessionVaultPDA,
          verifier: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
         .signers([this.wallet.payer])
        .rpc();

      this.logger.log(`✅ Session vault created successfully!`);
      this.logger.log(`📄 Transaction: ${tx}`);
      this.logger.log(`🏦 Vault address: ${sessionVaultPDA.toString()}`);
      
      return sessionVaultPDA.toString();
    } catch (error) {
      this.logger.error(`❌ Failed to create session vault: ${error.message}`);
      throw new BadRequestException(`Failed to create session vault: ${error.message}`);
    }
  }

  /**
   * Withdraw from session vault
   */
  async withdrawFromVault(vaultAddress: string, destinationAddress: string, amount: number): Promise<string> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      const vaultPDA = new PublicKey(vaultAddress);
      const destination = new PublicKey(destinationAddress);
      const withdrawAmount = new BN(amount * LAMPORTS_PER_SOL);

      // Call smart contract to withdraw from vault
      const tx = await this.program.methods
        .withdrawFromSession(withdrawAmount)
        .accounts({
          sessionVault: vaultPDA,
          user: destination,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      this.logger.log(`✅ Vault withdrawal: ${amount} SOL to ${destinationAddress}`);
      this.logger.log(`📄 Transaction: ${tx}`);

      return tx;
    } catch (error) {
      this.logger.error(`❌ Failed to withdraw from vault: ${error.message}`);
      throw new BadRequestException(`Failed to withdraw from vault: ${error.message}`);
    }
  }

  /**
   * Get session vault PDA address for a user
   */
  async getSessionVaultAddress(userWallet: string): Promise<string> {
    const user = new PublicKey(userWallet);
    const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('session_vault'), user.toBuffer()],
      this.PROGRAM_ID
    );
    return sessionVaultPDA.toString();
  }

  /**
   * Get session vault balance for a user (from smart contract account)
   */
  async getSessionVaultBalance(userWallet: string): Promise<number> {
    if (!this.program) {
      throw new BadRequestException('Program not initialized');
    }

    try {
      this.logger.log(`🔍 Getting session vault balance for: ${userWallet}`);
      
      const user = new PublicKey(userWallet);
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), user.toBuffer()],
        this.PROGRAM_ID
      );

      this.logger.log(`🔍 Session vault PDA: ${sessionVaultPDA.toString()}`);

      // ✅ CRITICAL FIX: Read actual SOL balance instead of internal balance field
      // The smart contract's internal balance can be out of sync with actual SOL balance
      const accountInfo = await this.connection.getAccountInfo(sessionVaultPDA);
      
      if (!accountInfo) {
        this.logger.log(`ℹ️ Session vault does not exist for ${userWallet}`);
        throw new BadRequestException('Session vault does not exist');
      }

      const actualBalance = accountInfo.lamports;
      this.logger.log(`✅ Session vault account found`);
      this.logger.log(`💰 Actual SOL balance: ${actualBalance} lamports (${actualBalance / LAMPORTS_PER_SOL} SOL)`);

      // Also fetch smart contract data for comparison/debugging
      try {
      const sessionVaultAccount = await this.program.account.sessionVault.fetch(sessionVaultPDA) as any;
        const internalBalance = sessionVaultAccount.balance?.toNumber() || 0;
      
        this.logger.log(`📊 Smart contract internal balance: ${internalBalance} lamports`);
      this.logger.log(`📊 Account data:`, {
        owner: sessionVaultAccount.owner?.toString(),
          internalBalance: internalBalance,
          actualBalance: actualBalance,
          difference: actualBalance - internalBalance,
        totalDeposited: sessionVaultAccount.totalDeposited?.toString(),
        totalWithdrawn: sessionVaultAccount.totalWithdrawn?.toString(),
        matchesPlayed: sessionVaultAccount.matchesPlayed?.toString(),
        createdAt: sessionVaultAccount.createdAt?.toString(),
        lastActivity: sessionVaultAccount.lastActivity?.toString(),
        bump: sessionVaultAccount.bump
      });

        if (actualBalance !== internalBalance) {
          this.logger.warn(`⚠️ Balance mismatch! Actual: ${actualBalance}, Internal: ${internalBalance}, Diff: ${actualBalance - internalBalance}`);
          this.logger.warn(`⚠️ Using actual SOL balance for accuracy`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Could not fetch smart contract data: ${error.message}`);
        this.logger.log(`ℹ️ Using actual SOL balance: ${actualBalance} lamports`);
      }
      
      return actualBalance; // Returns actual SOL balance in lamports
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        this.logger.log(`ℹ️ Session vault does not exist for ${userWallet}`);
        throw new BadRequestException('Session vault does not exist');
      }
      this.logger.error(`❌ Failed to get session vault balance: ${error.message}`);
      this.logger.error(`❌ Stack trace: ${error.stack}`);
      throw new BadRequestException(`Failed to get session vault balance: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const slot = await this.connection.getSlot();
      return slot > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if escrow account exists and has funds
   */
  async checkEscrowExists(escrowAddress: string): Promise<boolean> {
    if (!this.program) {
      return false;
    }

    try {
      const escrowPDA = new PublicKey(escrowAddress);
      
      // Try to fetch the escrow account
      const escrowAccount = await this.program.account.matchEscrow.fetch(escrowPDA) as any;
      
      // If we can fetch it, it exists and likely has funds
      this.logger.log(`✅ Escrow account exists: ${escrowAddress}`);
      return true;
      
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        this.logger.log(`ℹ️ Escrow account does not exist: ${escrowAddress}`);
        return false;
      } else {
        this.logger.error(`❌ Error checking escrow existence: ${error.message}`);
        // If we can't determine, assume it exists to be safe (attempt refund)
        return true;
      }
    }
  }

  /**
   * Create a verifiable result signature for external verification
   * This allows anyone to verify that a result was signed by our verifier
   */
  async createVerifiableResultSignature(
    matchId: string, 
    winnerWallet: string, 
    gameData: any
  ): Promise<{
    resultHash: string;
    signature: string;
    verifierPublicKey: string;
    message: string;
    timestamp: number;
  }> {
    try {
      const winner = new PublicKey(winnerWallet);
      const matchPDA = new PublicKey(matchId);
      
      // Create deterministic result data
      const timestamp = Date.now();
      const resultData = {
        matchId: matchId,
        winner: winnerWallet,
        timestamp: timestamp,
        gameData: gameData
      };
      
      // Create result hash
      const resultHash = createHash('sha256')
        .update(JSON.stringify(resultData))
        .digest();

      // Create message exactly as smart contract expects
      const message = Buffer.concat([
        matchPDA.toBuffer(),
        winner.toBuffer(),
        resultHash
      ]);

      // Sign with Ed25519
      const signature = nacl.sign.detached(message, this.wallet.payer.secretKey);

      this.logger.log(`🔐 Created verifiable signature for match: ${matchId}`);
      this.logger.log(`🎯 Result hash: ${resultHash.toString('hex')}`);
      this.logger.log(`🔑 Verifier: ${this.wallet.publicKey.toString()}`);

      return {
        resultHash: resultHash.toString('hex'),
        signature: Buffer.from(signature).toString('base64'),
        verifierPublicKey: this.wallet.publicKey.toString(),
        message: message.toString('hex'),
        timestamp: timestamp
      };

    } catch (error) {
      this.logger.error(`❌ Failed to create verifiable signature: ${error.message}`);
      throw new BadRequestException(`Failed to create verifiable signature: ${error.message}`);
    }
  }

  /**
   * Verify a result signature (for external verification)
   */
  static verifyResultSignature(
    matchId: string,
    winnerWallet: string,
    resultHash: string,
    signature: string,
    verifierPublicKey: string
  ): boolean {
    try {
      const winner = new PublicKey(winnerWallet);
      const matchPDA = new PublicKey(matchId);
      const verifierPubkey = new PublicKey(verifierPublicKey);
      
      // Recreate the message
      const message = Buffer.concat([
        matchPDA.toBuffer(),
        winner.toBuffer(),
        Buffer.from(resultHash, 'hex')
      ]);

      // Verify signature
      const signatureBytes = Buffer.from(signature, 'base64');
      const isValid = nacl.sign.detached.verify(
        message,
        signatureBytes,
        verifierPubkey.toBytes()
      );

      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Bridge deposit - calls smart contract bridge_deposit instruction
   */
  async bridgeDeposit(
    userPublicKey: PublicKey,
    amount: number,
    bridgeTxHash: string,
    sourceChain: string,
  ): Promise<string> {
    try {
      this.logger.log(`🌉 Processing bridge deposit: ${amount / LAMPORTS_PER_SOL} SOL for ${userPublicKey.toString()}`);
      
      // Ensure contract is initialized
      await this.initializeContractIfNeeded();
      
      // Get session vault PDA
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), userPublicKey.toBuffer()],
        this.PROGRAM_ID
      );
      
      // Get config PDA
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );
      
      // Get bridge treasury (same as main treasury for now)
      const bridgeTreasury = this.treasuryWallet;
      
      this.logger.log(`📍 Session vault: ${sessionVaultPDA.toString()}`);
      this.logger.log(`📍 Config: ${configPDA.toString()}`);
      this.logger.log(`📍 Bridge treasury: ${bridgeTreasury.toString()}`);
      
      // Call smart contract to deposit funds
      const tx = await this.program.methods
        .bridgeDeposit(
          amount,
          bridgeTxHash,
          sourceChain
        )
        .accounts({
          sessionVault: sessionVaultPDA,
          treasury: bridgeTreasury,
          config: configPDA,
        })
        .rpc();
      
      this.logger.log(`✅ Bridge deposit successful: ${amount / LAMPORTS_PER_SOL} SOL for ${userPublicKey.toString()}`);
      this.logger.log(`📄 Transaction: ${tx}`);
      
      return tx;
    } catch (error) {
      this.logger.error(`❌ Failed to bridge deposit: ${error.message}`);
      throw new BadRequestException(`Failed to bridge deposit: ${error.message}`);
    }
  }

  /**
   * Deposit SOL to user's session vault
   */
  async depositToSessionVault(
    userWallet: string,
    amount: number,
    transactionSignature?: string
  ): Promise<string> {
    try {
      this.logger.log(`💰 Depositing ${amount} SOL to session vault for ${userWallet}`);
      
      // Ensure contract is initialized
      await this.initializeContractIfNeeded();
      
      // Get session vault PDA
      const [sessionVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('session_vault'), new PublicKey(userWallet).toBuffer()],
        this.PROGRAM_ID
      );
      
      // Get config PDA
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.PROGRAM_ID
      );
      
      this.logger.log(`📍 Session vault: ${sessionVaultPDA.toString()}`);
      this.logger.log(`📍 Config: ${configPDA.toString()}`);
      
      // Call smart contract to deposit funds
      const tx = await this.program.methods
        .depositToSession(
          amount,
          transactionSignature || ''
        )
        .accounts({
          sessionVault: sessionVaultPDA,
          treasury: this.treasuryWallet,
          config: configPDA,
          user: new PublicKey(userWallet),
        })
        .rpc();
      
      this.logger.log(`✅ Session vault deposit successful: ${amount / LAMPORTS_PER_SOL} SOL for ${userWallet}`);
      this.logger.log(`📄 Transaction: ${tx}`);
      
      return tx;
    } catch (error) {
      this.logger.error(`❌ Failed to deposit to session vault: ${error.message}`);
      throw new BadRequestException(`Failed to deposit to session vault: ${error.message}`);
    }
  }

  /**
   * Get transaction details from Solana
   */
  async getTransactionDetails(transactionHash: string): Promise<any> {
    try {
      this.logger.log(`🔍 Fetching transaction details for: ${transactionHash}`);
      
      const tx = await this.connection.getTransaction(transactionHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx) {
        throw new Error('Transaction not found');
      }
      
      this.logger.log(`✅ Transaction details fetched successfully`);
      return tx;
    } catch (error) {
      this.logger.error(`❌ Failed to get transaction details: ${error.message}`);
      throw new BadRequestException(`Failed to get transaction details: ${error.message}`);
    }
  }

  /**
   * Send SOL to treasury wallet
   */
  async sendSOLToTreasury(
    fromWallet: string,
    amount: number,
    reason: string = 'Platform fee'
  ): Promise<string> {
    try {
      this.logger.log(`🏦 Sending ${amount / LAMPORTS_PER_SOL} SOL to treasury from ${fromWallet}`);
      this.logger.log(`📝 Reason: ${reason}`);
      
      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(fromWallet),
        toPubkey: this.treasuryWallet,
        lamports: amount
      });
      
      // Create transaction
      const transaction = new Transaction().add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(fromWallet);
      
      // Sign and send transaction
      const tx = await this.connection.sendTransaction(transaction, [this.wallet.payer]);
      
      this.logger.log(`✅ Treasury transfer successful: ${amount / LAMPORTS_PER_SOL} SOL`);
      this.logger.log(`📄 Transaction: ${tx}`);
      
      return tx;
    } catch (error) {
      this.logger.error(`❌ Failed to send SOL to treasury: ${error.message}`);
      throw new BadRequestException(`Failed to send SOL to treasury: ${error.message}`);
    }
  }
}