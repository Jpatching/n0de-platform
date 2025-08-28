import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, UnauthorizedException, forwardRef, Inject, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SolanaService } from '../solana/solana.service';
import { VerifierService } from '../verifier/verifier.service';
import { ChessService, ChessGameState } from '../games/chess.service';
import { CoinFlipService, CoinFlipGameState } from '../games/coinflip.service';
import { CrashService, CrashGameState } from '../games/crash.service';
import { RPSService, RPSGameState } from '../games/rps.service';

import { MinesService, MinesGameState } from '../games/mines.service';
import { GameType, GameCategory } from '../games/game-types';
import { MatchGateway } from './match.gateway';
import { ChatService } from '../chat/chat.service';
import { PrestigeService } from '../social/prestige.service';
import { ReferralService } from '../social/referral.service';
import * as crypto from 'crypto';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PnLService } from '../pnl/pnl.service';

// Game service handlers for the new unified GameType enum
const GAME_HANDLERS = {
  [GameType.Chess]: ChessService,
  [GameType.RockPaperScissors]: RPSService,
  [GameType.CoinFlip]: CoinFlipService,
  [GameType.Crash]: CrashService,
  [GameType.Mines]: MinesService,
};

// Service mapping for game-specific validation
const GAME_SERVICE_MAP = {
  [GameType.Chess]: 'chessService',
  [GameType.RockPaperScissors]: 'rpsService',
  [GameType.CoinFlip]: 'coinFlipService',
  [GameType.Crash]: 'crashService',
  [GameType.Mines]: 'minesService',
};

export interface CreateMatchDto {
  gameType: string;
  wager: number;
  playerWallet: string;
  timeControl?: string; // For chess: "5+0", "10+0", etc.
}

export interface JoinMatchDto {
  matchId: string;
  playerWallet: string;
}

export interface SubmitResultDto {
  matchId: string;
  gameState: any; // Game-specific state
  winnerWallet?: string;
  signature?: string;
}

export interface MatchResponse {
  id: string;
  gameType: string;
  wager: number;
  status: string;
  createdAt: Date;
  expiryTime?: Date;
  player1: {
    id: string;
    wallet: string;
    username?: string;
  };
  player2?: {
    id: string;
    wallet: string;
    username?: string;
  };
  winner?: {
    id: string;
    wallet: string;
    username?: string;
  };
  escrowAddress?: string;
  gameData?: any;
}

@Injectable()
export class MatchService implements OnModuleDestroy {
  private readonly logger = new Logger(MatchService.name);
  private readonly SUPPORTED_GAMES = ['coin-flip', 'rock-paper-scissors', 'dice-duel', 'chess', 'crash', 'mines'];
  private readonly MIN_WAGER = 0.1; // 0.1 SOL (matches smart contract requirement)
  private readonly MAX_WAGER = 10.0; // 10 SOL
  private readonly DEFAULT_EXPIRY_MINUTES = 30;

  // ✅ ANTI-CHEAT: Track submitted results to prevent double submission
  private submittedResults = new Set<string>();
  private submissionLocks = new Map<string, Promise<any>>();

  // 🚀 INVISIBLE PERFORMANCE: Memory caching for frequently accessed data
  private readonly matchCache = new Map<string, { data: any; timestamp: number }>();
  private readonly userMatchCache = new Map<string, { data: any; timestamp: number }>();
  private readonly availableMatchesCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly MATCH_CACHE_TTL = 10000; // 10 seconds for individual matches

  // 🔧 NEW: Track mines round timeouts
  private minesRoundTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly MINES_ROUND_TIMEOUT = 60000; // 60 seconds timeout per round

  // 🧹 AUTO CLEANUP: Automatic match cleanup
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes (more aggressive)
  private readonly MAX_MATCH_AGE_HOURS = 2; // Remove matches older than 2 hours
  
  // 🔗 CONNECTION TRACKING: Track match creator activity
  private creatorActivity = new Map<string, { lastSeen: number; isConnected: boolean }>(); // matchId -> activity
  private readonly CREATOR_TIMEOUT = 5 * 60 * 1000; // 5 minutes before considering creator inactive

  constructor(
    private prisma: PrismaService,
    private solanaService: SolanaService,
    private verifierService: VerifierService,
    private chessService: ChessService,
    private coinFlipService: CoinFlipService,
    private crashService: CrashService,
    private rpsService: RPSService,
    private minesService: MinesService,
    @Inject(forwardRef(() => MatchGateway))
    private matchGateway: MatchGateway,
    private prestigeService: PrestigeService,
    private referralService: ReferralService,
    private leaderboardService: LeaderboardService,
    private chatService: ChatService,
    private pnlService: PnLService
  ) {
    // ✅ ROUND PROGRESSION FIX: Register crash completion callback
    this.registerCrashCompletionHandler();
    
    // 🧹 AUTO CLEANUP: Start automatic cleanup interval
    this.startAutoCleanup();
  }

  /**
   * ✅ ROUND PROGRESSION FIX: Register crash completion handler
   */
  private registerCrashCompletionHandler(): void {
    // Register global callback for crash completion
    if (!(global as any).__crashCompletionCallbacks) {
      (global as any).__crashCompletionCallbacks = {};
    }
    
    (global as any).__crashCompletionCallbacks.handleCrashCompletion = async (matchId: string, crashResult: any) => {
      try {
        this.logger.log(`🔄 MATCH SERVICE: Received crash completion notification for ${matchId}`);
        await this.handleCrashRoundProgression(matchId, crashResult);
      } catch (error) {
        this.logger.error(`❌ MATCH SERVICE: Error handling crash completion for ${matchId}:`, error);
      }
    };
    
    this.logger.log(`✅ MATCH SERVICE: Crash completion handler registered`);
  }

  /**
   * 🧹 AUTO CLEANUP: Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    this.logger.log(`🧹 Starting automatic match cleanup every ${this.CLEANUP_INTERVAL / 60000} minutes`);
    
    // Run cleanup immediately on startup
    this.cleanupExpiredMatches().catch(error => {
      this.logger.error('Initial cleanup failed:', error);
    });
    
    // Set up recurring cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredMatches();
        await this.cleanupInactiveCreatorMatches();
      } catch (error) {
        this.logger.error('Scheduled cleanup failed:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 🔗 CONNECTION TRACKING: Track match creator activity
   */
  trackCreatorActivity(matchId: string, isConnected = true): void {
    this.creatorActivity.set(matchId, {
      lastSeen: Date.now(),
      isConnected
    });
  }

  /**
   * 🔗 CONNECTION TRACKING: Public method to track user activity on specific match
   */
  async trackUserActivityForMatch(playerWallet: string): Promise<void> {
    try {
      // Find pending matches created by this user
      const user = await this.prisma.user.findUnique({
        where: { wallet: playerWallet }
      });

      if (user) {
        const pendingMatches = await this.prisma.match.findMany({
          where: {
            player1Id: user.id,
            status: 'pending',
            player2Id: null
          },
          select: { id: true }
        });

        // Update activity for all their pending matches
        pendingMatches.forEach(match => {
          this.trackCreatorActivity(match.id, true);
        });

        if (pendingMatches.length > 0) {
          this.logger.log(`🔗 Updated activity for ${pendingMatches.length} pending matches by ${playerWallet}`);
        }
      }
    } catch (error) {
      this.logger.error('Error tracking user activity:', error);
    }
  }

  /**
   * 🔗 CONNECTION TRACKING: Mark creator as disconnected
   */
  markCreatorDisconnected(matchId: string): void {
    const activity = this.creatorActivity.get(matchId);
    if (activity) {
      activity.isConnected = false;
      this.creatorActivity.set(matchId, activity);
    }
  }

  /**
   * 🧹 AUTO CLEANUP: Clean up matches where creators are inactive
   */
  private async cleanupInactiveCreatorMatches(): Promise<void> {
    try {
      const now = Date.now();
      const inactiveCreators: string[] = [];

      // Find matches with inactive creators
      for (const [matchId, activity] of this.creatorActivity.entries()) {
        const timeSinceLastSeen = now - activity.lastSeen;
        
        if (!activity.isConnected || timeSinceLastSeen > this.CREATOR_TIMEOUT) {
          inactiveCreators.push(matchId);
          this.logger.log(`🚫 Creator inactive for match ${matchId}: ${Math.round(timeSinceLastSeen / 60000)}min ago`);
        }
      }

      if (inactiveCreators.length === 0) return;

      // Cancel matches with inactive creators
      const cancelledMatches = await this.prisma.match.updateMany({
        where: {
          id: { in: inactiveCreators },
          status: 'pending', // Only cancel pending matches
          player2Id: null // Only cancel matches without opponent
        },
        data: {
          status: 'cancelled'
        }
      });

      if (cancelledMatches.count > 0) {
        this.logger.log(`🧹 Cancelled ${cancelledMatches.count} matches due to inactive creators`);
        
        // Clean up tracking data
        inactiveCreators.forEach(matchId => {
          this.creatorActivity.delete(matchId);
        });
        
        // Clear cache
        this.availableMatchesCache.clear();
      }

    } catch (error) {
      this.logger.error('🧹 Cleanup of inactive creator matches failed:', error);
    }
  }

