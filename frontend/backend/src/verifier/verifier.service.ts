import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import { createHash } from 'crypto';

export interface GameResult {
  matchId: string;
  gameType: string;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  gameData: any;
  timestamp: number;
}

export interface VerificationResult {
  isValid: boolean;
  reason?: string;
  confidence: number;
  flags: string[];
}

@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);
  private readonly SIGNATURE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly verifierKeypair: nacl.SignKeyPair;

  constructor(private prisma: PrismaService) {
    // Initialize verifier keypair (in production, load from secure storage)
    const seed = process.env.VERIFIER_SEED 
      ? new Uint8Array(JSON.parse(process.env.VERIFIER_SEED))
      : nacl.randomBytes(32);
    
    this.verifierKeypair = nacl.sign.keyPair.fromSeed(seed);
    this.logger.log('Verifier service initialized');
  }

  /**
   * Verify game result with signature
   */
  async verifyResult(
    matchId: string,
    winnerId: string,
    gameData: any,
    signature: string
  ): Promise<boolean> {
    try {
      // Get match details
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: true,
          player2: true,
        },
      });

      if (!match) {
        this.logger.warn(`Match not found: ${matchId}`);
        return false;
      }

      // Validate match state
      if (match.status !== 'in_progress') {
        this.logger.warn(`Invalid match status for verification: ${match.status}`);
        return false;
      }

      // Validate winner
      if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
        this.logger.warn(`Invalid winner ID: ${winnerId}`);
        return false;
      }

      // Create game result object
      const gameResult: GameResult = {
        matchId,
        gameType: match.gameType,
        player1Id: match.player1Id,
        player2Id: match.player2Id!,
        winnerId,
        gameData,
        timestamp: Date.now(),
      };

      // Verify signature
      const verificationResult = await this.verifyGameSignature(gameResult, signature);
      
      if (!verificationResult.isValid) {
        this.logger.warn(`Signature verification failed: ${verificationResult.reason}`);
        await this.logSecurityEvent(matchId, 'INVALID_SIGNATURE', {
          reason: verificationResult.reason,
          flags: verificationResult.flags,
        });
        return false;
      }

      // Game-specific validation
      const gameValidation = await this.validateGameLogic(gameResult);
      
      if (!gameValidation.isValid) {
        this.logger.warn(`Game logic validation failed: ${gameValidation.reason}`);
        await this.logSecurityEvent(matchId, 'INVALID_GAME_LOGIC', {
          reason: gameValidation.reason,
          flags: gameValidation.flags,
        });
        return false;
      }

      // Anti-cheat checks
      const antiCheatResult = await this.runAntiCheatChecks(gameResult);
      
      if (!antiCheatResult.isValid) {
        this.logger.warn(`Anti-cheat check failed: ${antiCheatResult.reason}`);
        await this.logSecurityEvent(matchId, 'ANTI_CHEAT_VIOLATION', {
          reason: antiCheatResult.reason,
          flags: antiCheatResult.flags,
        });
        return false;
      }

      // Log successful verification
      await this.logSecurityEvent(matchId, 'VERIFICATION_SUCCESS', {
        winnerId,
        confidence: Math.min(verificationResult.confidence, gameValidation.confidence, antiCheatResult.confidence),
      });

      this.logger.log(`Game result verified successfully: ${matchId}`);
      return true;
    } catch (error) {
      this.logger.error(`Verification error: ${error.message}`);
      await this.logSecurityEvent(matchId, 'VERIFICATION_ERROR', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Verify ed25519 signature of game result
   */
  private async verifyGameSignature(gameResult: GameResult, signature: string): Promise<VerificationResult> {
    try {
      // Check timestamp freshness
      const now = Date.now();
      if (now - gameResult.timestamp > this.SIGNATURE_EXPIRY) {
        return {
          isValid: false,
          reason: 'Signature timestamp expired',
          confidence: 0,
          flags: ['EXPIRED_SIGNATURE'],
        };
      }

      // Create deterministic message from game result
      const message = this.createGameResultMessage(gameResult);
      const messageBytes = new TextEncoder().encode(message);

      // Decode signature
      let signatureBytes: Uint8Array;
      try {
        signatureBytes = bs58.decode(signature);
      } catch {
        return {
          isValid: false,
          reason: 'Invalid signature format',
          confidence: 0,
          flags: ['INVALID_SIGNATURE_FORMAT'],
        };
      }

      // Verify signature with verifier public key
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        this.verifierKeypair.publicKey
      );

      if (!isValid) {
        return {
          isValid: false,
          reason: 'Signature verification failed',
          confidence: 0,
          flags: ['SIGNATURE_MISMATCH'],
        };
      }

      return {
        isValid: true,
        confidence: 100,
        flags: [],
      };
    } catch (error) {
      return {
        isValid: false,
        reason: `Signature verification error: ${error.message}`,
        confidence: 0,
        flags: ['VERIFICATION_ERROR'],
      };
    }
  }

  /**
   * Validate game-specific logic
   */
  private async validateGameLogic(gameResult: GameResult): Promise<VerificationResult> {
    try {
      switch (gameResult.gameType) {
        case 'coin_flip':
          return this.validateCoinFlip(gameResult);
        case 'rock_paper_scissors':
          return this.validateRockPaperScissors(gameResult);
        case 'dice_duel':
          return this.validateDiceRoll(gameResult);
        case 'chess':
          return this.validateChess(gameResult);
        default:
          return {
            isValid: false,
            reason: `Unsupported game type: ${gameResult.gameType}`,
            confidence: 0,
            flags: ['UNSUPPORTED_GAME'],
          };
      }
    } catch (error) {
      return {
        isValid: false,
        reason: `Game validation error: ${error.message}`,
        confidence: 0,
        flags: ['VALIDATION_ERROR'],
      };
    }
  }

  /**
   * Validate coin flip game
   */
  private validateCoinFlip(gameResult: GameResult): VerificationResult {
    const { gameData } = gameResult;
    
    if (!gameData.player1Choice || !gameData.player2Choice || !gameData.result) {
      return {
        isValid: false,
        reason: 'Missing required coin flip data',
        confidence: 0,
        flags: ['MISSING_GAME_DATA'],
      };
    }

    // Validate choices
    const validChoices = ['heads', 'tails'];
    if (!validChoices.includes(gameData.player1Choice) || !validChoices.includes(gameData.player2Choice)) {
      return {
        isValid: false,
        reason: 'Invalid coin flip choices',
        confidence: 0,
        flags: ['INVALID_CHOICES'],
      };
    }

    // Validate result
    if (!validChoices.includes(gameData.result)) {
      return {
        isValid: false,
        reason: 'Invalid coin flip result',
        confidence: 0,
        flags: ['INVALID_RESULT'],
      };
    }

    // Determine winner based on result
    const expectedWinner = gameData.player1Choice === gameData.result 
      ? gameResult.player1Id 
      : gameResult.player2Id;

    if (gameResult.winnerId !== expectedWinner) {
      return {
        isValid: false,
        reason: 'Winner does not match game result',
        confidence: 0,
        flags: ['WINNER_MISMATCH'],
      };
    }

    return {
      isValid: true,
      confidence: 95,
      flags: [],
    };
  }

  /**
   * Validate rock paper scissors game
   */
  private validateRockPaperScissors(gameResult: GameResult): VerificationResult {
    const { gameData } = gameResult;
    
    if (!gameData.player1Choice || !gameData.player2Choice) {
      return {
        isValid: false,
        reason: 'Missing RPS choices',
        confidence: 0,
        flags: ['MISSING_GAME_DATA'],
      };
    }

    const validChoices = ['rock', 'paper', 'scissors'];
    if (!validChoices.includes(gameData.player1Choice) || !validChoices.includes(gameData.player2Choice)) {
      return {
        isValid: false,
        reason: 'Invalid RPS choices',
        confidence: 0,
        flags: ['INVALID_CHOICES'],
      };
    }

    // Determine winner
    const p1Choice = gameData.player1Choice;
    const p2Choice = gameData.player2Choice;
    
    let expectedWinner: string | null = null;
    
    if (p1Choice === p2Choice) {
      // Tie - this shouldn't happen in a 1v1 match
      return {
        isValid: false,
        reason: 'RPS game resulted in tie',
        confidence: 0,
        flags: ['GAME_TIE'],
      };
    }
    
    if (
      (p1Choice === 'rock' && p2Choice === 'scissors') ||
      (p1Choice === 'paper' && p2Choice === 'rock') ||
      (p1Choice === 'scissors' && p2Choice === 'paper')
    ) {
      expectedWinner = gameResult.player1Id;
    } else {
      expectedWinner = gameResult.player2Id;
    }

    if (gameResult.winnerId !== expectedWinner) {
      return {
        isValid: false,
        reason: 'RPS winner does not match game logic',
        confidence: 0,
        flags: ['WINNER_MISMATCH'],
      };
    }

    return {
      isValid: true,
      confidence: 100,
      flags: [],
    };
  }

  /**
   * Validate dice roll game (supports both basic dice and RPG builds)
   */
  private validateDiceRoll(gameResult: GameResult): VerificationResult {
    const { gameData } = gameResult;
    
    if (!gameData.player1Roll || !gameData.player2Roll) {
      return {
        isValid: false,
        reason: 'Missing dice roll data',
        confidence: 0,
        flags: ['MISSING_GAME_DATA'],
      };
    }

    // 🎲 RPG BUILDS: Support expanded damage ranges for RPG dice builds
    // Basic dice: 1-6, RPG builds: 1-20 (Mage d20), 2-14 (Warrior 2d6+2), etc.
    const minDamage = 1;
    const maxDamage = 20; // Maximum possible damage from Mage (1d20)
    
    // Validate roll values with expanded range
    if (gameData.player1Roll < minDamage || gameData.player1Roll > maxDamage ||
        gameData.player2Roll < minDamage || gameData.player2Roll > maxDamage) {
      return {
        isValid: false,
        reason: `Invalid dice roll values (must be ${minDamage}-${maxDamage} for RPG builds)`,
        confidence: 0,
        flags: ['INVALID_ROLL_VALUES'],
      };
    }

    // 🎲 RPG BUILD VALIDATION: Check build consistency if available
    const flags: string[] = [];
    let confidence = 95;
    
    // Validate RPG build damage ranges if build data is present
    if (gameData.player1Build || gameData.player2Build) {
      flags.push('RPG_BUILD_DETECTED');
      
      // Validate player 1 build damage range
      if (gameData.player1Build) {
        const isValidP1Damage = this.validateRPGBuildDamage(gameData.player1Build, gameData.player1Roll);
        if (!isValidP1Damage) {
          flags.push('PLAYER1_BUILD_DAMAGE_MISMATCH');
          confidence -= 20;
        }
      }
      
      // Validate player 2 build damage range
      if (gameData.player2Build) {
        const isValidP2Damage = this.validateRPGBuildDamage(gameData.player2Build, gameData.player2Roll);
        if (!isValidP2Damage) {
          flags.push('PLAYER2_BUILD_DAMAGE_MISMATCH');
          confidence -= 20;
        }
      }
    }

    // Determine winner (highest roll wins)
    let expectedWinner: string;
    if (gameData.player1Roll > gameData.player2Roll) {
      expectedWinner = gameResult.player1Id;
    } else if (gameData.player2Roll > gameData.player1Roll) {
      expectedWinner = gameResult.player2Id;
    } else {
      // Tie - valid in RPG system
      flags.push('DICE_TIE');
      if (!gameResult.winnerId) {
        // No winner in tie - valid
        return {
          isValid: true,
          confidence: Math.max(confidence - 5, 85), // Slight reduction for tie
          flags,
        };
      } else {
        // Tie but winner declared - suspicious
        return {
          isValid: false,
          reason: 'Dice game resulted in tie but winner was declared',
          confidence: 0,
          flags: [...flags, 'TIE_WITH_WINNER'],
        };
      }
    }

    if (gameResult.winnerId !== expectedWinner) {
      return {
        isValid: false,
        reason: 'Dice winner does not match roll values',
        confidence: 0,
        flags: [...flags, 'WINNER_MISMATCH'],
      };
    }

    return {
      isValid: true,
      confidence: Math.max(confidence, 80), // Minimum 80% confidence for RPG builds
      flags,
    };
  }
  
  /**
   * Validate RPG build damage is within expected range
   */
  private validateRPGBuildDamage(buildData: any, damage: number): boolean {
    if (!buildData || !buildData.dice) return true; // Skip validation if no build data
    
    const dice = buildData.dice;
    
    // Define expected damage ranges for each RPG build
    const buildRanges = {
      '3d4': { min: 3, max: 12 },      // Assassin: 3-12
      '2d6+2': { min: 4, max: 14 },    // Warrior: 4-14
      '1d12+1': { min: 2, max: 13 },   // Berserker: 2-13
      '1d20': { min: 1, max: 20 }      // Mage: 1-20
    };
    
    const range = buildRanges[dice];
    if (!range) {
      // Unknown build - allow any reasonable damage (1-20)
      return damage >= 1 && damage <= 20;
    }
    
    return damage >= range.min && damage <= range.max;
  }

  /**
   * Validate chess game
   */
  private validateChess(gameResult: GameResult): VerificationResult {
    const { gameData } = gameResult;
    
    if (!gameData.moves || !gameData.outcome || !gameData.endReason) {
      return {
        isValid: false,
        reason: 'Missing required chess game data',
        confidence: 0,
        flags: ['MISSING_GAME_DATA'],
      };
    }

    // Validate move history exists
    if (!Array.isArray(gameData.moves) || gameData.moves.length === 0) {
      return {
        isValid: false,
        reason: 'Invalid or empty move history',
        confidence: 0,
        flags: ['INVALID_MOVE_HISTORY'],
      };
    }

    // Validate game outcome
    const validOutcomes = ['checkmate', 'resignation', 'timeout', 'stalemate', 'draw'];
    if (!validOutcomes.includes(gameData.outcome)) {
      return {
        isValid: false,
        reason: 'Invalid chess game outcome',
        confidence: 0,
        flags: ['INVALID_OUTCOME'],
      };
    }

    // Validate end reason
    const validEndReasons = ['checkmate', 'resignation', 'time_forfeit', 'stalemate', 'insufficient_material', 'mutual_draw'];
    if (!validEndReasons.includes(gameData.endReason)) {
      return {
        isValid: false,
        reason: 'Invalid chess end reason',
        confidence: 0,
        flags: ['INVALID_END_REASON'],
      };
    }

    // Validate winner based on outcome
    if (gameData.outcome === 'checkmate' || gameData.outcome === 'resignation' || gameData.outcome === 'timeout') {
      // Should have a winner
      if (!gameResult.winnerId || (gameResult.winnerId !== gameResult.player1Id && gameResult.winnerId !== gameResult.player2Id)) {
        return {
          isValid: false,
          reason: 'Chess game should have a valid winner',
          confidence: 0,
          flags: ['MISSING_WINNER'],
        };
      }
    } else if (gameData.outcome === 'stalemate' || gameData.outcome === 'draw') {
      // Should not have a winner (draw)
      if (gameResult.winnerId) {
        return {
          isValid: false,
          reason: 'Draw game should not have a winner',
          confidence: 0,
          flags: ['UNEXPECTED_WINNER'],
        };
      }
    }

    // Basic move validation
    let confidence = 90;
    const flags: string[] = [];

    // Check for suspicious move patterns
    if (gameData.moves.length < 3) {
      flags.push('VERY_SHORT_GAME');
      confidence -= 20;
    }

    // Check for rapid fire moves (possible bot)
    if (gameData.moveTimes && Array.isArray(gameData.moveTimes)) {
      const avgMoveTime = gameData.moveTimes.reduce((a: number, b: number) => a + b, 0) / gameData.moveTimes.length;
      if (avgMoveTime < 100) { // Less than 100ms average
        flags.push('SUSPICIOUSLY_FAST_MOVES');
        confidence -= 30;
      }
    }

    // Validate time controls for blitz (5 minutes)
    if (gameData.timeControls) {
      const totalTime = gameData.timeControls.initial || 300000; // 5 minutes default
      if (totalTime > 600000) { // More than 10 minutes
        flags.push('INVALID_TIME_CONTROL');
        confidence -= 15;
      }
    }

    // Check for resignation timing (suspicious if very early)
    if (gameData.outcome === 'resignation' && gameData.moves.length <= 2) {
      flags.push('EARLY_RESIGNATION');
      confidence -= 25;
    }

    return {
      isValid: true,
      confidence: Math.max(confidence, 60), // Minimum 60% confidence
      flags,
    };
  }

  /**
   * Run anti-cheat checks
   */
  private async runAntiCheatChecks(gameResult: GameResult): Promise<VerificationResult> {
    const flags: string[] = [];
    let confidence = 100;

    try {
      // Check for rapid successive games (potential bot behavior)
      const recentMatches = await this.prisma.match.count({
        where: {
          OR: [
            { player1Id: gameResult.player1Id },
            { player2Id: gameResult.player1Id },
            { player1Id: gameResult.player2Id },
            { player2Id: gameResult.player2Id },
          ],
          createdAt: {
            gte: new Date(Date.now() - 60000), // Last minute
          },
        },
      });

      if (recentMatches > 10) {
        flags.push('HIGH_FREQUENCY_PLAY');
        confidence -= 20;
      }

      // Check win rate patterns (potential manipulation)
      const playerStats = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: gameResult.player1Id },
          select: { wins: true, totalMatches: true },
        }),
        this.prisma.user.findUnique({
          where: { id: gameResult.player2Id },
          select: { wins: true, totalMatches: true },
        }),
      ]);

      for (const stats of playerStats) {
        if (stats && stats.totalMatches > 10) {
          const winRate = (stats.wins / stats.totalMatches) * 100;
          if (winRate > 95 || winRate < 5) {
            flags.push('SUSPICIOUS_WIN_RATE');
            confidence -= 30;
          }
        }
      }

      // Check for timestamp manipulation
      const timeDiff = Math.abs(Date.now() - gameResult.timestamp);
      if (timeDiff > 30000) { // More than 30 seconds old
        flags.push('OLD_TIMESTAMP');
        confidence -= 10;
      }

      return {
        isValid: confidence > 50,
        reason: confidence <= 50 ? 'Failed anti-cheat checks' : undefined,
        confidence,
        flags,
      };
    } catch (error) {
      return {
        isValid: false,
        reason: `Anti-cheat check error: ${error.message}`,
        confidence: 0,
        flags: ['ANTI_CHEAT_ERROR'],
      };
    }
  }

  /**
   * Create deterministic message from game result
   */
  private createGameResultMessage(gameResult: GameResult): string {
    const data = {
      matchId: gameResult.matchId,
      gameType: gameResult.gameType,
      player1Id: gameResult.player1Id,
      player2Id: gameResult.player2Id,
      winnerId: gameResult.winnerId,
      gameData: JSON.stringify(gameResult.gameData),
      timestamp: gameResult.timestamp,
    };

    // Create deterministic string
    const message = Object.keys(data)
      .sort()
      .map(key => `${key}:${data[key]}`)
      .join('|');

    // Hash for consistency
    return createHash('sha256').update(message).digest('hex');
  }

  /**
   * Sign game result (used by game clients)
   */
  async signGameResult(gameResult: GameResult): Promise<string> {
    try {
      const message = this.createGameResultMessage(gameResult);
      const messageBytes = new TextEncoder().encode(message);
      
      const signature = nacl.sign.detached(messageBytes, this.verifierKeypair.secretKey);
      return bs58.encode(signature);
    } catch (error) {
      this.logger.error(`Failed to sign game result: ${error.message}`);
      throw new BadRequestException('Failed to sign game result');
    }
  }

  /**
   * Get verifier public key (for client verification)
   */
  getVerifierPublicKey(): string {
    return bs58.encode(this.verifierKeypair.publicKey);
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    matchId: string,
    type: string,
    details: any
  ): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId: details.winnerId,
          type: 'VERIFICATION_FAILED',
          action: 'VERIFICATION_FAILED',
          details: {
            matchId,
            ...details,
          },
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log security event: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test signature creation and verification
      const testMessage = 'health_check_' + Date.now();
      const messageBytes = new TextEncoder().encode(testMessage);
      const signature = nacl.sign.detached(messageBytes, this.verifierKeypair.secretKey);
      const isValid = nacl.sign.detached.verify(messageBytes, signature, this.verifierKeypair.publicKey);
      
      return isValid;
    } catch (error) {
      this.logger.error(`Verifier health check failed: ${error.message}`);
      return false;
    }
  }
} 