  /**
   * 🃏 PnL AUTO-RECORD: Automatically record PnL when matches complete
   */
  private async autoRecordMatchPnL(matchId: string): Promise<void> {
    try {
      this.logger.log(`🃏 Auto-recording PnL for completed match ${matchId}`);

      // Get match details
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true, username: true } },
          player2: { select: { id: true, wallet: true, username: true } },
          winner: { select: { id: true, wallet: true, username: true } }
        }
      });

      if (!match) {
        this.logger.warn(`Match ${matchId} not found for PnL auto-recording`);
        return;
      }

      // Only record PnL for completed matches with a winner
      if (match.status !== 'completed_awaiting_payout' || !match.winner) {
        this.logger.log(`Skipping PnL auto-recording for match ${matchId}: status=${match.status}, winner=${match.winner?.wallet || 'none'}`);
        return;
      }

      // Record PnL for both players
      const players = [match.player1, match.player2].filter(Boolean);
      
      for (const player of players) {
        if (!player) continue;

        const isWinner = player.wallet === match.winner?.wallet;
        const result = isWinner ? 'WIN' : 'LOSS';

        // Prepare PnL data
        const pnlData = {
          userId: player.id,
          matchId,
          gameType: match.gameType?.toUpperCase() || 'UNKNOWN',
          result: result as 'WIN' | 'LOSS',
          wagerAmount: match.wager,
          pnlAmount: isWinner ? match.wager : -match.wager, // Full profit/loss before fees (like Axiom shows)
          pnlPercentage: isWinner ? 100 : -100, // 100% profit (double money) or 100% loss
          finalAmount: isWinner ? match.wager * 2 : 0, // Total winnings or 0
          feeAmount: isWinner ? (match.wager * 0.065) : 0, // 6.5% platform fee on winnings only
          gameSpecific: match.gameData || {},
          cardData: {
            timestamp: new Date(),
            matchId,
            gameType: match.gameType,
            username: player.username,
            walletAddress: player.wallet
          }
        };

        // Store PnL record
        await this.pnlService.storePnLRecord(pnlData);
        this.logger.log(`🃏 PnL auto-recorded for player ${player.wallet}: ${result} in match ${matchId}`);
      }

    } catch (error) {
      this.logger.error(`Failed to auto-record PnL for match ${matchId}: ${error.message}`, error.stack);
      // Don't throw error - PnL recording failure shouldn't break match completion
    }
  }

  /**
   * 🧹 AUTO CLEANUP: Clean up expired and glitched matches
   */
  private async cleanupExpiredMatches(): Promise<void> {
    try {
      const now = new Date();
      const maxAge = new Date(now.getTime() - (this.MAX_MATCH_AGE_HOURS * 60 * 60 * 1000));
      
      this.logger.log(`🧹 Starting cleanup of matches older than ${this.MAX_MATCH_AGE_HOURS} hours`);
      
      // Find matches to clean up - CONSERVATIVE APPROACH
      const matchesToCleanup = await this.prisma.match.findMany({
        where: {
          OR: [
            // 🎯 PRIMARY TARGET: Expired pending matches (Available Matches screen)
            {
              status: 'pending',
              createdAt: {
                lt: maxAge
              }
            },
            // 🎯 PRIMARY TARGET: Matches with expired expiry time (Available Matches screen)
            {
              status: 'pending',
              gameData: {
                path: ['expiryTime'],
                lt: now.toISOString()
              }
            },
            // 🚨 EMERGENCY ONLY: Stuck in-progress matches older than 6 hours (likely server crashes)
            {
              status: 'in_progress',
              createdAt: {
                lt: new Date(now.getTime() - (6 * 60 * 60 * 1000)) // 6 hours instead of 2
              }
            }
          ]
        },
        select: {
          id: true,
          gameType: true,
          status: true,
          createdAt: true,
          gameData: true
        }
      });

      if (matchesToCleanup.length === 0) {
        this.logger.log(`🧹 No matches to cleanup`);
        return;
      }

      this.logger.log(`🧹 Found ${matchesToCleanup.length} matches to cleanup`);

      // 🛡️ SAFETY CHECK: Filter out any matches that might have players currently connected
      const safeToCleanup = matchesToCleanup.filter(match => {
        // Only clean up 'pending' matches (Available Matches) or very old stuck matches
        if (match.status === 'pending') return true;
        
        // For in-progress matches, only clean up if they're really old (6+ hours)
        const ageHours = (now.getTime() - match.createdAt.getTime()) / (60 * 60 * 1000);
        return ageHours >= 6;
      });

      if (safeToCleanup.length === 0) {
        this.logger.log(`🧹 No safe matches to cleanup after safety filter`);
        return;
      }

      this.logger.log(`🧹 Safe to cleanup: ${safeToCleanup.length}/${matchesToCleanup.length} matches`);

      // Update matches to cancelled status
      const cleanupResult = await this.prisma.match.updateMany({
        where: {
          id: {
            in: safeToCleanup.map(m => m.id)
          }
        },
        data: {
          status: 'cancelled'
        }
      });

      this.logger.log(`🧹 Cleaned up ${cleanupResult.count} matches`);
      
      // Log details for debugging
      safeToCleanup.forEach(match => {
        const age = Math.round((now.getTime() - match.createdAt.getTime()) / (60 * 60 * 1000));
        this.logger.log(`🧹 Cleaned: ${match.id} (${match.gameType}, ${match.status}, ${age}h old)`);
      });

      // Clear cache to ensure fresh data
      this.availableMatchesCache.clear();
      
    } catch (error) {
      this.logger.error('🧹 Cleanup failed:', error);
    }
  }

  /**
   * 🧹 AUTO CLEANUP: Stop cleanup interval (for graceful shutdown)
   */
  private stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🧹 Stopped automatic cleanup');
    }
  }

  /**
   * 🧹 AUTO CLEANUP: Graceful shutdown hook
   */
  onModuleDestroy(): void {
    this.stopAutoCleanup();
  }

  /**
   * Create a new match
   */
  async createMatch(createMatchDto: CreateMatchDto): Promise<{ matchId: string; escrowAddress: string }> {
    const { gameType, wager, playerWallet, timeControl } = createMatchDto;

      // Validate game type - ALL 27 game types from smart contract
    const supportedGameTypes = [
      // Turn-based games
      'chess', 'chess-blitz', 'rock-paper-scissors', 'coin-flip',
      // Unity WebGL Games  
      'unity-racing', 'unity-fighting', 'unity-strategy', 'unity-sports', 'unity-puzzle',
      // HTML5 WebSocket Games
      'sports-heads', 'racing', 'fighting', 'platformer-battle', 'bubble-shooter', 'snake', 'tetris', 'breakout',
      // Quick Decision Games
      'crash', 'mines', 'reaction-ring', 'mind-stab', 'mirror-move', 'hi-lo',
      // Strategy/Logic Games
      'connect4', 'high-card-duel', 'math-duel', 'dice-duel'
    ];
    if (!supportedGameTypes.includes(gameType)) {
      throw new BadRequestException(`Unsupported game type: ${gameType}. Supported: ${supportedGameTypes.join(', ')}`);
      }

      // Validate wager amount
    if (wager < 0.1 || wager > 10) {
      throw new BadRequestException('Wager must be between 0.1 and 10 SOL');
      }

    // Generate unique match ID
    const matchId = this.generateMatchId(gameType, playerWallet);

    try {
      // First, ensure user exists in database
      let user = await this.prisma.user.findUnique({
        where: { wallet: playerWallet }
      });

      if (!user) {
        // Create user if doesn't exist
        user = await this.prisma.user.create({
          data: {
            wallet: playerWallet,
            username: `Player_${playerWallet.slice(-6)}`
          }
        });
        this.logger.log(`📝 Created new user: ${user.id} (${playerWallet})`);
      }

      // 🚨 CRITICAL FIX: Auto-cancel previous pending matches by this player
      const existingPendingMatches = await this.prisma.match.findMany({
        where: {
          player1Id: user.id,
          status: 'pending',
          player2Id: null
        }
      });

      if (existingPendingMatches.length > 0) {
        this.logger.log(`🧹 Auto-cancelling ${existingPendingMatches.length} previous pending matches for player ${playerWallet}`);
        
        // Cancel all previous pending matches
        await this.prisma.match.updateMany({
          where: {
            player1Id: user.id,
            status: 'pending',
            player2Id: null
          },
          data: {
            status: 'cancelled'
          }
        });

        // Handle refunds for any matches that had escrow
        for (const match of existingPendingMatches) {
          if (match.escrowAddress) {
            try {
              const escrowExists = await this.solanaService.checkEscrowExists(match.escrowAddress);
              if (escrowExists) {
                await this.solanaService.cancelMatchOnChain(match.escrowAddress);
                this.logger.log(`💰 Refunded cancelled match: ${match.id}`);
              }
            } catch (error) {
              this.logger.error(`❌ Failed to refund cancelled match ${match.id}:`, error.message);
            }
          }
        }
      }

      // ✅ Create match using session vault for frictionless gaming
      const escrowAddress = await this.solanaService.createMatchWithSessionVault(
        matchId,
        playerWallet,
        wager
        );

      // Save match to database
      const expiryTime = new Date(Date.now() + (this.DEFAULT_EXPIRY_MINUTES * 60 * 1000));
      
      const match = await this.prisma.match.create({
        data: {
          id: matchId,
          gameType,
          wager,
          status: 'pending',
          player1Id: user.id,
          escrowAddress,
          gameData: {
            timeControl: timeControl || '5+0',
            expiryTime: expiryTime.toISOString()
          }
        }
      });

      this.logger.log(`✅ ${gameType} match created: ${matchId}`);
      this.logger.log(`💰 Escrow: ${escrowAddress}`);
      this.logger.log(`🎮 Wager: ${wager} SOL`);
      this.logger.log(`📝 Database record saved: ${match.id}`);

      // ✅ CONNECTION TRACKING: Track creator activity for this match
      this.trackCreatorActivity(matchId, true);

      // 💬 Broadcast match creation to chat
      try {
        const playerName = user.username || `Player_${playerWallet.slice(0, 4)}...${playerWallet.slice(-2)}`;
        await this.chatService.broadcastGameEvent(gameType, {
          type: 'match_start',
          message: `🎯 ${playerName} created a new match (${wager} SOL)`,
          gameType,
          timestamp: Date.now()
        });
      } catch (error) {
        this.logger.error('Failed to broadcast match creation to chat:', error);
      }

      return {
        matchId,
        escrowAddress
      };

    } catch (error) {
      this.logger.error(`❌ Failed to create ${gameType} match:`, error.message);
      throw new BadRequestException(`Failed to create match: ${error.message}`);
    }
  }

  /**
   * Join an existing match
   */
  async joinMatch(joinMatchDto: JoinMatchDto): Promise<{ success: boolean; message: string; match: MatchResponse }> {
    const { matchId, playerWallet } = joinMatchDto;

    try {
      // Get match details from database
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: true,
          player2: true
        }
      });

      if (!match) {
        throw new BadRequestException(`Match not found: ${matchId}`);
      }

      if (match.status !== 'pending') {
        throw new BadRequestException(`Match is not available for joining. Status: ${match.status}`);
      }

      if (match.player1.wallet === playerWallet) {
        throw new BadRequestException('Cannot join your own match');
      }

      if (match.player2Id) {
        throw new BadRequestException('Match is already full');
      }

      // Check if match has expired
      const gameData = match.gameData as any;
      if (gameData?.expiryTime && new Date() > new Date(gameData.expiryTime)) {
        throw new BadRequestException('Match has expired');
      }

      // Ensure joiner user exists
      let joinerUser = await this.prisma.user.findUnique({
        where: { wallet: playerWallet }
      });

      if (!joinerUser) {
        joinerUser = await this.prisma.user.create({
          data: {
            wallet: playerWallet,
            username: `Player_${playerWallet.slice(-6)}`
          }
        });
      }

      // ✅ Join match using session vault for frictionless gaming
      await this.solanaService.joinMatchWithSessionVault(
        match.escrowAddress, // Use actual escrow address from database
        playerWallet
      );

      // Update match in database
      const updatedMatch = await this.prisma.match.update({
        where: { id: matchId },
        data: {
          player2Id: joinerUser.id,
          status: 'in_progress'
        },
        include: {
          player1: true,
          player2: true
        }
      });

      // ✅ CRITICAL FIX: Initialize coinflip match state when second player joins
      if (match.gameType === 'coin-flip') {
        this.coinFlipService.initializeMatch(
          matchId, 
          match.player1.wallet, 
          playerWallet
        );
        this.logger.log(`🎯 Initialized coinflip match state: ${matchId}`);
      }
      
      // ✅ CRITICAL FIX: Initialize crash match state when second player joins
      if (match.gameType === 'crash') {
        this.crashService.initializeMatch(
          matchId, 
          match.player1.wallet, 
          playerWallet
        );
        this.logger.log(`🚀 Initialized crash match state: ${matchId}`);
      }
      
      // ✅ CRITICAL FIX: Initialize mines match state when second player joins
      if (match.gameType === 'mines') {
        await this.minesService.initializeMatch(
          matchId, 
          match.player1.wallet, 
          playerWallet
        );
        this.logger.log(`💣 Initialized mines match state: ${matchId}`);
      }
      
      // ✅ Initialize other game types as needed
      if (match.gameType === 'rock-paper-scissors') {
        // RPS service initialization if needed
        this.logger.log(`🎯 RPS match ready: ${matchId}`);
      }
      
      if (match.gameType === 'dice-duel') {
        // Dice duel service initialization - match ready for both players
        this.logger.log(`🎲 Dice Duel match ready: ${matchId}`);
      }
      
      if (match.gameType === 'chess' || match.gameType === 'chess-blitz') {
        // Chess service initialization if needed
        this.logger.log(`🎯 Chess match ready: ${matchId}`);
      }

      this.logger.log(`✅ Player joined match: ${matchId}`);
      this.logger.log(`💰 Escrow: ${match.escrowAddress}`);
      this.logger.log(`🎮 Wager: ${match.wager} SOL`);

      // 🔥 CRITICAL FIX: Notify WebSocket clients that match is ready to start
      try {
        await this.matchGateway.notifyMatchJoined(matchId, playerWallet);
        this.logger.log(`🔔 WebSocket notification sent for match: ${matchId}`);
      } catch (wsError) {
        this.logger.warn(`⚠️ Failed to send WebSocket notification: ${wsError.message}`);
        // Don't fail the entire operation if WebSocket fails
      }

      return {
        success: true,
        message: 'Successfully joined match',
        match: this.formatMatchResponse(updatedMatch)
      };

    } catch (error) {
      this.logger.error(`❌ Failed to join match:`, error.message);
      throw new BadRequestException(`Failed to join match: ${error.message}`);
    }
  }

  /**
   * Submit match result with cryptographic verification
   */
  async submitResult(submitResultDto: SubmitResultDto, submitterUserId?: string): Promise<{ success: boolean; winner: string | null; cryptographicProof?: any }> {
    const { matchId, gameState, winnerWallet, signature } = submitResultDto;

    // ✅ CRITICAL: Atomic lock to prevent race conditions
    if (this.submissionLocks.has(matchId)) {
      await this.submissionLocks.get(matchId);
    }

    // ✅ CRITICAL: Check if result already submitted
    if (this.submittedResults.has(matchId)) {
      throw new BadRequestException('Match result already submitted');
    }

    // Create submission lock
    const submissionPromise = this.processResultSubmission(matchId, gameState, winnerWallet, signature, submitterUserId);
    this.submissionLocks.set(matchId, submissionPromise);

    try {
      const result = await submissionPromise;
      
      // Mark as submitted after successful processing
      this.submittedResults.add(matchId);
      
      return result;
    } finally {
      // Clean up lock
      this.submissionLocks.delete(matchId);
    }
  }

  private async processResultSubmission(matchId: string, gameState: any, winnerWallet: string, signature: string, submitterUserId?: string): Promise<{ success: boolean; winner: string | null; cryptographicProof?: any }> {
    try {
      // ✅ Get match details from database
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: true,
          player2: true
        }
      });

      if (!match) {
        throw new BadRequestException(`Match not found: ${matchId}`);
      }

      if (match.status !== 'in_progress') {
        throw new BadRequestException(`Match is not in progress. Status: ${match.status}`);
      }

      // ✅ SECURITY: Verify submitter is a player in the match
      if (submitterUserId) {
        const isPlayer1 = match.player1Id === submitterUserId;
        const isPlayer2 = match.player2Id === submitterUserId;
        
        if (!isPlayer1 && !isPlayer2) {
          throw new BadRequestException('Only players in the match can submit results');
        }
        
        this.logger.log(`✅ Result submitted by ${isPlayer1 ? 'Player 1' : 'Player 2'}: ${submitterUserId}`);
      }

      // Validate result based on game type
      const validationResult = await this.validateGameResult(match, gameState);

      if (!validationResult.isValid) {
        throw new BadRequestException('Invalid game result');
      }

      let cryptographicProof = null;

      // ✅ CRITICAL FIX: Update database FIRST to prevent race conditions
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'completed',
          winnerId: validationResult.winner ? 
            (validationResult.winner === match.player1.wallet ? match.player1Id : match.player2?.id) : 
            null,
          gameData: {
            ...(match.gameData as object || {}),
            finalGameState: gameState,
            completedAt: new Date().toISOString()
          }
        }
      });

      // Submit result to smart contract with Ed25519 verification
      if (validationResult.winner) {
        // ✅ SURGICAL PRECISION: Create verifiable signature before submitting
        cryptographicProof = await this.solanaService.createVerifiableResultSignature(
          match.escrowAddress, // Use escrow address as match identifier
          validationResult.winner,
          {
            gameType: match.gameType,
            finalState: gameState,
            moves: gameState.moves || gameState.rounds || [],
            result: 'win'
          }
        );

        this.logger.log(`🔐 Created cryptographic proof for match: ${matchId}`);
        this.logger.log(`🎯 Result hash: ${cryptographicProof.resultHash}`);
        this.logger.log(`🔑 Verifier: ${cryptographicProof.verifierPublicKey}`);

        // Submit to smart contract with Ed25519 verification
        const transactionHash = await this.solanaService.submitMatchResult(
          match.escrowAddress,
          validationResult.winner,
          cryptographicProof.signature,
          {
            gameType: match.gameType,
            finalState: gameState,
            moves: gameState.moves || gameState.rounds || [],
            result: 'win'
          }
        );

        this.logger.log(`✅ Smart contract submission successful - winner has been paid out`);

        // ✅ ONLY update database AFTER successful smart contract submission
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'completed',
            winnerId: validationResult.winner === match.player1.wallet ? match.player1.id : match.player2?.id,
            gameData: {
              ...(match.gameData as object || {}),
              finalGameState: gameState,
              completedAt: new Date().toISOString(),
              transactionHash: transactionHash, // Store the transaction hash
              cryptographicProof: {
                resultHash: cryptographicProof.resultHash,
                signature: cryptographicProof.signature,
                verifierPublicKey: cryptographicProof.verifierPublicKey,
                message: cryptographicProof.message,
                timestamp: cryptographicProof.timestamp,
                transactionHash: transactionHash // Also store in cryptographic proof
              }
            }
          }
        });

        this.logger.log(`✅ Database updated after successful payout`);

      } else {
        // Draw - refund both players
        await this.solanaService.refundMatch(match.escrowAddress);
      }

      // ✅ Award Proof Points to both players after successful match completion
      try {
        const player1User = await this.prisma.user.findUnique({ 
          where: { wallet: match.player1.wallet },
          select: {
            id: true,
            username: true,
            totalEarnings: true,
            totalMatches: true,
            referredBy: true,  // Single field for who referred them
            proofPoints: true
          }
        });
        const player2User = await this.prisma.user.findUnique({ 
          where: { wallet: match.player2.wallet },
          select: {
            id: true,
            username: true,
            totalEarnings: true,
            totalMatches: true,
            referredBy: true,  // Single field for who referred them
            proofPoints: true
          }
        });

        if (player1User) {
          await this.prestigeService.awardProofPoints(player1User.id, match.wager);
          this.logger.log(`🎖️ Awarded PP to Player 1: ${player1User.username} (${match.wager} SOL wager)`);

          // 💰 REVENUE-FOCUSED REFERRAL BONUSES
          if (player1User.referredBy) {
            // Award referral revenue share to their referrer
            await this.prestigeService.awardReferralRevShare(player1User.referredBy, player1User.id, match.wager);
            
            // 🎯 FIRST WAGER BONUS - Massive rewards for converting signups to revenue
            if (player1User.totalMatches === 1) {
              await this.awardFirstWagerBonus(player1User.id, match.wager);
            }
            
            // 🐋 VOLUME TIER BONUSES - Exponential rewards for big spenders
            await this.checkVolumeTierBonuses(player1User.id, player1User.totalEarnings + match.wager);
            
            // 🔥 WEEKLY VOLUME TRACKING - Keep users active
            await this.trackWeeklyVolume(player1User.id, match.wager);
          }

          // Check for MASSIVE referral bonuses (legacy - now smaller)
          await this.referralService.processFirstWagerBonus(player1User.id, match.wager);
          await this.referralService.checkRevenueMilestones(player1User.id, player1User.totalEarnings + match.wager);
          await this.referralService.processWhaleBonus(player1User.id, match.wager);
        }

        if (player2User) {
          await this.prestigeService.awardProofPoints(player2User.id, match.wager);
          this.logger.log(`🎖️ Awarded PP to Player 2: ${player2User.username} (${match.wager} SOL wager)`);

          // 💰 REVENUE-FOCUSED REFERRAL BONUSES
          if (player2User.referredBy) {
            // Award referral revenue share to their referrer
            await this.prestigeService.awardReferralRevShare(player2User.referredBy, player2User.id, match.wager);
            
            // 🎯 FIRST WAGER BONUS - Massive rewards for converting signups to revenue
            if (player2User.totalMatches === 1) {
              await this.awardFirstWagerBonus(player2User.id, match.wager);
            }
            
            // 🐋 VOLUME TIER BONUSES - Exponential rewards for big spenders
            await this.checkVolumeTierBonuses(player2User.id, player2User.totalEarnings + match.wager);
            
            // 🔥 WEEKLY VOLUME TRACKING - Keep users active
            await this.trackWeeklyVolume(player2User.id, match.wager);
          }

          // Check for first game bonus (MASSIVE 15k PP bonus)
          await this.referralService.processFirstWagerBonus(player2User.id, match.wager);
          
          // Check for milestone bonuses (MASSIVE 25k PP bonuses)
          await this.referralService.checkRevenueMilestones(player2User.id, player2User.totalEarnings + match.wager);
          
          // Check for whale referral bonuses (100k-500k PP bonuses)
          await this.referralService.processWhaleBonus(player2User.id, match.wager);
        }
      } catch (ppError) {
        // Don't fail the match if PP awarding fails, just log it
        this.logger.error(`⚠️ Failed to award Proof Points: ${ppError.message}`);
      }

      this.logger.log(`✅ Match result processed with cryptographic verification: ${matchId}`);
      this.logger.log(`💰 Escrow: ${match.escrowAddress}`);
      this.logger.log(`🏆 Winner: ${validationResult.winner || 'DRAW'}`);
      if (cryptographicProof) {
        this.logger.log(`🔐 Cryptographic proof stored for audit trail`);
      }

      // Update user stats in database
      await this.updateUserStats(match.player1Id, match.player2Id!, match.winnerId!, match.wager);
      
      // 🏆 CRITICAL: Update leaderboard cache to include this match
      try {
        await this.leaderboardService.updateLeaderboardCache();
        this.logger.log(`🏆 Leaderboard cache updated after match completion: ${matchId}`);
      } catch (leaderboardError) {
        // Don't fail the match if leaderboard update fails
        this.logger.error(`⚠️ Failed to update leaderboard cache: ${leaderboardError.message}`);
      }

      return {
        success: true,
        winner: validationResult.winner,
        cryptographicProof: cryptographicProof ? {
          resultHash: cryptographicProof.resultHash,
          verifierPublicKey: cryptographicProof.verifierPublicKey,
          timestamp: cryptographicProof.timestamp,
          // Provide verification endpoint for transparency
          verificationEndpoint: `/api/verify-result/${matchId}`
        } : undefined
      };

    } catch (error) {
      this.logger.error(`❌ Failed to submit result:`, error.message);
      throw new BadRequestException(`Failed to submit result: ${error.message}`);
    }
  }

  /**
   * Validate game result based on game type
   */
  private async validateGameResult(match: any, gameState: any): Promise<{ isValid: boolean; winner: string | null }> {
    const player1Wallet = match.player1.wallet;
    const player2Wallet = match.player2?.wallet;

    if (!player2Wallet) {
      throw new BadRequestException('Match does not have a second player');
    }

    switch (match.gameType) {
      case 'chess-blitz':
      case 'chess':
        return this.validateChessResult(match, gameState);
        
      case 'coin-flip':
        const coinFlipResult = this.coinFlipService.validateCoinFlipResult(
          match.id,
          player1Wallet,
          player2Wallet,
          gameState
        );
        
        // ✅ CRITICAL: Convert to smart contract format for blockchain submission
        if (coinFlipResult.isValid) {
          const contractFormat = this.coinFlipService.convertToSmartContractFormat(gameState);
          // Store contract format in match data for smart contract submission
          match.smartContractData = contractFormat;
        }
        
        return {
          isValid: coinFlipResult.isValid,
          winner: coinFlipResult.winner
        };
        
      case 'rock-paper-scissors':
        const rpsResult = this.rpsService.validateRPSResult(
          match.id,
          player1Wallet,
          player2Wallet,
          gameState
        );
        return {
          isValid: rpsResult.isValid,
          winner: rpsResult.winner
        };
        

      case 'crash':
        const crashResult = this.crashService.validateCrashResult(
          match.id,
          player1Wallet,
          player2Wallet,
          gameState
        );
        return {
          isValid: crashResult.isValid,
          winner: crashResult.winner
        };
        
      case 'mines':
        const minesResult = this.minesService.validateMinesResult(
          match.id,
          player1Wallet,
          player2Wallet,
          gameState
        );
        return {
          isValid: minesResult.isValid,
          winner: minesResult.winner
        };
        
      default:
        throw new BadRequestException(`Unsupported game type: ${match.gameType}`);
    }
  }

  /**
   * Validate chess game result
   */
  private validateChessResult(match: any, gameState: ChessGameState): { isValid: boolean; winner: string | null } {
    // ✅ FIXED: Get actual player wallet addresses from match data
    const whitePlayer = match.player1.wallet; // Creator is white
    const blackPlayer = match.player2?.wallet; // Joiner is black

    if (!blackPlayer) {
      throw new BadRequestException('Match does not have a second player');
    }

    const result = this.chessService.validateChessResult(
      match.id,
      whitePlayer,
      blackPlayer,
      gameState
    );

    return {
      isValid: result.isValid,
      winner: result.winner
    };
      }

  /**
   * Generate unique match ID
   */
  private generateMatchId(gameType: string, playerWallet: string): string {
    // Create a short ID with game prefix for organization, staying under 32-byte Solana limit
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    // Use 3-character game prefixes for easy identification
    const gamePrefix = gameType === 'rock-paper-scissors' ? 'rps' : 
                      gameType === GameType.Chess ? 'chs' :
                      gameType === 'coin-flip' ? 'cnf' :
                      gameType === 'dice-duel' ? 'dic' :
                      gameType === 'crash' ? 'crs' :
                      gameType === 'mines' ? 'min' : 'gme';
    
    // Hash for uniqueness and compactness
    const data = `${gameType}-${timestamp}-${random}-${playerWallet}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Format: 3-char prefix + underscore + 20-char hash = 24 bytes total
    // This stays well under the 32-byte limit with 8 bytes safety margin
    return `${gamePrefix}_${hash.substring(0, 20)}`;
  }

  /**
   * Get match status (placeholder)
   */
  async getMatchStatus(matchId: string): Promise<any> {
    // TODO: Implement match status retrieval
    return {
      matchId,
      status: 'active',
      gameType: 'chess-blitz'
    };
  }

  /**
   * Get match by ID
   */
  async getMatch(matchId: string): Promise<MatchResponse> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: {
          select: { id: true, wallet: true, username: true },
        },
        player2: {
          select: { id: true, wallet: true, username: true },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.formatMatchResponse(match);
  }

  /**
   * Get available matches for joining
   */
  async getAvailableMatches(gameType?: string, limit = 20, excludeWallet?: string): Promise<MatchResponse[]> {
    try {
      // 🚨 CRITICAL FIX: Filter out old matches from previous deployments
      const maxMatchAge = new Date();
      maxMatchAge.setHours(maxMatchAge.getHours() - 2); // Only show matches created in last 2 hours
      
      const whereClause: any = {
      status: 'pending',
        player2Id: null,
        // 🚨 DUAL FILTER: Check both expiry time AND creation time
        AND: [
          // Filter 1: Matches must be created within last 2 hours (prevents old deployment matches)
          {
            createdAt: {
              gte: maxMatchAge
            }
          },
          // Filter 2: If expiryTime exists, it must be in the future
          {
            OR: [
              // Either no expiryTime set (old format)
              {
                gameData: {
                  path: ['expiryTime'],
                  equals: null
                }
              },
              // Or expiryTime is in the future
              {
        gameData: {
          path: ['expiryTime'],
          gt: new Date().toISOString()
        }
              }
            ]
          }
        ]
    };

    if (gameType) {
        whereClause.gameType = gameType;
    }

    // 🚨 CRITICAL FIX: Exclude matches created by the requester to prevent self-joining
    if (excludeWallet) {
      whereClause.player1 = {
        wallet: {
          not: excludeWallet
        }
      };
    }

      // Invisible optimization: Only select needed fields to reduce data transfer
    const matches = await this.prisma.match.findMany({
        where: whereClause,
        select: {
          id: true,
          gameType: true,
          wager: true,
          status: true,
          createdAt: true,
          escrowAddress: true,
          gameData: true,
        player1: {
            select: {
              id: true,
              wallet: true,
              username: true
            }
          }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

      return matches.map(match => this.formatMatchResponse(match));
    } catch (error) {
      this.logger.error('Failed to get available matches:', error);
      throw new BadRequestException('Failed to retrieve matches');
    }
  }

  /**
   * Get user matches with optimized queries
   */
  async getUserMatches(userId: string, limit = 50): Promise<MatchResponse[]> {
    try {
      // Invisible optimization: Only select necessary fields
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [
          { player1Id: userId },
            { player2Id: userId }
          ]
      },
        select: {
          id: true,
          gameType: true,
          wager: true,
          status: true,
          createdAt: true,
          endedAt: true,
          escrowAddress: true,
          gameData: true,
          transactionId: true,
        player1: {
            select: {
              id: true,
              wallet: true,
              username: true
            }
        },
        player2: {
            select: {
              id: true,
              wallet: true,
              username: true
            }
        },
          winner: {
            select: {
              id: true,
              wallet: true,
              username: true
            }
          }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return matches.map(match => this.formatMatchResponse(match));
    } catch (error) {
      this.logger.error('Failed to get user matches:', error);
      throw new BadRequestException('Failed to retrieve user matches');
    }
  }

  /**
   * Cancel a match (only creator can cancel before someone joins)
   */
  async cancelMatch(userId: string, matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.player1Id !== userId) {
      throw new UnauthorizedException('Only the match creator can cancel the match');
    }

    if (match.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending matches');
    }

    if (match.player2Id) {
      throw new BadRequestException('Cannot cancel match after another player has joined');
    }

    // Update match status to cancelled
    await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'cancelled' },
      });

    // Check if escrow was created and user actually paid
    if (match.escrowAddress) {
      try {
        this.logger.log(`🔍 Checking if refund needed for match ${matchId} with escrow ${match.escrowAddress}`);
        
        // Try to get the match account data to see if funds were actually deducted
        const escrowExists = await this.solanaService.checkEscrowExists(match.escrowAddress);
        
        if (escrowExists) {
          this.logger.log(`💰 Escrow exists - user paid for match. Cancelling on-chain with automatic refund...`);
          
          // Cancel match on-chain (this automatically handles the refund)
          await this.solanaService.cancelMatchOnChain(match.escrowAddress);
          
          this.logger.log(`✅ Match cancelled and refunded ${matchId} - user gets wager back, fees consumed`);
        } else {
          this.logger.log(`ℹ️ No escrow found - user didn't pay. No refund needed for match ${matchId}`);
        }
        
    } catch (error) {
        this.logger.error(`❌ Failed to process refund for match ${matchId}:`, error.message);
        // Continue with cancellation even if refund fails - don't block user
        this.logger.warn(`⚠️ Continuing with match cancellation despite refund error`);
      }
    } else {
      this.logger.log(`ℹ️ No escrow address - match was never funded. No refund needed for ${matchId}`);
    }

    this.logger.log(`✅ Match cancelled: ${matchId} by user ${userId}`);
  }

  /**
   * Format match response
   */
  private formatMatchResponse(match: any): MatchResponse {
    return {
      id: match.id,
      gameType: match.gameType,
      wager: match.wager,
      status: match.status,
      createdAt: match.createdAt,
      expiryTime: match.gameData?.expiryTime ? new Date(match.gameData.expiryTime) : undefined,
      player1: match.player1,
      player2: match.player2 || undefined,
      winner: match.winner || undefined,
      escrowAddress: match.escrowAddress || undefined,
      gameData: match.gameData || undefined,
    };
  }

  // ============= GAME CATEGORY METHODS =============

  /**
   * Get games by category using direct string-based mapping
   */
  async getAvailableMatchesByCategory(category: GameCategory, limit = 20): Promise<MatchResponse[]> {
    const gameTypesForCategory = this.getGameTypesForCategory(category);

    if (gameTypesForCategory.length === 0) {
      return [];
    }

    // Get matches for all supported game types in this category
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'pending',
        gameType: {
          in: gameTypesForCategory
        }
      },
      include: {
        player1: {
          select: { id: true, wallet: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Filter expired matches
    const now = new Date();
    const validMatches = matches.filter(match => {
      if (!match.gameData) return true;
      const gameData = match.gameData as any;
      if (!gameData.expiryTime) return true;
      const expiryTime = new Date(gameData.expiryTime);
      return expiryTime > now;
    });

    return validMatches.map(match => this.formatMatchResponse(match));
  }

  /**
   * Get turn-based matches
   */
  async getTurnBasedMatches(limit = 20): Promise<MatchResponse[]> {
    return await this.getAvailableMatchesByCategory(GameCategory.TurnBased, limit);
  }

  /**
   * Get real-time HTML5 matches
   */
  async getRealtimeHTML5Matches(limit = 20): Promise<MatchResponse[]> {
    return await this.getAvailableMatchesByCategory(GameCategory.RealtimeHTML5, limit);
  }

  /**
   * Get real-time Unity matches
   */
  async getRealtimeUnityMatches(limit = 20): Promise<MatchResponse[]> {
    return await this.getAvailableMatchesByCategory(GameCategory.RealtimeUnity, limit);
  }

  /**
   * Get game types for a specific category
   */
  private getGameTypesForCategory(category: GameCategory): string[] {
    switch (category) {
      case GameCategory.TurnBased:
        return ['chess', 'chess-blitz', 'rock-paper-scissors', 'coin-flip'];
      case GameCategory.RealtimeHTML5:
        return ['sports-heads', 'racing', 'fighting', 'platformer-battle', 'bubble-shooter', 'snake', 'tetris', 'breakout'];
      case GameCategory.RealtimeUnity:
        return ['unity-racing', 'unity-fighting', 'unity-strategy', 'unity-sports', 'unity-puzzle'];
      default:
        return [];
    }
  }

  /**
   * Get game category for a game type string
   */
  getMatchGameCategory(gameType: string): GameCategory | null {
    if (this.getGameTypesForCategory(GameCategory.TurnBased).includes(gameType)) {
      return GameCategory.TurnBased;
    }
    if (this.getGameTypesForCategory(GameCategory.RealtimeHTML5).includes(gameType)) {
      return GameCategory.RealtimeHTML5;
    }
    if (this.getGameTypesForCategory(GameCategory.RealtimeUnity).includes(gameType)) {
      return GameCategory.RealtimeUnity;
    }
    return null;
  }

  /**
   * 🎯 FIRST WAGER BONUS - Convert signups to revenue
   * This is the most important referral metric
   */
  private async awardFirstWagerBonus(userId: string, wagerAmount: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true, totalMatches: true },
    });

    if (!user?.referredBy || user.totalMatches !== 1) return;

    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredBy },
      select: { username: true, prestige: true, proofPoints: true, totalProofPoints: true },
    });

    if (!referrer) return;

    // 🚀 MASSIVE first wager bonuses based on wager size
    let bonusMultiplier = 1;
    let tierLabel = 'STARTER';
    
    if (wagerAmount >= 50) {
      bonusMultiplier = 20;      // 20x for 50+ SOL first wager (WHALE CONVERSION)
      tierLabel = '🐋 WHALE CONVERSION';
    } else if (wagerAmount >= 20) {
      bonusMultiplier = 15;      // 15x for 20+ SOL first wager (BIG FISH)
      tierLabel = '🦈 BIG FISH CONVERSION';
    } else if (wagerAmount >= 10) {
      bonusMultiplier = 10;      // 10x for 10+ SOL first wager (FISH)
      tierLabel = '🐟 FISH CONVERSION';
    } else if (wagerAmount >= 5) {
      bonusMultiplier = 7;       // 7x for 5+ SOL first wager (DOLPHIN)
      tierLabel = '🐬 DOLPHIN CONVERSION';
    } else if (wagerAmount >= 1) {
      bonusMultiplier = 5;       // 5x for 1+ SOL first wager (MINNOW)
      tierLabel = '🦐 MINNOW CONVERSION';
    } else {
      bonusMultiplier = 2;       // 2x for sub-1 SOL first wager
      tierLabel = '🐠 MICRO CONVERSION';
    }

    // Calculate massive PP bonus (base: 2000 PP per SOL wagered)
    const basePP = Math.floor(wagerAmount * 2000 * bonusMultiplier);
    
    // Apply prestige multiplier
    const prestigeMultiplier = this.getPrestigeMultiplier(referrer.prestige);
    const finalPP = Math.floor(basePP * prestigeMultiplier);

    // Award the conversion bonus
    await this.prisma.user.update({
      where: { id: user.referredBy },
      data: {
        proofPoints: referrer.proofPoints + finalPP,
        totalProofPoints: referrer.totalProofPoints + finalPP,
        referralPP: { increment: finalPP },
        referralEarnings: { increment: wagerAmount * 0.1 }, // 10% of wager as "earnings"
      },
    });

    this.logger.log(`🚀 ${tierLabel}: ${referrer.username} earned ${finalPP} PP for converting ${user.username} (${wagerAmount} SOL first wager)!`);
  }

  /**
   * 🐋 VOLUME TIER BONUSES - Exponential rewards for big spenders
   */
  private async checkVolumeTierBonuses(userId: string, totalWagered: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy) return;

    // 🐋 WHALE TIER SYSTEM - Exponentially increasing rewards
    const volumeTiers = [
      { threshold: 2000, bonus: 5000000, label: 'LEVIATHAN', emoji: '🦑' },    // 2000 SOL = 5M PP
      { threshold: 1000, bonus: 2000000, label: 'KRAKEN', emoji: '🐙' },      // 1000 SOL = 2M PP  
      { threshold: 500, bonus: 800000, label: 'MEGALODON', emoji: '🦈' },     // 500 SOL = 800k PP
      { threshold: 250, bonus: 300000, label: 'GREAT WHITE', emoji: '🦈' },   // 250 SOL = 300k PP
      { threshold: 100, bonus: 100000, label: 'WHALE', emoji: '🐋' },         // 100 SOL = 100k PP
      { threshold: 50, bonus: 40000, label: 'ORCA', emoji: '🐋' },            // 50 SOL = 40k PP
      { threshold: 25, bonus: 15000, label: 'DOLPHIN', emoji: '🐬' },         // 25 SOL = 15k PP
      { threshold: 10, bonus: 5000, label: 'FISH', emoji: '🐟' },             // 10 SOL = 5k PP
    ];

    for (const tier of volumeTiers) {
      if (totalWagered >= tier.threshold) {
        // Check if this tier bonus was already awarded (simplified check)
        const alreadyAwarded = await this.checkVolumeTierAwarded(user.referredBy, userId, tier.threshold);
        
        if (!alreadyAwarded) {
          await this.awardVolumeTierBonus(user.referredBy, userId, tier.bonus, tier.label, tier.emoji);
        }
        break; // Award highest tier only
      }
    }
  }

  /**
   * 🔥 WEEKLY VOLUME TRACKING - Keep users active
   */
  private async trackWeeklyVolume(userId: string, wagerAmount: number): Promise<void> {
    // This would track weekly volume and award bonuses
    // For now, simplified implementation
    this.logger.log(`📊 Tracking weekly volume: ${wagerAmount} SOL for user ${userId}`);
  }

  /**
   * Helper: Get prestige multiplier
   */
  private getPrestigeMultiplier(prestige: number): number {
    const multipliers = [1.0, 1.5, 2.5, 4.0, 10.0]; // Mortal, Spartan, Olympian, Divine, GODMODE
    return multipliers[prestige] || 1.0;
  }

  /**
   * Helper: Check if volume tier bonus was already awarded
   */
  private async checkVolumeTierAwarded(referrerId: string, referredId: string, threshold: number): Promise<boolean> {
    // Simplified check - in production, use a separate tracking table
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { referralPP: true },
    });
    
    // Basic check based on current PP (simplified)
    return (referrer?.referralPP || 0) > threshold * 1000;
  }

  /**
   * Helper: Award volume tier bonus
   */
  private async awardVolumeTierBonus(referrerId: string, referredId: string, basePP: number, tierLabel: string, emoji: string): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, username: true },
    });

    if (!referrer) return;

    const prestigeMultiplier = this.getPrestigeMultiplier(referrer.prestige);
    const finalPP = Math.floor(basePP * prestigeMultiplier);

    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        proofPoints: referrer.proofPoints + finalPP,
        totalProofPoints: referrer.totalProofPoints + finalPP,
        referralPP: { increment: finalPP },
      },
    });

    this.logger.log(`${emoji} ${tierLabel}: ${referrer.username} earned ${finalPP} PP (${basePP} × ${prestigeMultiplier}x prestige)!`);
  }

  /**
   * Process payout after frontend confirms ready
   */
  async processMatchPayout(matchId: string): Promise<{ success: boolean; message: string; transactionHash?: string }> {
    const lockKey = `payout_lock_${matchId}`;
    
    // Prevent concurrent payout processing
    if (this.submissionLocks.has(lockKey)) {
      return { success: false, message: 'Payout already in progress' };
    }

    const lockPromise = this._processMatchPayoutInternal(matchId);
    this.submissionLocks.set(lockKey, lockPromise);

    try {
      return await lockPromise;
    } finally {
      this.submissionLocks.delete(lockKey);
    }
  }

  /**
   * 💰 ABANDONMENT PAYOUT: Handle 50/50 penalty split for abandoned matches
   */
  async processAbandonmentPayout(matchId: string): Promise<{ success: boolean; message: string; transactionHash?: string }> {
    try {
      this.logger.log(`💰 Processing abandonment payout for match ${matchId}`);
      
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true } },
          player2: { select: { id: true, wallet: true } }
        }
      });

      if (!match) {
        return { success: false, message: 'Match not found' };
      }

      const gameData = match.gameData as any;
      if (!gameData?.abandonmentWin) {
        return { success: false, message: 'Not an abandonment match' };
      }

      const winnerWallet = gameData.matchWinner;
      const abandonedPlayer = gameData.abandonedPlayer;
      const wagerAmount = 100; // TODO: Get from match data

      // 💰 ABANDONMENT PENALTY CALCULATION
      // Winner gets: 150% (their stake + 50% of opponent's stake)
      // Platform gets: 50% of abandoned player's stake as penalty
      const winnerAmount = wagerAmount * 1.5; // 150% of original wager
      const platformPenalty = wagerAmount * 0.5; // 50% penalty from abandoned player

      try {
        // Call smart contract with winner (abandonment is handled in game data)
        const transactionHash = await this.solanaService.submitMatchResult(
          match.escrowAddress,
          winnerWallet,
          gameData
        );

        // Update match status
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'completed',
            gameData: {
              ...gameData,
              payoutStatus: 'completed',
              payoutType: 'abandonment_penalty',
              transactionHash,
              payoutBreakdown: {
                winnerAmount,
                platformPenalty,
                abandonedPlayer,
                penaltyRate: 0.5
              }
            } as any
          }
        });

        this.logger.log(`✅ Abandonment payout completed: Winner ${winnerWallet} gets ${winnerAmount}, Platform penalty ${platformPenalty}`);
        
        return { 
          success: true, 
          message: 'Abandonment payout completed successfully',
          transactionHash 
        };

      } catch (contractError) {
        this.logger.error(`❌ Smart contract abandonment payout failed: ${contractError.message}`);
        
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            gameData: {
              ...gameData,
              payoutStatus: 'failed',
              payoutError: contractError.message
            } as any
          }
        });

        return { 
          success: false, 
          message: `Abandonment payout failed: ${contractError.message}` 
        };
      }

    } catch (error) {
      this.logger.error(`❌ Error processing abandonment payout: ${error.message}`);
      return {
        success: false,
        message: `Internal error: ${error.message}`
      };
    }
  }

  private async _processMatchPayoutInternal(matchId: string): Promise<{ success: boolean; message: string; transactionHash?: string }> {
    try {
      this.logger.log(`💰 Processing payout for match ${matchId}`);
      
      // Get match details
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true } },
          player2: { select: { id: true, wallet: true } }
        }
      });

      if (!match) {
        return { success: false, message: 'Match not found' };
      }

      if (match.status !== 'completed_awaiting_payout') {
        return { success: false, message: `Match status is ${match.status}, expected completed_awaiting_payout` };
      }

      const gameData = match.gameData as any;
      
      // Handle different game types - RPS and Dice Duel store winner directly, CoinFlip uses finalGameState, Mines uses winner field
      let matchWinner: string | null = null;
      let gameState: any = null;
      
      if (match.gameType === 'rock-paper-scissors' || match.gameType === 'dice_duel') {
        // RPS and Dice Duel store winner directly in gameData
        matchWinner = gameData?.matchWinner;
        gameState = gameData;
      } else if (match.gameType === 'mines') {
        // Mines stores winner in MinesGameState.winner field
        matchWinner = gameData?.winner;
        gameState = gameData;
        this.logger.log(`💣 Mines payout - looking for winner in gameData.winner: ${matchWinner}`);
      } else {
        // CoinFlip and other games use finalGameState
        const finalGameState = gameData?.finalGameState;
        matchWinner = finalGameState?.matchWinner;
        gameState = finalGameState;
      }

      if (!matchWinner) {
        return { success: false, message: 'No winner found in match data' };
      }

      // Process payout based on game result
      if (matchWinner) {
        try {
          // Create cryptographic proof
          const cryptographicProof = await this.solanaService.createVerifiableResultSignature(
            match.escrowAddress,
            matchWinner,
            {
              gameType: match.gameType,
              finalState: gameState,
              rounds: gameState.rounds,
              result: 'win'
            }
          );

          this.logger.log(`🔐 Created cryptographic proof for ${match.gameType} match ${matchId}`);
          this.logger.log(`🏆 Winner: ${matchWinner}`);

          // Submit to smart contract
          const transactionHash = await this.solanaService.submitMatchResult(
            match.escrowAddress,
            matchWinner,
            cryptographicProof.signature,
            {
              gameType: match.gameType,
              finalState: gameState,
              rounds: gameState.rounds,
              result: 'win'
            }
          );

          this.logger.log(`✅ Smart contract submission successful - winner has been paid out`);

          // Update database after successful payout
          await this.prisma.match.update({
            where: { id: matchId },
            data: {
              status: 'completed',
              winnerId: matchWinner === match.player1.wallet ? match.player1.id : match.player2?.id,
              gameData: {
                ...gameData,
                payoutStatus: 'completed',
                transactionHash: transactionHash,
                cryptographicProof: {
                  resultHash: cryptographicProof.resultHash,
                  signature: cryptographicProof.signature,
                  verifierPublicKey: cryptographicProof.verifierPublicKey,
                  message: cryptographicProof.message,
                  timestamp: cryptographicProof.timestamp,
                  transactionHash: transactionHash
                }
              } as any
            }
          });

          this.logger.log(`✅ Database updated after successful payout`);

          // Clean up from memory based on game type
          if (match.gameType === 'coin-flip') {
            this.coinFlipService.cleanupMatch(matchId);
          } else if (match.gameType === 'rock-paper-scissors') {
            // RPS cleanup if needed
          } else if (match.gameType === 'mines') {
            // Clear any remaining timeout for this match
            this.clearMinesRoundTimeout(matchId);
          }

          return { 
            success: true, 
            message: 'Payout completed successfully', 
            transactionHash 
          };

        } catch (smartContractError) {
          this.logger.error(`❌ CRITICAL: Smart contract submission failed - winner not paid: ${smartContractError.message}`);
          
          // Update payout status to failed
          await this.prisma.match.update({
            where: { id: matchId },
            data: {
              gameData: {
                ...gameData,
                payoutStatus: 'failed',
                payoutError: smartContractError.message
              } as any
            }
          });

          return { 
            success: false, 
            message: `Payout failed: ${smartContractError.message}` 
          };
        }
      } else {
        // Draw - refund both players
        try {
          await this.solanaService.refundMatch(match.escrowAddress);
          this.logger.log(`🤝 ${match.gameType} match ${matchId} ended in draw - both players refunded`);
          
          // Update database after successful refund
          await this.prisma.match.update({
            where: { id: matchId },
            data: {
              status: 'completed',
              winnerId: null,
              gameData: {
                ...gameData,
                payoutStatus: 'refunded'
              } as any
            }
          });
          
          // Clean up from memory based on game type
          if (match.gameType === 'coin-flip') {
            this.coinFlipService.cleanupMatch(matchId);
          } else if (match.gameType === 'mines') {
            // Clear any remaining timeout for this match
            this.clearMinesRoundTimeout(matchId);
          }

          return {
            success: true, 
            message: 'Refund completed successfully' 
          };
          
        } catch (refundError) {
          this.logger.error(`❌ CRITICAL: Refund failed for draw: ${refundError.message}`);
          
          // Update refund status to failed
          await this.prisma.match.update({
            where: { id: matchId },
            data: {
              gameData: {
                ...gameData,
                payoutStatus: 'refund_failed',
                payoutError: refundError.message
              } as any
            }
          });

          return {
            success: false, 
            message: `Refund failed: ${refundError.message}` 
          };
        }
      }

    } catch (error) {
      this.logger.error(`❌ Error processing payout: ${error.message}`);
      return {
        success: false, 
        message: `Internal error: ${error.message}` 
      };
    }
  }

  /**
   * Verify match payout
   */
  async verifyMatchPayout(matchId: string): Promise<any> {
    try {
      // Get match from database
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true, username: true } },
          player2: { select: { id: true, wallet: true, username: true } },
          winner: { select: { id: true, wallet: true, username: true } }
        }
      });

      if (!match) {
        return { error: 'Match not found' };
      }

      // ✅ FIX: Handle both completed and awaiting payout status
      if (match.status !== 'completed' && match.status !== 'completed_awaiting_payout') {
        return { 
          error: 'Match not completed yet',
          status: match.status,
          message: 'Payout verification only available for completed matches'
        };
      }

      if (!match.winner) {
        return {
          error: 'No winner determined',
          message: 'This match ended in a draw or was cancelled'
        };
      }

      // Extract cryptographic proof and transaction data from gameData
      const gameData = match.gameData as any;
      const cryptographicProof = gameData?.cryptographicProof;
      const transactionHash = gameData?.transactionHash || cryptographicProof?.transactionHash;
      const payoutStatus = gameData?.payoutStatus;
      const payoutError = gameData?.payoutError;

      // ✅ FIX: Handle failed payouts
      if (payoutStatus === 'failed') {
        return {
          error: 'Payout failed',
          message: payoutError || 'Smart contract transaction failed',
          matchId: match.id,
          winner: match.winner,
          status: match.status,
          payoutStatus: 'failed',
          payoutError: payoutError,
          recommendation: 'Contact support with this match ID for assistance'
        };
      }

      if (!cryptographicProof) {
        return {
          error: 'No cryptographic proof found',
          message: 'This match may have been completed before the verification system was implemented',
          matchId: match.id,
          winner: match.winner,
          status: match.status
        };
      }

      // Calculate expected payout amounts
      const totalPot = match.wager * 2;
      const platformFee = totalPot * 0.065; // 6.5%
      const treasuryFee = totalPot * 0.055; // 5.5%
      const referralFee = totalPot * 0.01;  // 1%
      const winnerAmount = totalPot - platformFee;

      // Get smart contract transaction status and details
      let blockchainVerification = null;
      let transactionDetails = null;
      
      if (transactionHash) {
        try {
          // Get detailed transaction information
          transactionDetails = await this.solanaService.getTransactionDetails(transactionHash);
          
          // Check if the smart contract transaction actually happened
          const escrowData = await this.solanaService.getEscrowData(match.escrowAddress);
          blockchainVerification = {
            transactionFound: !transactionDetails.error,
            transactionStatus: transactionDetails.status,
            escrowExists: !!escrowData,
            escrowData: escrowData,
            payoutVerified: transactionDetails.status === 'success' && transactionDetails.transfers?.length > 0
          };
        } catch (error) {
          blockchainVerification = {
            error: `Failed to verify blockchain: ${error.message}`
          };
        }
      } else {
        blockchainVerification = {
          error: 'No transaction hash found - match may have been completed before transaction tracking was implemented'
        };
      }

      return {
        matchId: match.id,
        gameType: match.gameType,
        wager: match.wager,
        status: match.status,
        completedAt: gameData?.completedAt,
        
        // Winner Information
        winner: {
          wallet: match.winner.wallet,
          username: match.winner.username,
          expectedPayout: winnerAmount
        },
        
        // Payout Breakdown
        payoutBreakdown: {
          totalPot: totalPot,
          platformFee: platformFee,
          treasuryFee: treasuryFee,
          referralFee: referralFee,
          winnerReceives: winnerAmount,
          feePercentage: '6.5%'
        },
        
        // Cryptographic Verification
        cryptographicProof: {
          resultHash: cryptographicProof.resultHash,
          signature: cryptographicProof.signature,
          verifierPublicKey: cryptographicProof.verifierPublicKey,
          timestamp: cryptographicProof.timestamp,
          transactionHash: transactionHash
        },
        
        // Transaction Details (if available)
        transactionDetails: transactionDetails,
        
        // Blockchain Verification
        blockchainVerification: blockchainVerification,
        
        // Smart Contract Details
        smartContract: {
          programId: '7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W',
          escrowAddress: match.escrowAddress,
          network: 'devnet'
        },
        
        // Instructions for Manual Verification
        manualVerification: {
          steps: [
            '1. Copy the winner wallet address',
            '2. Go to https://explorer.solana.com (switch to devnet)',
            '3. Search for the winner wallet address',
            '4. Look for incoming SOL transaction around the completion time',
            '5. Verify the amount matches the expected payout',
            transactionHash ? '6. Or directly check the transaction hash below' : '6. No transaction hash available for direct verification'
          ],
          explorerUrl: `https://explorer.solana.com/address/${match.winner.wallet}?cluster=devnet`,
          transactionUrl: transactionHash ? `https://explorer.solana.com/tx/${transactionHash}?cluster=devnet` : null,
          expectedAmount: `${(winnerAmount / 1000000000).toFixed(4)} SOL`,
          timeWindow: gameData?.completedAt
        },
        
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error verifying payout for match ${matchId}: ${error.message}`);
      return { 
        error: 'Failed to verify payout',
        details: error.message,
        matchId: matchId
      };
    }
  }

  /**
   * Debug method to check match and smart contract status
   */
  async debugMatchStatus(matchId: string): Promise<any> {
    try {
      // Get match from database
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true, username: true } },
          player2: { select: { id: true, wallet: true, username: true } },
          winner: { select: { id: true, wallet: true, username: true } }
        }
      });

      if (!match) {
        return { error: 'Match not found in database' };
      }

      // Get smart contract status
      let smartContractStatus = null;
      try {
        const escrowData = await this.solanaService.getEscrowData(match.escrowAddress);
        smartContractStatus = escrowData;
      } catch (error) {
        smartContractStatus = { error: error.message };
      }

      // Get coinflip state if applicable
      let coinflipState = null;
      if (match.gameType === 'coin-flip' || match.gameType === 'coinflip') {
        coinflipState = this.coinFlipService.getMatchState(matchId);
      }

      return {
        database: {
          matchId: match.id,
          status: match.status,
          gameType: match.gameType,
          wager: match.wager,
          escrowAddress: match.escrowAddress,
          player1: match.player1,
          player2: match.player2,
          winner: match.winner,
          createdAt: match.createdAt,
          gameData: match.gameData
        },
        smartContract: smartContractStatus,
        coinflipState: coinflipState,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error debugging match status: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Get recent completed matches for verification display
   */
  async getRecentCompletedMatches(limit: number = 10): Promise<any[]> {
    try {
      const matches = await this.prisma.match.findMany({
        where: {
          status: 'completed',
          winnerId: { not: null }
        },
        include: {
          player1: { select: { id: true, wallet: true, username: true } },
          player2: { select: { id: true, wallet: true, username: true } },
          winner: { select: { id: true, wallet: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return matches.map(match => ({
        id: match.id,
        gameType: match.gameType,
        wager: match.wager,
        status: match.status,
        winner: match.winner,
        createdAt: match.createdAt,
        completedAt: match.completedAt,
        escrowAddress: match.escrowAddress,
        transactionHash: (match.gameData as any)?.transactionHash
      }));
    } catch (error) {
      this.logger.error(`Failed to get recent completed matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Get match with full details for Oracle verification
   */
  async getMatchWithDetails(matchId: string): Promise<any> {
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: {
            select: {
              id: true,
              wallet: true,
              username: true,
              displayName: true,
            }
          },
          player2: {
            select: {
              id: true,
              wallet: true,
              username: true,
              displayName: true,
            }
          },
          winner: {
            select: {
              id: true,
              wallet: true,
              username: true,
              displayName: true,
            }
          }
        }
      });

      if (!match) {
        return null;
      }

      return {
        id: match.id,
        gameType: match.gameType,
        status: match.status,
        wager: match.wager,
        player1: match.player1,
        player2: match.player2,
        winner: match.winner,
        createdAt: match.createdAt,
        completedAt: match.completedAt,
        escrowAddress: match.escrowAddress,
        gameData: match.gameData,
        transactionHash: (match.gameData as any)?.transactionHash
      };
    } catch (error) {
      this.logger.error(`Failed to get match with details: ${error.message}`);
      return null;
    }
  }

  /**
   * Get match verification data for cryptographic proof
   */
  async getMatchVerificationData(matchId: string): Promise<any> {
    try {
      const match = await this.getMatchWithDetails(matchId);
      
      if (!match) {
        return { isValid: false, error: 'Match not found' };
      }

      const gameData = match.gameData as any;
      const cryptographicProof = gameData?.cryptographicProof;

      if (!cryptographicProof) {
        return { isValid: false, error: 'No cryptographic proof found' };
      }

      // Verify the signature
      const isValid = SolanaService.verifyResultSignature(
            match.escrowAddress,
        match.winner?.wallet || '',
        cryptographicProof.resultHash,
        cryptographicProof.signature,
        cryptographicProof.verifierPublicKey
      );

      return {
        isValid,
        proof: cryptographicProof,
        randomnessSource: 'Server-side cryptographic randomness with Ed25519 signature verification',
        verificationMethod: 'Ed25519 signature verification',
        securityLevel: 'Military-grade cryptographic proof'
      };
    } catch (error) {
      this.logger.error(`Failed to get match verification data: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Get coinflip-specific verification data
   */
  async getCoinFlipVerificationData(matchId: string): Promise<any> {
    try {
      const match = await this.getMatchWithDetails(matchId);
      
      if (!match) {
        return { error: 'Match not found' };
      }

      if (match.gameType !== 'coin-flip') {
        return { error: 'Not a coinflip match' };
      }

      const gameData = match.gameData as any;
      const finalGameState = gameData?.finalGameState;
      const rounds = finalGameState?.rounds || [];

      // Generate cryptographic proof for verification
      const cryptographicProof = await this.solanaService.createVerifiableResultSignature(
            match.escrowAddress,
        match.winner?.wallet || '',
            {
              gameType: 'coin-flip',
              finalState: finalGameState,
          rounds: rounds
        }
      );

      return {
        rounds: rounds,
        finalScore: {
          player1Score: finalGameState?.player1Score || 0,
          player2Score: finalGameState?.player2Score || 0,
          requiredWins: finalGameState?.requiredWins || 3
        },
        cryptographicProof: cryptographicProof,
        serverSignature: cryptographicProof.signature,
                  verificationInstructions: {
          description: "This coinflip result is cryptographically verifiable",
                    steps: [
            "1. Verify Ed25519 signature using verifier public key",
            "2. Check that result hash matches game data",
            "3. Verify randomness source and fairness",
            "4. Check blockchain transaction for on-chain proof"
          ]
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get coinflip verification data: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Process coinflip choice from player
   */
  async processCoinFlipChoice(matchId: string, playerWallet: string, choice: 'heads' | 'tails'): Promise<{
    success: boolean;
    gameState: any;
    bothPlayersReady: boolean;
    error?: string;
  }> {
    try {
      this.logger.log(`🎯 Player choice processed: ${playerWallet} chose ${choice} in match ${matchId}`);
      
      const result = this.coinFlipService.processPlayerChoice(matchId, playerWallet, choice);
      
      if (result.success) {
        this.logger.log(`🎯 Both players ready: ${result.bothPlayersReady}`);
        
        // Broadcast choice to other players
        this.matchGateway.server.to(matchId).emit('opponent_choice_made', {
          matchId,
          playerId: playerWallet,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to process coinflip choice: ${error.message}`);
      return { success: false, gameState: null, bothPlayersReady: false, error: error.message };
    }
  }

  /**
   * Execute coinflip when both players are ready
   */
  async executeCoinFlip(matchId: string): Promise<{
    success: boolean;
    gameState: any;
    roundResult?: any;
    error?: string;
  }> {
    try {
      this.logger.log(`🚨 DEBUG: executeCoinFlip called for match ${matchId}`);
      
      const result = this.coinFlipService.executeCoinFlip(matchId);
      
      // 🚨 DEBUG: Log the exact state after coin flip execution
      this.logger.log(`🪙 Coin flip executed for match ${matchId}:`);
      this.logger.log(`   Match complete: ${result.gameState?.matchComplete}`);
      this.logger.log(`   Player 1 score: ${result.gameState?.player1Score}`);
      this.logger.log(`   Player 2 score: ${result.gameState?.player2Score}`);
      this.logger.log(`   Required wins: ${result.gameState?.requiredWins}`);
      this.logger.log(`   Current round: ${result.gameState?.currentRound}`);
      this.logger.log(`   Total rounds played: ${result.gameState?.rounds?.length}`);
      
      // ✅ CRITICAL FIX: Multiple safeguards to prevent premature payout
      const isMatchActuallyComplete = result.success && 
                                     result.gameState?.matchComplete === true &&
                                     result.gameState?.matchWinner !== null &&
                                     (result.gameState?.player1Score >= result.gameState?.requiredWins || 
                                      result.gameState?.player2Score >= result.gameState?.requiredWins);
      
      this.logger.log(`🔍 Payout check: isMatchActuallyComplete = ${isMatchActuallyComplete}`);
      
      // Only attempt payout if match is TRULY complete
      if (isMatchActuallyComplete) {
        this.logger.log(`🏁 MATCH IS COMPLETE - Waiting for frontend animation confirmation for match ${matchId}`);
        
        // ✅ WAIT FOR FRONTEND CONFIRMATION: Don't process payout immediately
        try {
          // Get match details for updating
          const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: {
              player1: { select: { id: true, wallet: true } },
              player2: { select: { id: true, wallet: true } }
            }
          });

          if (!match) {
            return { success: false, gameState: null, error: 'Match not found for completion' };
          }

          // 🎯 CRITICAL FIX: Update match status to completed_awaiting_payout first
          await this.prisma.match.update({
            where: { id: matchId },
            data: {
              status: 'completed_awaiting_payout',
              gameData: {
                ...(match.gameData as object || {}),
                finalGameState: result.gameState,
                completedAt: new Date().toISOString(),
                payoutStatus: 'pending'
              } as any
            }
          });
          
          this.logger.log(`✅ Match status updated to completed_awaiting_payout: ${matchId}`);

          // 🃏 AUTO-RECORD PnL: Record PnL immediately when match completes
          try {
            await this.autoRecordMatchPnL(matchId);
          } catch (pnlError) {
            this.logger.error(`Failed to auto-record PnL for coin flip match ${matchId}: ${pnlError.message}`);
            // Don't fail the match completion if PnL recording fails
          }

          // 🎯 WAIT FOR FRONTEND CONFIRMATION: Don't process payout yet
          // The frontend will call confirm_payout_ready when animation completes
          this.logger.log(`⏳ Waiting for frontend to confirm animation completion before payout for match ${matchId}`);

          // Notify frontend that game is complete and payout is ready
          this.matchGateway.server.to(matchId).emit('match_completed', {
            matchId,
            gameState: result.gameState,
            winner: result.gameState.matchWinner,
            timestamp: Date.now()
          });

        } catch (error) {
          this.logger.error(`❌ Failed to update match status: ${error.message}`);
          return { 
            success: false, 
            gameState: result.gameState, 
            error: `Failed to complete match: ${error.message}` 
          };
        }
      } else {
        this.logger.log(`🎮 Round completed but match continues - no payout attempt for match ${matchId}`);
      }

      return result;
    } catch (error) {
      console.error('Error executing coin flip:', error);
      return { success: false, gameState: null, error: 'Internal server error' };
    }
  }

  /**
   * Get coinflip game state
   */
  async getCoinFlipState(matchId: string): Promise<any> {
    try {
      return this.coinFlipService.getMatchState(matchId);
    } catch (error) {
      console.error('Error getting coinflip state:', error);
      return null;
    }
  }

  /**
   * Update user stats after match completion
   */
  private async updateUserStats(player1Id: string, player2Id: string, winnerId: string, wager: number): Promise<void> {
    try {
      // Update winner stats
      await this.prisma.user.update({
        where: { id: winnerId },
            data: {
          wins: { increment: 1 },
          totalMatches: { increment: 1 },
          totalEarnings: { increment: wager * 2 * 0.935 } // Winner gets 2x wager minus 6.5% fee
        }
      });

      // Update loser stats
      const loserId = winnerId === player1Id ? player2Id : player1Id;
      await this.prisma.user.update({
        where: { id: loserId },
        data: {
          losses: { increment: 1 },
          totalMatches: { increment: 1 },
          totalEarnings: { increment: -wager } // Loser loses their wager
        }
      });

      // Recalculate win rates
      const winner = await this.prisma.user.findUnique({
        where: { id: winnerId },
        select: { wins: true, totalMatches: true }
      });
      
      const loser = await this.prisma.user.findUnique({
        where: { id: loserId },
        select: { wins: true, totalMatches: true }
      });

      if (winner && winner.totalMatches > 0) {
        await this.prisma.user.update({
          where: { id: winnerId },
          data: { winRate: winner.wins / winner.totalMatches }
        });
      }

      if (loser && loser.totalMatches > 0) {
        await this.prisma.user.update({
          where: { id: loserId },
          data: { winRate: loser.wins / loser.totalMatches }
        });
      }

      this.logger.log(`📊 User stats updated for match completion`);
    } catch (error) {
      this.logger.error(`Failed to update user stats: ${error.message}`);
      throw error;
    }
  }

  // ===== CRASH GAME METHODS =====

  /**
   * Start a crash round
   */
  // ✅ STAKE'S LATENCY SYSTEM: Update player latency
  async updatePlayerLatency(playerId: string, latency: number): Promise<void> {
    this.crashService.updatePlayerLatency(playerId, latency);
  }

  // ✅ STAKE'S TIMING SYSTEM: Start predictive crash timing
  async startPredictiveCrashTiming(matchId: string, gateway: any): Promise<{
    success: boolean;
    crashTiming?: any;
    error?: string;
  }> {
    try {
      const result = this.crashService.executePredictiveCrash(matchId, gateway);
      return result;
    } catch (error) {
      this.logger.error(`Failed to start predictive crash timing for ${matchId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async startCrashRound(matchId: string): Promise<{
    success: boolean;
    gameState: any;
    roundData?: any;
    error?: string;
  }> {
    try {
      this.logger.log(`🚀 Starting crash round for match ${matchId}`);
      
      const result = this.crashService.startCrashRound(matchId);
      
      if (result.success) {
        const crashMultiplier = result.gameState.rounds[result.gameState.currentRound - 1]?.crashMultiplier;
        
        // ✅ FIXED: Calculate crash duration FROM crash multiplier (not random!)
        const roundStartTime = Date.now();
        const crashDuration = this.calculateCrashDurationFromMultiplier(crashMultiplier);
        
        // ✅ CLIENT-SIDE CRASH PREDICTION: Send crash seeds for deterministic prediction
        const currentRound = result.gameState.rounds.find((r: any) => r.roundNumber === result.gameState.currentRound);
        
        this.matchGateway.server.to(matchId).emit('crash_round_started', {
          matchId,
          roundNumber: result.gameState.currentRound,
          roundStartTime,
          timestamp: roundStartTime,
          // ✅ NEW: Send crash seeds for client-side prediction (both players get same seeds)
          crashSeed: currentRound?.crashSeed,
          crashNonce: currentRound?.crashNonce
          // ❌ DON'T SEND: crashDuration, crashMultiplier (let clients calculate)
        });

        console.log(`🚀 Crash ${crashMultiplier.toFixed(2)}x will occur in ${(crashDuration/1000).toFixed(1)} seconds`);
        console.log(`🎮 Both players will see identical synchronized animation`);

        // ✅ FIX: Start predictive crash execution for this round
        const crashTimingResult = this.crashService.executePredictiveCrash(matchId, this.matchGateway);
        if (!crashTimingResult.success) {
          this.logger.error(`Failed to start predictive crash execution for ${matchId}: ${crashTimingResult.error}`);
        } else {
          this.logger.log(`🎯 Predictive crash system activated for match ${matchId}`);
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to start crash round: ${error.message}`);
      return { success: false, gameState: null, error: error.message };
    }
  }



  /**
   * ✅ PROPER CRASH GAME: Execute crash at secret predetermined time
   * Players don't know when crash will happen - creates real tension!
   */
  private startSynchronizedCrashExecution(matchId: string, crashDuration: number): void {
    console.log(`🎮 SECRET: Crash will occur in ${crashDuration/1000}s (players don't know this!)`);
    
    // Wait for the exact crash time, then execute crash and REVEAL crash point
    setTimeout(() => {
      this.executeCrash(matchId);
    }, crashDuration);
  }

  /**
   * Process crash cash out from player
   */
  async processCrashCashOut(matchId: string, playerWallet: string, multiplier: number): Promise<{
    success: boolean;
    gameState: any;
    cashOutResult?: any;
    error?: string;
  }> {
    try {
      this.logger.log(`💰 Player cash out: ${playerWallet} at ${multiplier}x in match ${matchId}`);
      
      const result = this.crashService.processCashOut(matchId, playerWallet, multiplier);
      
      if (result.success) {
        // ✅ PROPER CRASH GAME: Only notify the player who cashed out
        // DON'T broadcast to opponents - keep cash-outs secret until round ends
        const playerSocket = Array.from(this.matchGateway.server.sockets.sockets.values())
          .find(socket => socket.data?.userId === playerWallet);
        
        if (playerSocket) {
          playerSocket.emit('crash_cash_out_confirmed', {
          matchId,
          multiplier,
          timestamp: Date.now()
        });
        }
        
        this.logger.log(`✅ Cash out successful: ${playerWallet} at ${multiplier}x (HIDDEN from opponent)`);
      } else {
        // ✅ FIX: Broadcast cash out error to the player who tried to cash out
        this.logger.log(`❌ Cash out failed: ${playerWallet} at ${multiplier}x - ${result.error}`);
        
        // Send error specifically to the player who tried to cash out
        const playerSocket = Array.from(this.matchGateway.server.sockets.sockets.values())
          .find(socket => socket.data?.userId === playerWallet);
        
        if (playerSocket) {
          playerSocket.emit('crash_cash_out_failed', {
            matchId,
            error: result.error,
            attemptedMultiplier: multiplier,
          timestamp: Date.now()
          });
        }
        
        // Also broadcast to the room for debugging
        this.matchGateway.server.to(matchId).emit('error', {
          message: `Cash out failed: ${result.error}`,
          player: playerWallet,
          multiplier
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to process crash cash out: ${error.message}`);
      return { success: false, gameState: null, error: error.message };
    }
  }

  /**
   * Execute crash when multiplier reaches crash point
   * Enhanced to handle void matches and refunds
   */
  async executeCrash(matchId: string): Promise<{
    success: boolean;
    gameState: any;
    roundResult?: any;
    error?: string;
  }> {
    try {
      this.logger.log(`💥 Executing crash for match ${matchId}`);
      
      const result = this.crashService.executeCrash(matchId);
      
      this.logger.log(`🔍 CRASH SERVICE RESULT: success=${result.success}, hasRoundResult=${!!result.roundResult}, hasGameState=${!!result.gameState}`);
      
      if (result.success) {
        // Check for replay situation
        if (result.roundResult?.isReplay) {
          // Broadcast replay notification (without revealing new crash point!)
          this.matchGateway.server.to(matchId).emit('crash_replay', {
          matchId,
            replayCount: result.roundResult.replayCount,
            message: `Round replayed - attempt ${result.roundResult.replayCount + 1}/4`,
          timestamp: Date.now()
        });

          // Start new round immediately
          setTimeout(() => {
            this.startCrashRound(matchId);
          }, 2000); // 2 second delay for players to see replay message

          return result;
        }

        // Check for void match
        if (result.roundResult?.matchVoid) {
          this.logger.log(`🚫 Match voided due to max replays: ${matchId}`);
          
          try {
            const match = await this.prisma.match.findUnique({
              where: { id: matchId },
              include: {
                player1: { select: { id: true, wallet: true } },
                player2: { select: { id: true, wallet: true } }
              }
            });

            if (match) {
              // Update match status to void
              await this.prisma.match.update({
                where: { id: matchId },
                data: {
                  status: 'void',
                  gameData: {
                    ...(match.gameData as object || {}),
                    finalGameState: result.gameState,
                    voidReason: result.roundResult.voidReason,
                    voidedAt: new Date().toISOString(),
                    refundStatus: 'pending'
                  } as any
                }
              });

              // Process refunds (wager minus platform fee)
              const platformFeeRate = 0.065; // 6.5%
              const refundAmount = match.wager * (1 - platformFeeRate);
              
              this.logger.log(`💰 Processing void match refunds: ${refundAmount} SOL each to ${match.player1.wallet} and ${match.player2.wallet}`);

              // Refund both players to their session vaults
              try {
                // Note: In production, this would call the smart contract to process refunds
                // For now, we'll emit the refund event and handle it via WebSocket
                this.matchGateway.server.to(matchId).emit('match_void_refund', {
                matchId,
                  voidReason: result.roundResult.voidReason,
                  refundAmount,
                  platformFee: match.wager * platformFeeRate,
                  player1Wallet: match.player1.wallet,
                  player2Wallet: match.player2.wallet,
                  timestamp: Date.now()
                });

                this.logger.log(`✅ Void match refund processed for ${matchId}`);
              } catch (refundError) {
                this.logger.error(`❌ Failed to process void match refund: ${refundError.message}`);
              }

              // Broadcast void notification
              this.matchGateway.server.to(matchId).emit('match_voided', {
                matchId,
                voidReason: result.roundResult.voidReason,
                refundAmount,
                gameState: result.gameState,
                timestamp: Date.now()
              });
            }
          } catch (error) {
            this.logger.error(`❌ Failed to update void match status: ${error.message}`);
          }

          return result;
        }

        // ✅ PROPER CRASH GAME: Only reveal crash point, keep cash-outs SECRET
        // First, immediately broadcast the crash event (so players see the crash happen)
        this.matchGateway.server.to(matchId).emit('crash_occurred', {
          matchId,
          crashMultiplier: result.roundResult?.crashMultiplier,
          // ❌ DON'T REVEAL: player1CashOut, player2CashOut (keep secret until result)
          timestamp: Date.now()
        });

        this.logger.log(`💥 Crash occurred at ${result.roundResult?.crashMultiplier}x - processing immediately...`);

        // ✅ IMMEDIATE PROCESSING: Don't use setTimeout, process immediately
        try {
          this.logger.log(`⚡ Processing crash result immediately for match ${matchId}`);
          
          // Now broadcast the final result with winner determination
          this.matchGateway.server.to(matchId).emit('crash_result', {
            matchId,
            crashMultiplier: result.roundResult?.crashMultiplier,
            player1Result: result.roundResult?.player1Result,
            player2Result: result.roundResult?.player2Result,
            roundWinner: result.roundResult?.roundWinner,
            matchComplete: result.roundResult?.matchComplete,
            matchWinner: result.roundResult?.matchWinner,
            gameState: result.gameState, // ✅ CRITICAL FIX: Include updated game state with scores
            timestamp: Date.now()
          });

          this.logger.log(`🔍 DEBUGGING: Match complete: ${result.roundResult?.matchComplete}, Match void: ${result.roundResult?.matchVoid}`);

          // ✅ ROUND PROGRESSION FIX: Remove duplicate logic - now handled by handleCrashRoundProgression
          this.logger.log(`🔄 Crash execution complete for match ${matchId} - round progression will be handled by global callback system`);
        } catch (error) {
          this.logger.error(`❌ Error in crash result processing: ${error.message}`);
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to execute crash: ${error.message}`);
      return { success: false, gameState: null, error: error.message };
    }
  }

  /**
   * Get crash game state
   */
  async getCrashState(matchId: string): Promise<any> {
    try {
      return this.crashService.getMatchState(matchId);
    } catch (error) {
      console.error('Error getting crash state:', error);
      return null;
    }
  }

  /**
   * ✅ ROUND PROGRESSION FIX: Handle crash round progression without circular calls
   */
  async handleCrashRoundProgression(matchId: string, crashResult: any): Promise<void> {
    try {
      this.logger.log(`🔄 ROUND PROGRESSION: Processing crash result for match ${matchId}`);
      
      if (!crashResult.success || !crashResult.roundResult) {
        this.logger.warn(`⚠️ ROUND PROGRESSION: Invalid crash result for match ${matchId}`);
        return;
      }

      // Check for replay situation
      if (crashResult.roundResult?.isReplay) {
        // Broadcast replay notification (without revealing new crash point!)
        this.matchGateway.server.to(matchId).emit('crash_replay', {
          matchId,
          replayCount: crashResult.roundResult.replayCount,
          message: `Round replayed - attempt ${crashResult.roundResult.replayCount + 1}/4`,
          timestamp: Date.now()
        });

        // Start new round immediately
        setTimeout(() => {
          this.startCrashRound(matchId);
        }, 2000); // 2 second delay for players to see replay message

        return;
      }

      // Check for void match
      if (crashResult.roundResult?.matchVoid) {
        this.logger.log(`🚫 Match voided due to max replays: ${matchId}`);
        
        try {
          const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: {
              player1: { select: { id: true, wallet: true } },
              player2: { select: { id: true, wallet: true } }
            }
          });

          if (match) {
            // Update match status to void
            await this.prisma.match.update({
              where: { id: matchId },
              data: {
                status: 'void',
                gameData: {
                  ...(match.gameData as object || {}),
                  finalGameState: crashResult.gameState,
                  voidReason: crashResult.roundResult.voidReason,
                  voidedAt: new Date().toISOString(),
                  refundStatus: 'pending'
                } as any
              }
            });

            // Process refunds (wager minus platform fee)
            const platformFeeRate = 0.065; // 6.5%
            const refundAmount = match.wager * (1 - platformFeeRate);
            
            this.logger.log(`💰 Processing void match refunds: ${refundAmount} SOL each to ${match.player1.wallet} and ${match.player2.wallet}`);

            // Refund both players to their session vaults
            try {
              // Note: In production, this would call the smart contract to process refunds
              // For now, we'll emit the refund event and handle it via WebSocket
              this.matchGateway.server.to(matchId).emit('match_void_refund', {
                matchId,
                voidReason: crashResult.roundResult.voidReason,
                refundAmount,
                platformFee: match.wager * platformFeeRate,
                player1Wallet: match.player1.wallet,
                player2Wallet: match.player2.wallet,
                timestamp: Date.now()
              });

              this.logger.log(`✅ Void match refund processed for ${matchId}`);
            } catch (refundError) {
              this.logger.error(`❌ Failed to process void match refund: ${refundError.message}`);
            }

            // Broadcast void notification
            this.matchGateway.server.to(matchId).emit('match_voided', {
              matchId,
              voidReason: crashResult.roundResult.voidReason,
              refundAmount,
              gameState: crashResult.gameState,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          this.logger.error(`❌ Failed to update void match status: ${error.message}`);
        }

        return;
      }

      // ✅ PROPER CRASH GAME: Only reveal crash point, keep cash-outs SECRET
      // First, immediately broadcast the crash event (so players see the crash happen)
      this.matchGateway.server.to(matchId).emit('crash_occurred', {
        matchId,
        crashMultiplier: crashResult.roundResult?.crashMultiplier,
        // ❌ DON'T REVEAL: player1CashOut, player2CashOut (keep secret until result)
        timestamp: Date.now()
      });

      this.logger.log(`💥 Crash occurred at ${crashResult.roundResult?.crashMultiplier}x - processing round progression...`);

      // Now broadcast the final result with winner determination
      this.matchGateway.server.to(matchId).emit('crash_result', {
        matchId,
        crashMultiplier: crashResult.roundResult?.crashMultiplier,
        player1Result: crashResult.roundResult?.player1Result,
        player2Result: crashResult.roundResult?.player2Result,
        roundWinner: crashResult.roundResult?.roundWinner,
        matchComplete: crashResult.roundResult?.matchComplete,
        matchWinner: crashResult.roundResult?.matchWinner,
        gameState: crashResult.gameState,
        timestamp: Date.now()
      });

      // Handle match completion or continue to next round
      if (crashResult.roundResult?.matchComplete && !crashResult.roundResult?.matchVoid) {
        this.logger.log(`🏁 Match is complete - calling completion handler`);
        await this.handleCrashMatchCompletionAfterDelay(matchId, crashResult);
      } else if (!crashResult.roundResult?.matchComplete && !crashResult.roundResult?.matchVoid) {
        // Match continues - update game state and start next round
        this.logger.log(`🔄 Round complete, updating game state and starting next round for match ${matchId}`);
        
        try {
          // Update the database with the new game state
          await this.prisma.match.update({
            where: { id: matchId },
            data: {
              gameData: crashResult.gameState as any
            }
          });

          this.logger.log(`✅ Database updated successfully for match ${matchId}`);

          // Notify frontend that round is complete and next round is starting
          this.matchGateway.server.to(matchId).emit('round_completed', {
            matchId,
            gameState: crashResult.gameState,
            roundResult: crashResult.roundResult,
            timestamp: Date.now()
          });

          this.logger.log(`📡 Sent round_completed event for match ${matchId}`);

          // ✅ START NEXT ROUND: Start next round with robust error handling
          this.logger.log(`⏰ Setting up next round timer for match ${matchId}`);
          
          const nextRoundTimer = setTimeout(async () => {
            try {
              this.logger.log(`🚀 TIMER TRIGGERED: Starting next round for match ${matchId}`);
              const nextRoundResult = await this.startCrashRound(matchId);
              this.logger.log(`✅ Next round started successfully for match ${matchId}:`, nextRoundResult);
            } catch (error) {
              this.logger.error(`❌ TIMER ERROR: Failed to start next round for match ${matchId}:`, error);
            }
          }, 8000);
          
          this.logger.log(`⏰ Timer set for match ${matchId}, will trigger in 8 seconds`);
        } catch (error) {
          this.logger.error(`❌ Failed to update game state for continuing match: ${error.message}`);
        }
      } else {
        this.logger.warn(`⚠️ Unexpected condition: matchComplete=${crashResult.roundResult?.matchComplete}, matchVoid=${crashResult.roundResult?.matchVoid}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error in crash round progression: ${error.message}`);
    }
  }

  /**
   * Initialize crash match when second player joins
   */
  async initializeCrashMatch(matchId: string, player1: string, player2: string): Promise<any> {
    try {
      this.logger.log(`🚀 Initializing crash match ${matchId}: ${player1} vs ${player2}`);
      
      const gameState = this.crashService.initializeMatch(matchId, player1, player2);
      
      // Broadcast match initialization
      this.matchGateway.server.to(matchId).emit('crash_match_initialized', {
        matchId,
        gameState,
        timestamp: Date.now()
      });
      
      return gameState;
    } catch (error) {
      this.logger.error(`Failed to initialize crash match: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle crash match completion after 3-second delay
   */
  private async handleCrashMatchCompletionAfterDelay(matchId: string, result: any): Promise<void> {
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true } },
          player2: { select: { id: true, wallet: true } }
        }
      });

      if (match) {
        // Check if the entire match is complete or just the round
        if (result.gameState.matchComplete) {
          this.logger.log(`🏁 Crash match complete: ${matchId}`);
          
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'completed_awaiting_payout',
            gameData: {
              ...(match.gameData as object || {}),
              finalGameState: result.gameState,
              completedAt: new Date().toISOString(),
              payoutStatus: 'pending'
            } as any
          }
        });

        // 🎯 WAIT FOR FRONTEND CONFIRMATION: Don't process payout yet
        // The frontend will call confirm_payout_ready when animation completes
        this.logger.log(`⏳ Waiting for frontend to confirm animation completion before payout for match ${matchId}`);

        // Notify frontend that game is complete and payout is ready (same as coinflip)
        this.matchGateway.server.to(matchId).emit('match_completed', {
          matchId,
          gameState: result.gameState,
          winner: result.gameState.matchWinner,
          timestamp: Date.now()
        });
        } else {
          // ✅ ROUND PROGRESSION FIX: Remove duplicate logic - round progression now handled by handleCrashRoundProgression
          this.logger.log(`🔄 Round complete for match ${matchId} - progression handled by dedicated handler`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to update crash match status: ${error.message}`);
    }
  }

  /**
   * ✅ FIXED: Calculate crash duration FROM crash multiplier
   * Fast crash psychology: 8x in 6 seconds, 1.52x in 2 seconds
   */
  private calculateCrashDurationFromMultiplier(crashMultiplier: number): number {
    // ✅ UNIFIED STAKE TIMING: Use the exact same formula as frontend
    // This ensures perfect synchronization between frontend animation and backend timing
    
    let timeSeconds: number;
    
    if (crashMultiplier <= 1.1) {
      // Instant crashes: 1.0x-1.1x in 1-2 seconds
      timeSeconds = 1.0 + (crashMultiplier - 1.0) * 10; // 1.1x = 2s
    } else if (crashMultiplier <= 2.0) {
      // Early Phase: 1.1x-2.0x in 2-4 seconds (builds tension slowly)
      timeSeconds = 2.0 + (crashMultiplier - 1.1) * 2.22; // 2.0x = 4s
    } else if (crashMultiplier <= 5.0) {
      // Decision Phase: 2.0x-5.0x in 4-8 seconds (critical decision time)
      timeSeconds = 4.0 + (crashMultiplier - 2.0) * 1.33; // 5.0x = 8s
    } else if (crashMultiplier <= 10.0) {
      // FOMO Phase: 5.0x-10.0x in 8-10 seconds (fast acceleration)
      timeSeconds = 8.0 + (crashMultiplier - 5.0) * 0.4; // 10.0x = 10s
    } else if (crashMultiplier <= 20.0) {
      // High FOMO: 10.0x-20.0x in 10-15 seconds (creates urgency)
      timeSeconds = 10.0 + (crashMultiplier - 10.0) * 0.5; // 20.0x = 15s
    } else if (crashMultiplier <= 50.0) {
      // Extreme patience: 20.0x-50.0x in 15-25 seconds
      timeSeconds = 15.0 + (crashMultiplier - 20.0) * 0.33; // 50.0x = 25s
    } else {
      // Ultra-high multipliers: 50x+ in 25-40 seconds max
      timeSeconds = 25.0 + Math.min((crashMultiplier - 50.0) * 0.1, 15); // Cap at 40s
    }
    
    // Safety bounds: 1.0-40 seconds (matching Stake's range)
    timeSeconds = Math.max(1.0, Math.min(40, timeSeconds));
    const durationMs = Math.round(timeSeconds * 1000);
    
    console.log(`🎯 Unified Stake Timing: ${crashMultiplier.toFixed(2)}x will occur in ${(durationMs/1000).toFixed(1)}s`);
    
    return durationMs;
  }

  // 🎯 RPS Game Methods
  /**
   * Process RPS choice from player
   */
  async processRPSChoice(matchId: string, playerWallet: string, choice: 'rock' | 'paper' | 'scissors'): Promise<{
    success: boolean;
    gameState: any;
    bothPlayersChosen: boolean;
    roundResult?: any;
    playerScore?: number;
    opponentScore?: number;
    matchComplete?: boolean;
    matchWinner?: string;
    totalRounds?: number;
    player1Result?: any;
    player2Result?: any;
    error?: string;
  }> {
    try {
      this.logger.log(`🎯 Processing RPS choice: ${choice} from ${playerWallet} in match ${matchId}`);
      
      // Get current match
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true } },
          player2: { select: { id: true, wallet: true } }
        }
      });

      if (!match) {
        return { success: false, error: 'Match not found', gameState: null, bothPlayersChosen: false };
      }

      // Initialize game state if not exists
      let gameState = match.gameData as any;
      if (!gameState || typeof gameState !== 'object') {
        gameState = {
          player1Score: 0,
          player2Score: 0,
          currentRound: 1,
          totalRounds: 0,
          rounds: [],
          matchComplete: false,
          matchWinner: null,
          pendingChoices: {}
        };
      }

      // Ensure all required fields exist with proper defaults
      gameState.player1Score = gameState.player1Score || 0;
      gameState.player2Score = gameState.player2Score || 0;
      gameState.currentRound = gameState.currentRound || 1;
      gameState.totalRounds = gameState.totalRounds || 0;
      gameState.rounds = gameState.rounds || [];
      gameState.pendingChoices = gameState.pendingChoices || {};

      // Determine if this is player1 or player2
      const isPlayer1 = match.player1.wallet === playerWallet;
      const playerKey = isPlayer1 ? 'player1' : 'player2';
      const opponentKey = isPlayer1 ? 'player2' : 'player1';

      // Store the choice
      if (!gameState.pendingChoices) {
        gameState.pendingChoices = {};
      }
      gameState.pendingChoices[playerKey] = choice;

      this.logger.log(`🎮 Player ${playerKey} chose ${choice}. Pending choices:`, gameState.pendingChoices);

      // Check if both players have chosen
      const bothPlayersChosen = gameState.pendingChoices.player1 && gameState.pendingChoices.player2;

      if (bothPlayersChosen) {
        // Process the round
        const player1Choice = gameState.pendingChoices.player1;
        const player2Choice = gameState.pendingChoices.player2;
        
        // 🔧 FIX: Set completedRoundNumber FIRST
        const completedRoundNumber = gameState.currentRound || 1;
        
        // Determine round winner
        let roundWinner: 'player1' | 'player2' | 'draw' = 'draw';
        
        if (player1Choice === player2Choice) {
          roundWinner = 'draw';
        } else if (
          (player1Choice === 'rock' && player2Choice === 'scissors') ||
          (player1Choice === 'paper' && player2Choice === 'rock') ||
          (player1Choice === 'scissors' && player2Choice === 'paper')
        ) {
          roundWinner = 'player1';
        } else {
          roundWinner = 'player2';
        }

        // Update scores (only count wins, not draws)
        if (roundWinner === 'player1') {
          gameState.player1Score++;
        } else if (roundWinner === 'player2') {
          gameState.player2Score++;
        }

        // Create round result - FIX: Ensure consistent winner determination
        const roundResult = {
          roundNumber: completedRoundNumber,
          playerChoice: isPlayer1 ? player1Choice : player2Choice,
          opponentChoice: isPlayer1 ? player2Choice : player1Choice,
          result: roundWinner === 'draw' ? 'draw' : (roundWinner === playerKey ? choice : (isPlayer1 ? player2Choice : player1Choice)),
          winner: roundWinner === 'draw' ? null : (roundWinner === playerKey ? 'player' : 'opponent'),
          timestamp: Date.now()
        };

        // Add round to history
        if (!gameState.rounds) {
          gameState.rounds = [];
        }
        gameState.rounds.push({
          roundNumber: completedRoundNumber,
          player1Choice,
          player2Choice,
          winner: roundWinner,
          timestamp: Date.now()
        });

        // Update totalRounds and increment currentRound
        gameState.totalRounds = completedRoundNumber;
        gameState.currentRound = completedRoundNumber + 1;

        // Check for match completion (first to 3 wins)
        const matchComplete = gameState.player1Score >= 3 || gameState.player2Score >= 3;
        let matchWinner: string | null = null;
        let matchWinnerForPlayer: 'player' | 'opponent' | null = null;

        if (matchComplete) {
          // Set the actual wallet winner
          matchWinner = gameState.player1Score >= 3 ? match.player1.wallet : match.player2.wallet;
          gameState.matchComplete = true;
          gameState.matchWinner = matchWinner;
          
          // Determine winner from current player's perspective
          matchWinnerForPlayer = matchWinner === playerWallet ? 'player' : 'opponent';
        }

        // Clear pending choices for next round
        gameState.pendingChoices = {};

        // Update match in database
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            gameData: gameState,
            status: matchComplete ? 'completed_awaiting_payout' : 'in_progress'
          }
        });

        // 🔧 FIX: Use correct values in logging
        this.logger.log(`🎯 RPS round ${completedRoundNumber} complete. Score: ${gameState.player1Score}-${gameState.player2Score}. Match complete: ${matchComplete}. Winner: ${matchWinner || 'none'}`);

        // 🃏 AUTO-RECORD PnL: Record PnL immediately when match completes
        if (matchComplete && matchWinner) {
          try {
            await this.autoRecordMatchPnL(matchId);
          } catch (pnlError) {
            this.logger.error(`Failed to auto-record PnL for RPS match ${matchId}: ${pnlError.message}`);
            // Don't fail the match completion if PnL recording fails
          }

          // 🔧 FIX: Automatically process payout when match completes (like crash game)
          this.logger.log(`💰 RPS match completed - initiating automatic payout for match: ${matchId}`);
          // Process payout after a short delay to ensure frontend receives final result first
          setTimeout(async () => {
            try {
              const payoutResult = await this.processMatchPayout(matchId);
              this.logger.log(`💰 RPS automatic payout result:`, payoutResult);
            } catch (error) {
              this.logger.error(`❌ Failed to process automatic RPS payout for match ${matchId}:`, error);
            }
          }, 2000); // 2 second delay like crash game
        }

        return {
          success: true,
          gameState,
          bothPlayersChosen: true,
          roundResult,
          playerScore: isPlayer1 ? gameState.player1Score : gameState.player2Score,
          opponentScore: isPlayer1 ? gameState.player2Score : gameState.player1Score,
          matchComplete,
          matchWinner: matchWinnerForPlayer, // Return 'player' or 'opponent' from current player's perspective
          totalRounds: gameState.totalRounds,
          // 🔧 FIX: Add results for both players to avoid dual calls
          player1Result: {
            playerScore: gameState.player1Score,
            opponentScore: gameState.player2Score,
            matchWinner: matchComplete ? (gameState.player1Score >= 3 ? 'player' : 'opponent') : null,
            roundResult: {
              roundNumber: completedRoundNumber,
              playerChoice: player1Choice,
              opponentChoice: player2Choice,
              result: roundWinner === 'draw' ? 'draw' : (roundWinner === 'player1' ? player1Choice : player2Choice),
              winner: roundWinner === 'draw' ? null : (roundWinner === 'player1' ? 'player' : 'opponent'),
              timestamp: Date.now()
            }
          },
          player2Result: {
            playerScore: gameState.player2Score,
            opponentScore: gameState.player1Score,
            matchWinner: matchComplete ? (gameState.player2Score >= 3 ? 'player' : 'opponent') : null,
            roundResult: {
              roundNumber: completedRoundNumber,
              playerChoice: player2Choice,
              opponentChoice: player1Choice,
              result: roundWinner === 'draw' ? 'draw' : (roundWinner === 'player2' ? player2Choice : player1Choice),
              winner: roundWinner === 'draw' ? null : (roundWinner === 'player2' ? 'player' : 'opponent'),
              timestamp: Date.now()
            }
          }
        };
      } else {
        // Update match with pending choice
        await this.prisma.match.update({
          where: { id: matchId },
          data: { gameData: gameState }
        });

        return {
          success: true,
          gameState,
          bothPlayersChosen: false,
          playerScore: isPlayer1 ? gameState.player1Score : gameState.player2Score,
          opponentScore: isPlayer1 ? gameState.player2Score : gameState.player1Score,
          totalRounds: gameState.totalRounds
        };
      }

    } catch (error) {
      this.logger.error(`Failed to process RPS choice: ${error.message}`);
      return { success: false, error: error.message, gameState: null, bothPlayersChosen: false };
    }
  }

  /**
   * Get RPS game state
   */
  async getRPSGameState(matchId: string): Promise<any> {
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true } },
          player2: { select: { id: true, wallet: true } }
        }
      });

      if (!match) {
        return null;
      }

      const gameData = (match.gameData as any) || {
        player1Score: 0,
        player2Score: 0,
        currentRound: 1,
        totalRounds: 0,
        rounds: [],
        matchComplete: false,
        matchWinner: null,
        pendingChoices: {}
      };

      return {
        ...gameData,
        player1: match.player1,
        player2: match.player2,
        matchId: matchId
      };
    } catch (error) {
      this.logger.error(`Failed to get RPS game state: ${error.message}`);
      return null;
    }
  }

  // 🎲 Dice Duel Game Methods


  /**
   * Process Dice Duel roll from player
   */
  async processDiceDuelRoll(matchId: string, playerWallet: string, buildData?: { build: string; dice: string; buildName: string }): Promise<{
    success: boolean;
    gameState: any;
    bothPlayersRolled: boolean;
    roundResult?: any;
    playerScore?: number;
    opponentScore?: number;
    matchComplete?: boolean;
    matchWinner?: string;
    totalRounds?: number;
    player1Result?: any;
    player2Result?: any;
    error?: string;
  }> {
    try {
      if (buildData) {
        this.logger.log(`🎲 Processing RPG Dice Duel roll from ${playerWallet} in match ${matchId} with build: ${buildData.buildName} (${buildData.dice})`);
      } else {
        this.logger.log(`🎲 Processing basic Dice Duel roll from ${playerWallet} in match ${matchId}`);
      }
      
      // Get current match
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true } },
          player2: { select: { id: true, wallet: true } }
        }
      });

      if (!match) {
        return { success: false, error: 'Match not found', gameState: null, bothPlayersRolled: false };
      }

      // Initialize game state if not exists
      let gameState = match.gameData as any;
      if (!gameState || typeof gameState !== 'object') {
        gameState = {
          player1Score: 0,
          player2Score: 0,
          currentRound: 1,
          totalRounds: 0,
          rounds: [],
          matchComplete: false,
          matchWinner: null,
          pendingRolls: {}
        };
      }

      // Ensure all required fields exist with proper defaults
      gameState.player1Score = gameState.player1Score || 0;
      gameState.player2Score = gameState.player2Score || 0;
      gameState.currentRound = gameState.currentRound || 1;
      gameState.totalRounds = gameState.totalRounds || 0;
      gameState.rounds = gameState.rounds || [];
      gameState.pendingRolls = gameState.pendingRolls || {};

      // Determine if this is player1 or player2
      const isPlayer1 = match.player1.wallet === playerWallet;
      const playerKey = isPlayer1 ? 'player1' : 'player2';
      const opponentKey = isPlayer1 ? 'player2' : 'player1';

      // Generate cryptographically secure dice roll based on build or default (1-6)
      const diceRoll = buildData ? this.generateRPGDiceRoll(buildData.dice) : this.generateSecureDiceRoll();

      // Store the roll and build data
      if (!gameState.pendingRolls) {
        gameState.pendingRolls = {};
      }
      gameState.pendingRolls[playerKey] = diceRoll;

      // 🎲 RPG BUILD: Store build information for this player
      if (buildData) {
        const buildKey = `${playerKey}Build`;
        gameState[buildKey] = {
          build: buildData.build,
          dice: buildData.dice,
          buildName: buildData.buildName
        };
        this.logger.log(`🎲 RPG Build stored for ${playerKey}: ${buildData.buildName} (${buildData.dice})`);
      }

      this.logger.log(`🎲 Player ${playerKey} rolled ${diceRoll}. Pending rolls:`, gameState.pendingRolls);

      // Check if both players have rolled
      const bothPlayersRolled = gameState.pendingRolls.player1 && gameState.pendingRolls.player2;

      if (bothPlayersRolled) {
        // Process the round
        const player1Roll = gameState.pendingRolls.player1;
        const player2Roll = gameState.pendingRolls.player2;
        
        const completedRoundNumber = gameState.currentRound || 1;
        
        // Determine round winner
        let roundWinner: 'player1' | 'player2' | 'tie' = 'tie';
        
        if (player1Roll > player2Roll) {
          roundWinner = 'player1';
        } else if (player2Roll > player1Roll) {
          roundWinner = 'player2';
        } else {
          roundWinner = 'tie';
        }

        // Update scores (only count wins, not ties)
        if (roundWinner === 'player1') {
          gameState.player1Score++;
        } else if (roundWinner === 'player2') {
          gameState.player2Score++;
        }

        // Create round result for current player's perspective
        const roundResult = {
          roundNumber: completedRoundNumber,
          playerDice: isPlayer1 ? player1Roll : player2Roll,
          opponentDice: isPlayer1 ? player2Roll : player1Roll,
          result: roundWinner === 'tie' ? 'tie' : (roundWinner === playerKey ? 'win' : 'lose'),
          winner: roundWinner === 'tie' ? 'tie' : (roundWinner === playerKey ? 'player' : 'opponent'),
          timestamp: Date.now()
        };

        // Add round to history
        if (!gameState.rounds) {
          gameState.rounds = [];
        }
        gameState.rounds.push({
          roundNumber: completedRoundNumber,
          player1Roll,
          player2Roll,
          winner: roundWinner,
          timestamp: Date.now()
        });

        // Update totalRounds and increment currentRound
        gameState.totalRounds = completedRoundNumber;
        gameState.currentRound = completedRoundNumber + 1;

        // Check for match completion (first to 3 wins)
        const matchComplete = gameState.player1Score >= 3 || gameState.player2Score >= 3;
        let matchWinner: string | null = null;

        if (matchComplete) {
          // Set the actual wallet winner
          matchWinner = gameState.player1Score >= 3 ? match.player1.wallet : match.player2.wallet;
          gameState.matchComplete = true;
          gameState.matchWinner = matchWinner;
        }

        // Clear pending rolls for next round
        gameState.pendingRolls = {};

        // 🎲 RPG BUILDS: Prepare final game data for verification (includes dice rolls and build info)
        const finalGameData = {
          ...gameState,
          // 🔐 VERIFICATION: Store final round data for verifier service
          player1Roll: player1Roll,
          player2Roll: player2Roll,
          player1Build: gameState.player1Build || null,
          player2Build: gameState.player2Build || null,
          gameType: 'dice-duel',
          matchWinner: matchWinner
        };

        // Update match in database
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            gameData: finalGameData,
            status: matchComplete ? 'completed_awaiting_payout' : 'in_progress'
          }
        });

        this.logger.log(`🎲 Dice Duel round ${completedRoundNumber} complete. Rolls: ${player1Roll} vs ${player2Roll}. Score: ${gameState.player1Score}-${gameState.player2Score}. Match complete: ${matchComplete}. Winner: ${matchWinner || 'none'}`);

        // Create personalized results for both players with RPG build info
        const player1Result = {
          roundNumber: completedRoundNumber,
          playerDice: player1Roll,
          opponentDice: player2Roll,
          winner: roundWinner === 'tie' ? 'tie' : (roundWinner === 'player1' ? 'player' : 'opponent'),
          playerScore: gameState.player1Score,
          opponentScore: gameState.player2Score,
          matchComplete,
          matchWinner: matchComplete ? (matchWinner === match.player1.wallet ? 'player' : 'opponent') : undefined,
          // 🎲 RPG BUILD INFO: Include build data for 3D dice animation
          playerBuild: gameState.player1Build || null,
          opponentBuild: gameState.player2Build || null
        };

        const player2Result = {
          roundNumber: completedRoundNumber,
          playerDice: player2Roll,
          opponentDice: player1Roll,
          winner: roundWinner === 'tie' ? 'tie' : (roundWinner === 'player2' ? 'player' : 'opponent'),
          playerScore: gameState.player2Score,
          opponentScore: gameState.player1Score,
          matchComplete,
          matchWinner: matchComplete ? (matchWinner === match.player2.wallet ? 'player' : 'opponent') : undefined,
          // 🎲 RPG BUILD INFO: Include build data for 3D dice animation
          playerBuild: gameState.player2Build || null,
          opponentBuild: gameState.player1Build || null
        };

        // 🃏 AUTO-RECORD PnL: Record PnL immediately when match completes
        if (matchComplete && matchWinner) {
          try {
            await this.autoRecordMatchPnL(matchId);
          } catch (pnlError) {
            this.logger.error(`Failed to auto-record PnL for dice duel match ${matchId}: ${pnlError.message}`);
            // Don't fail the match completion if PnL recording fails
          }

          // Automatically process payout when match completes
          this.logger.log(`💰 Dice Duel match completed - initiating automatic payout for match: ${matchId}`);
          setTimeout(async () => {
            try {
              const payoutResult = await this._processMatchPayoutInternal(matchId);
              this.logger.log(`💰 Dice Duel automatic payout result:`, payoutResult);
            } catch (error) {
              this.logger.error(`❌ Error processing automatic payout for Dice Duel match ${matchId}:`, error);
            }
          }, 2000);
        }

        return {
          success: true,
          gameState,
          bothPlayersRolled: true,
          roundResult: isPlayer1 ? player1Result : player2Result,
          playerScore: isPlayer1 ? gameState.player1Score : gameState.player2Score,
          opponentScore: isPlayer1 ? gameState.player2Score : gameState.player1Score,
          matchComplete,
          matchWinner: matchComplete ? (matchWinner === playerWallet ? 'player' : 'opponent') : undefined,
          totalRounds: gameState.totalRounds,
          player1Result,
          player2Result
        };
      } else {
        // Only one player has rolled, update database and wait for opponent
        await this.prisma.match.update({
          where: { id: matchId },
          data: { gameData: gameState }
        });

        return {
          success: true,
          gameState,
          bothPlayersRolled: false,
          playerScore: isPlayer1 ? gameState.player1Score : gameState.player2Score,
          opponentScore: isPlayer1 ? gameState.player2Score : gameState.player1Score,
          totalRounds: gameState.totalRounds
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error processing Dice Duel roll for match ${matchId}:`, error);
      return {
        success: false,
        error: error.message,
        gameState: null,
        bothPlayersRolled: false
      };
    }
  }

  /**
   * Generate cryptographically secure dice roll (1-6)
   */
  private generateSecureDiceRoll(): number {
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    return (randomInt % 6) + 1;
  }

  /**
   * Generate cryptographically secure RPG dice roll based on notation
   * Supports: "3d4", "2d6+2", "1d12+1", "1d20"
   */
  private generateRPGDiceRoll(notation: string): number {
    const crypto = require('crypto');
    
    try {
      // Parse dice notation: "XdY" or "XdY+Z"
      const dicePattern = /^(\d+)d(\d+)(\+(\d+))?$/;
      const match = notation.match(dicePattern);
      
      if (!match) {
        this.logger.warn(`Invalid RPG dice notation: ${notation}, falling back to d6`);
        return this.generateSecureDiceRoll();
      }
      
      const numDice = parseInt(match[1]);
      const dieSize = parseInt(match[2]);
      const bonus = match[4] ? parseInt(match[4]) : 0;
      
      // Validate parameters
      if (numDice < 1 || numDice > 10 || dieSize < 2 || dieSize > 100 || bonus < 0 || bonus > 50) {
        this.logger.warn(`Invalid RPG dice parameters: ${notation}, falling back to d6`);
        return this.generateSecureDiceRoll();
      }
      
      let total = 0;
      const individualRolls: number[] = [];
      
      // Roll each die
      for (let i = 0; i < numDice; i++) {
        const randomBytes = crypto.randomBytes(4);
        const randomInt = randomBytes.readUInt32BE(0);
        const roll = (randomInt % dieSize) + 1;
        individualRolls.push(roll);
        total += roll;
      }
      
      // Add bonus
      total += bonus;
      
      this.logger.log(`🎲 RPG Roll ${notation}: Individual dice [${individualRolls.join(', ')}] + ${bonus} = ${total}`);
      
      return total;
      
    } catch (error) {
      this.logger.error(`Error generating RPG dice roll for notation ${notation}:`, error);
      return this.generateSecureDiceRoll();
    }
  }

  /**
   * Get Dice Duel game state
   */
  async getDiceDuelGameState(matchId: string): Promise<any> {
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true, displayName: true } },
          player2: { select: { id: true, wallet: true, displayName: true } }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      return {
        matchId: match.id,
        gameType: match.gameType,
        status: match.status,
        betAmount: match.wager,
        player1: match.player1,
        player2: match.player2,
        gameData: match.gameData || {
          player1Score: 0,
          player2Score: 0,
          currentRound: 1,
          totalRounds: 0,
          rounds: [],
          matchComplete: false,
          matchWinner: null,
          pendingRolls: {}
        },
        createdAt: match.createdAt,
        updatedAt: match.updatedAt
      };
    } catch (error) {
      this.logger.error(`❌ Error getting Dice Duel game state for match ${matchId}:`, error);
      throw error;
    }
  }

  // ===== MINES GAME METHODS =====

  /**
   * Start a new mines round
   */
  async startMinesRound(matchId: string): Promise<{ success: boolean; gameState?: MinesGameState; error?: string }> {
    try {
      this.logger.log(`💣 Starting mines round for match ${matchId}`);
      
      // Get match from database
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { wallet: true } },
          player2: { select: { wallet: true } }
        }
      });

      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      // Get or create mines game state
      let gameState = await this.minesService.getMatchState(matchId);
      
             if (!gameState) {
        // Initialize new mines match with both players
        gameState = await this.minesService.initializeMatch(matchId, match.player1.wallet, match.player2.wallet);
       } else {
        // 🔧 FIX: Ensure database consistency with memory state
        const dbGameData = match.gameData as any;
        if (dbGameData && dbGameData.currentRound !== gameState.currentRound) {
          this.logger.warn(`⚠️ Database/memory state mismatch for match ${matchId} - syncing from DB`);
          gameState = dbGameData;
          await this.minesService.initializeMatch(matchId, match.player1.wallet, match.player2.wallet);
        }
       }

      // Start the round
      const result = await this.minesService.startRound(matchId);
      
      if (result.success) {
                 // Update database with current state
         await this.prisma.match.update({
           where: { id: matchId },
           data: {
             gameData: JSON.parse(JSON.stringify(result.gameState)),
             status: 'in_progress'
           }
         });

        // 🔧 NEW: Set timeout for this round to prevent infinite waiting
        this.setMinesRoundTimeout(matchId, result.gameState.currentRound);
        
        // 🔧 FIX: Start stuck match detection for this round
        this.refreshMatchActivity(matchId);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ Error starting mines round for match ${matchId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a player's mines turn
   */
  async processMinesTurn(
    matchId: string, 
    playerId: string, 
    revealedTiles: string[]
  ): Promise<{ success: boolean; gameState?: MinesGameState; error?: string }> {
    try {
      this.logger.log(`💣 Processing mines turn for ${playerId} in match ${matchId}: ${revealedTiles.length} tiles`);
      
      const result = await this.minesService.processPlayerTurn(matchId, playerId, revealedTiles);
      
      if (result.success && result.gameState) {
                 // Update database with current state
         await this.prisma.match.update({
           where: { id: matchId },
           data: {
             gameData: JSON.parse(JSON.stringify(result.gameState)),
             status: result.gameState.matchComplete ? 'completed_awaiting_payout' : 'in_progress'
           }
         });

        // If match is complete, process payout automatically
        if (result.gameState.matchComplete && result.gameState.winner) {
          // 🃏 AUTO-RECORD PnL: Record PnL immediately when match completes
          try {
            await this.autoRecordMatchPnL(matchId);
          } catch (pnlError) {
            this.logger.error(`Failed to auto-record PnL for Mines match ${matchId}: ${pnlError.message}`);
            // Don't fail the match completion if PnL recording fails
          }

          this.logger.log(`💰 Mines match completed - initiating automatic payout for match: ${matchId}`);
          setTimeout(async () => {
            try {
              const payoutResult = await this._processMatchPayoutInternal(matchId);
              this.logger.log(`💰 Mines automatic payout result:`, payoutResult);
            } catch (error) {
              this.logger.error(`❌ Error processing automatic payout for Mines match ${matchId}:`, error);
            }
          }, 2000);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ Error processing mines turn for match ${matchId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a specific tile is a mine (for real-time gameplay)
   */
  async checkMinesTile(matchId: string, tilePosition: string, playerId: string): Promise<{
    success: boolean;
    isMine?: boolean;
    currentMultiplier?: number;
    gameOver?: boolean;
    revealedTiles?: string[];
    error?: string;
  }> {
    try {
      this.logger.log(`💣 Checking tile ${tilePosition} in match ${matchId} for player ${playerId}`);
      
      const result = await this.minesService.checkTile(matchId, tilePosition, playerId);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error checking mines tile for match ${matchId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get mines game state
   */
  async getMinesGameState(matchId: string): Promise<MinesGameState | null> {
    try {
      // First try to get from mines service
      let gameState = await this.minesService.getMatchState(matchId);
      
      if (!gameState) {
        // Try to get from database
        const match = await this.prisma.match.findUnique({
          where: { id: matchId },
          include: {
            player1: { select: { wallet: true } },
            player2: { select: { wallet: true } }
          }
        });

                 if (match && match.gameData) {
           gameState = match.gameData as unknown as MinesGameState;
         }
      }

      return gameState;
    } catch (error) {
      this.logger.error(`❌ Error getting mines game state for match ${matchId}:`, error);
      return null;
    }
  }

  /**
   * 🔧 NEW: Set timeout for mines round to force completion if one player takes too long
   */
  private setMinesRoundTimeout(matchId: string, roundNumber: number): void {
    // Clear any existing timeout for this match
    const existingTimeout = this.minesRoundTimeouts.get(matchId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        this.logger.log(`⏰ Mines round ${roundNumber} timeout reached for match ${matchId} - forcing completion`);
        
        const gameState = await this.minesService.getMatchState(matchId);
        if (gameState) {
          const currentRound = gameState.rounds[gameState.rounds.length - 1];
          
          // Only force completion if round is still active and not both players have played
          if (currentRound && (!currentRound.player1Turn || !currentRound.player2Turn)) {
            const forceResult = await this.minesService.forceCompleteRound(matchId);
            
            if (forceResult.success && forceResult.gameState) {
              // Get the completed round for broadcasting
              const completedRound = forceResult.gameState.rounds[forceResult.gameState.rounds.length - 1];
              
              // 🔧 FIX: Broadcast round results to trigger reveal animation
              await this.matchGateway.broadcastRoundResultsAndScheduleNext(matchId, forceResult.gameState, completedRound);
              
              this.logger.log(`✅ Mines round ${roundNumber} completed via timeout and results broadcasted for match ${matchId}`);
            } else {
              // Fallback: Notify players about timeout if force completion failed
            this.matchGateway.server.to(matchId).emit('mines_round_timeout', {
              matchId,
              roundNumber,
              message: 'Round completed due to timeout',
              timestamp: Date.now()
            });
            }
          }
        }
      } catch (error) {
        this.logger.error(`❌ Error handling mines round timeout for ${matchId}:`, error);
      } finally {
        // Clean up timeout reference
        this.minesRoundTimeouts.delete(matchId);
      }
    }, this.MINES_ROUND_TIMEOUT);

    // Store timeout reference
    this.minesRoundTimeouts.set(matchId, timeout);
    this.logger.log(`⏰ Set ${this.MINES_ROUND_TIMEOUT/1000}s timeout for mines round ${roundNumber} in match ${matchId}`);
  }

  /**
   * 🔧 NEW: Clear mines round timeout (called when round completes normally)
   */
  clearMinesRoundTimeout(matchId: string): void {
    const timeout = this.minesRoundTimeouts.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.minesRoundTimeouts.delete(matchId);
      this.logger.log(`✅ Cleared mines round timeout for match ${matchId}`);
    }
  }

  // 🔧 NEW: Track player readiness for mines rounds
  private minesPlayerReadiness = new Map<string, Set<string>>();

  async setPlayerRoundReady(matchId: string, playerId: string): Promise<{
    success: boolean;
    bothPlayersReady?: boolean;
    alreadyReady?: boolean;
    error?: string;
  }> {
    try {
      // Get current readiness for this match
      if (!this.minesPlayerReadiness.has(matchId)) {
        this.minesPlayerReadiness.set(matchId, new Set());
      }

      const readyPlayers = this.minesPlayerReadiness.get(matchId);
      
      // 🔧 FIX: Check if player already marked as ready (prevent spam)
      if (readyPlayers.has(playerId)) {
        this.logger.log(`💣 Player ${playerId} already ready for match ${matchId} - ignoring duplicate`);
        return {
          success: true,
          alreadyReady: true,
          bothPlayersReady: readyPlayers.size >= 2
        };
      }

      readyPlayers.add(playerId);

      this.logger.log(`💣 Player ${playerId} is ready for next round in match ${matchId}`);
      this.logger.log(`💣 Ready players: ${Array.from(readyPlayers).join(', ')}`);

      // Check if both players are ready
      const bothPlayersReady = readyPlayers.size >= 2;

      if (bothPlayersReady) {
        // Clear readiness for this match (reset for next round)
        this.minesPlayerReadiness.delete(matchId);
        this.logger.log(`🚀 Both players ready for match ${matchId} - clearing readiness state`);
      }

      return {
        success: true,
        bothPlayersReady
      };

    } catch (error) {
      this.logger.error(`❌ Error setting player round ready for match ${matchId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async clearPlayerReadiness(matchId: string): Promise<void> {
    this.minesPlayerReadiness.delete(matchId);
    this.logger.log(`🧹 Cleared player readiness state for match ${matchId}`);
  }

  // 🔧 FIX: Add stuck match detection and cleanup
  private stuckMatchTimers = new Map<string, NodeJS.Timeout>();

  async detectAndCleanupStuckMinesMatch(matchId: string): Promise<void> {
    try {
      // Clear any existing stuck timer
      const existingTimer = this.stuckMatchTimers.get(matchId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set a 60-second timer to detect stuck matches
      const timer = setTimeout(async () => {
        try {
          this.logger.warn(`🔍 Checking for stuck match ${matchId} after 60s inactivity`);
          
          const gameState = await this.minesService.getMatchState(matchId);
          if (!gameState) {
            this.logger.log(`✅ Match ${matchId} not found - cleaning up timers`);
            this.stuckMatchTimers.delete(matchId);
            this.minesRoundTimeouts.delete(matchId);
            this.minesPlayerReadiness.delete(matchId);
            return;
          }

          // Check if match is in a transitional state (incomplete round)
          const currentRound = gameState.rounds[gameState.rounds.length - 1];
          const isStuck = currentRound && 
            (!currentRound.player1Turn || !currentRound.player2Turn); // Round incomplete

          if (isStuck) {
            this.logger.warn(`🚨 Detected stuck match ${matchId} - forcing completion`);
            
            // Force complete the round and clean up
            const forceResult = await this.minesService.forceCompleteRound(matchId);
            if (forceResult.success) {
              const completedRound = forceResult.gameState.rounds[forceResult.gameState.rounds.length - 1];
              await this.matchGateway.broadcastRoundResultsAndScheduleNext(matchId, forceResult.gameState, completedRound);
              this.logger.log(`✅ Cleaned up stuck match ${matchId}`);
            }
            
            // Clean up all associated timers and state
            this.stuckMatchTimers.delete(matchId);
            this.minesRoundTimeouts.delete(matchId);
            this.minesPlayerReadiness.delete(matchId);
          } else {
            this.logger.log(`✅ Match ${matchId} appears healthy - no cleanup needed`);
            this.stuckMatchTimers.delete(matchId);
          }
        } catch (error) {
          this.logger.error(`💥 Error cleaning up stuck match ${matchId}:`, error);
          this.stuckMatchTimers.delete(matchId);
        }
      }, 60000); // 60-second detection timer

      this.stuckMatchTimers.set(matchId, timer);
      this.logger.log(`🔍 Set stuck match detection timer for ${matchId}`);
    } catch (error) {
      this.logger.error(`💥 Error setting stuck match detection for ${matchId}:`, error);
    }
  }

  // Call this whenever a round starts or when there's activity
  refreshMatchActivity(matchId: string): void {
    const existingTimer = this.stuckMatchTimers.get(matchId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.stuckMatchTimers.delete(matchId);
    }
    // Restart the detection timer
    this.detectAndCleanupStuckMinesMatch(matchId);
  }

  // ===== MINES ANALYTICS BATCHING METHODS =====

  /**
   * 📊 BATCHING: Track mines session start (non-blocking)
   */
  async trackMinesSessionStart(matchId: string, playerId: string, metadata?: any): Promise<void> {
    try {
      this.minesService.trackGameSessionStart(matchId, playerId, metadata);
    } catch (error) {
      this.logger.warn(`Failed to track mines session start: ${error.message}`);
      // Don't throw - analytics shouldn't break gameplay
    }
  }

  /**
   * 📊 BATCHING: Track mines session end (non-blocking)
   */
  async trackMinesSessionEnd(matchId: string, playerId: string, tilesClicked: number, sessionDuration: number): Promise<void> {
    try {
      this.minesService.trackGameSessionEnd(matchId, playerId, tilesClicked, sessionDuration);
    } catch (error) {
      this.logger.warn(`Failed to track mines session end: ${error.message}`);
      // Don't throw - analytics shouldn't break gameplay
    }
  }

  /**
   * 📊 BATCHING: Track mines performance metric (non-blocking)
   */
  async trackMinesPerformanceMetric(
    matchId: string, 
    playerId: string, 
    eventType: 'tile_response_time' | 'animation_lag' | 'websocket_latency',
    value: number,
    metadata?: any
  ): Promise<void> {
    try {
      this.minesService.trackPerformanceMetric(matchId, playerId, eventType, value, metadata);
    } catch (error) {
      this.logger.warn(`Failed to track mines performance metric: ${error.message}`);
      // Don't throw - analytics shouldn't break gameplay
    }
  }

  /**
   * 📊 BATCHING: Get mines batching statistics for monitoring
   */
  getMinesBatchingStats() {
    try {
      return this.minesService.getBatchingStats();
    } catch (error) {
      this.logger.warn(`Failed to get mines batching stats: ${error.message}`);
      return {
        totalBatches: 0,
        totalItems: 0,
        failedBatches: 0,
        averageBatchSize: 0,
        currentBatchSize: 0,
        successRate: 100,
        lastBatchTime: 0
      };
    }
  }
} 