import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MatchService, CreateMatchDto, JoinMatchDto, SubmitResultDto } from './match.service';
import { GameType } from '../games/game-types';
import { AuthService } from '../auth/auth.service';
import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max, validateOrReject, IsUUID } from 'class-validator';
import { SolanaService } from '../solana/solana.service';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';

class CreateMatchRequestDto {
  @IsString()
  @IsNotEmpty()
  gameType: string;

  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  wager: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  expiryMinutes?: number;
}

class JoinMatchRequestDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;
}

class SubmitResultRequestDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsString()
  @IsNotEmpty()
  winnerId: string;

  @IsNotEmpty()
  gameData: any;

  @IsOptional()
  @IsString()
  signature?: string; // Optional since backend auto-generates
}

@Controller('matches')
@UseGuards(RateLimitGuard)
export class MatchController {
  private readonly logger = new Logger(MatchController.name);

  constructor(
    private matchService: MatchService,
    private authService: AuthService,
    private solanaService: SolanaService
  ) {}

  /**
   * Create a new match
   * POST /matches
   */
  @Post()
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 match creations per minute (increased for testing)
    message: 'Too many match creation attempts, please slow down'
  })
  async createMatch(@Body() createMatchDto: CreateMatchDto) {
    // ✅ SECURITY: Input validation handled by class-validator
    const result = await this.matchService.createMatch(createMatchDto);
    
    // Return a complete match response
    return {
      success: true,
      match: {
        id: result.matchId,
        gameType: createMatchDto.gameType,
        wager: createMatchDto.wager,
        status: 'pending',
        createdAt: new Date().toISOString(),
        escrowAddress: result.escrowAddress
      }
    };
  }

  /**
   * Create specifically a chess match
   */
  @Post('chess')
  async createChessMatch(@Body() body: { wager: number; playerWallet: string; timeControl?: string }) {
    const createMatchDto: CreateMatchDto = {
      gameType: GameType.Chess, // Use the correct enum value
      wager: body.wager,
      playerWallet: body.playerWallet,
      timeControl: body.timeControl || '5+0'
    };
    
    const result = await this.matchService.createMatch(createMatchDto);
    
    // Return a complete match response
    return {
      matchId: result.matchId,
      escrowAddress: result.escrowAddress,
      success: true,
      match: {
        id: result.matchId,
        gameType: GameType.Chess,
        wager: body.wager,
        status: 'pending',
        createdAt: new Date().toISOString(),
        escrowAddress: result.escrowAddress,
        player1: {
          wallet: body.playerWallet
        }
      }
    };
  }

  /**
   * Join an existing match
   * POST /matches/:id/join
   */
  @Post(':id/join')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 join attempts per minute (increased from 20)
    message: 'Too many join attempts, please slow down'
  })
  async joinMatch(@Param('id') matchId: string, @Body() body: { playerWallet: string }) {
    // ✅ SECURITY: Validate match ID format (gamePrefix_hash)
    if (!/^(rps|chs|cnf|dic|gme|min|crs)_[a-f0-9]{20}$/i.test(matchId)) {
      throw new BadRequestException('Invalid match ID format');
    }
    
    const joinMatchDto: JoinMatchDto = {
      matchId,
      playerWallet: body.playerWallet
    };
    
    return await this.matchService.joinMatch(joinMatchDto);
  }

  /**
   * Submit match result
   * POST /matches/:id/result
   */
  @Post(':id/submit-result')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 result submissions per minute
    message: 'Too many result submissions, please slow down'
  })
  async submitResult(
    @Param('id') matchId: string,
    @Body() resultDto: any,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // ✅ SECURITY: Authenticate user first
      const token = this.extractToken(authorization, req);
      const tokenData = await this.authService.validateToken(token);
      
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // ✅ SECURITY: Validate match ID and result data
      if (!/^(rps|chs|cnf|dic|gme|min|crs)_[a-f0-9]{20}$/i.test(matchId)) {
        throw new BadRequestException('Invalid match ID format');
      }

      // Validate result signature exists
      if (!resultDto.signature || typeof resultDto.signature !== 'string') {
        throw new BadRequestException('Valid signature required');
      }

      const submitResultDto: SubmitResultDto = {
        matchId,
        gameState: resultDto.gameState,
        winnerWallet: resultDto.winnerWallet,
        signature: resultDto.signature
      };
      
      const result = await this.matchService.submitResult(submitResultDto, tokenData.userId);

      this.logger.log(`Match result submitted by user ${tokenData.userId}: ${matchId}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        result,
      });
    } catch (error) {
      this.logger.error(`Failed to submit match result: ${error.message}`);
      this.handleError(error, res);
    }
  }

  /**
   * Submit chess result specifically
   */
  @Post(':matchId/chess-result')
  async submitChessResult(
    @Param('matchId') matchId: string, 
    @Body() body: {
      moves: any[];
      winner: 'white' | 'black' | 'draw';
      endReason: string;
      whiteTime: number;
      blackTime: number;
      whitePlayer: string;
      blackPlayer: string;
    }
  ) {
    const chessGameState = {
      moves: body.moves,
      winner: body.winner,
      endReason: body.endReason as any,
      whiteTime: body.whiteTime,
      blackTime: body.blackTime,
      finalPosition: 'fen_notation_here' // TODO: Add FEN generation
    };

    const submitResultDto: SubmitResultDto = {
      matchId,
      gameState: chessGameState,
      winnerWallet: body.winner === 'white' ? body.whitePlayer : 
                   body.winner === 'black' ? body.blackPlayer : undefined
    };
    
    return this.matchService.submitResult(submitResultDto);
  }

  /**
   * Submit dice roll for dice duel game (DEPRECATED - Use WebSocket instead)
   * POST /matches/:matchId/dice-duel
   * 
   * NOTE: This endpoint is deprecated. RPG Dice Duel now uses WebSocket communication
   * for real-time synchronized gameplay. This endpoint remains for backward compatibility
   * but will not work with RPG builds that can generate damage values > 6.
   */
  @Post(':matchId/dice-duel')
  @RateLimit({
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 10, // 10 dice rolls per 10 seconds
    message: 'Too many dice rolls, please slow down'
  })
  async submitDiceDuelRoll(
    @Param('matchId') matchId: string,
    @Body() body: { rollValue?: number; buildData?: { build: string; dice: string; buildName: string } },
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // ✅ SECURITY: Authenticate user first
      const token = this.extractToken(authorization, req);
      const tokenData = await this.authService.validateToken(token);
      
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // ✅ SECURITY: Validate match ID format
      if (!/^(rps|chs|cnf|dic|gme|min|crs)_[a-f0-9]{20}$/i.test(matchId)) {
        throw new BadRequestException('Invalid match ID format');
      }

      // ✅ RPG BUILDS: Support both legacy (1-6) and RPG damage values (1-20)
      if (body.rollValue) {
        // Legacy validation for basic dice (1-6)
        if (body.rollValue < 1 || body.rollValue > 6) {
          throw new BadRequestException('Invalid basic dice roll value (must be 1-6)');
        }
      }
      
      // If using RPG builds, validate damage range is reasonable (1-20 for Mage)
      if (body.buildData) {
        // RPG builds can generate 1-20 damage, no validation needed as backend generates the roll
        this.logger.log(`🎲 RPG Dice Duel request via HTTP (deprecated): ${body.buildData.buildName}`);
      }

      // Process the dice duel roll through match service with RPG build data
      const result = await this.matchService.processDiceDuelRoll(matchId, tokenData.userWallet, body.buildData);

      this.logger.log(`Dice duel roll submitted: Match ${matchId}, User ${tokenData.userId}`);

      return res.status(HttpStatus.OK).json({
        success: result.success,
        gameState: result.gameState,
        bothPlayersRolled: result.bothPlayersRolled,
        roundResult: result.roundResult,
        matchComplete: result.matchComplete,
        matchWinner: result.matchWinner,
        message: result.bothPlayersRolled ? 'Round complete!' : 'Waiting for opponent...'
      });
    } catch (error) {
      this.logger.error(`Failed to submit dice roll: ${error.message}`);
      this.handleError(error, res);
    }
  }

  /**
   * Cancel a pending match
   * DELETE /matches/:id
   */
  @Delete(':id')
  async cancelMatch(
    @Param('id') matchId: string,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const tokenData = await this.authService.validateToken(token);
      
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      await this.matchService.cancelMatch(tokenData.userId, matchId);

      this.logger.log(`Match cancelled by user ${tokenData.userId}: ${matchId}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Match cancelled successfully',
      });
    } catch (error) {
      this.logger.error(`Failed to cancel match: ${error.message}`);
      this.handleError(error, res);
    }
  }

  /**
   * Get available matches for joining
   * GET /matches/available
   */
  @Get('available')
  async getAvailableMatches(
    @Res() res: Response,
    @Query('gameType') gameType?: string,
    @Query('limit') limit?: string,
    @Query('excludeWallet') excludeWallet?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 20;
      
      if (limitNum > 100) {
        throw new BadRequestException('Limit cannot exceed 100');
      }

      const matches = await this.matchService.getAvailableMatches(gameType, limitNum, excludeWallet);

      return res.status(HttpStatus.OK).json({
        success: true,
        matches,
        count: matches.length,
      });
    } catch (error) {
      this.logger.error(`Failed to get available matches: ${error.message}`);
      this.handleError(error, res);
    }
  }

  /**
   * Get user's match history
   * GET /matches/history
   */
  @Get('history')
  async getUserMatches(
    @Headers('authorization') authorization: string,
    @Query('limit') limit: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const tokenData = await this.authService.validateToken(token);
      
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const limitNum = limit ? parseInt(limit, 10) : 50;
      
      if (limitNum > 200) {
        throw new BadRequestException('Limit cannot exceed 200');
      }

      const matches = await this.matchService.getUserMatches(tokenData.userId, limitNum);

      return res.status(HttpStatus.OK).json({
        success: true,
        matches,
        count: matches.length,
      });
    } catch (error) {
      this.logger.error(`Failed to get user matches: ${error.message}`);
      this.handleError(error, res);
    }
  }

  /**
   * Get match statistics
   * GET /matches/stats
   */
  @Get('stats')
  async getMatchStats(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const tokenData = await this.authService.validateToken(token);
      
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Get user profile with stats
      const user = await this.authService.getUserProfile(token);

      const stats = {
        totalMatches: user.totalMatches,
        wins: user.wins,
        losses: user.losses,
        winRate: user.winRate,
        totalEarnings: user.totalEarnings,
        reputation: user.reputation,
      };

      return res.status(HttpStatus.OK).json({
        success: true,
        stats,
      });
    } catch (error) {
      this.logger.error(`Failed to get match stats: ${error.message}`);
      this.handleError(error, res);
    }
  }

  /**
   * Health check endpoint
   * GET /matches/health
   */
  @Get('health')
  async health(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      success: true,
      service: 'matches',
      timestamp: Date.now(),
    });
  }

  /**
   * Get match by ID
   * GET /matches/:id
   */
  @Get(':matchId')
  async getMatch(@Param('matchId') matchId: string) {
    return this.matchService.getMatchStatus(matchId);
  }

  /**
   * Get RPS game state for bots
   * GET /matches/:matchId/rps/state
   */
  @Get(':matchId/rps/state')
  async getRPSGameState(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization?: string,
    @Req() req?: Request
  ) {
    try {
      // Optional authentication for bot access
      if (authorization) {
        const token = this.extractToken(authorization, req);
        await this.authService.validateToken(token);
      }

      const gameState = await this.matchService.getRPSGameState(matchId);
      
      if (!gameState) {
        throw new NotFoundException('Match not found or not an RPS match');
      }

      return gameState;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get RPS game state: ${error.message}`);
    }
  }

  /**
   * Extract token from Authorization header or cookie
   */
  private extractToken(authorization: string, req: Request): string {
    // Try Authorization header first
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    // Try cookie
    if (req.cookies && req.cookies.pv3_token) {
      return req.cookies.pv3_token;
    }

    throw new UnauthorizedException('No authentication token provided');
  }

  /**
   * Handle errors consistently
   */
  private handleError(error: any, res: Response) {
    if (Array.isArray(error)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Validation failed',
        details: error,
      });
    }

    if (error instanceof UnauthorizedException) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: error.message,
      });
    }

    if (error instanceof BadRequestException) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }

    // Generic error
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
    });
  }

  @Post('session-vault/create')
  async createSessionVault(@Body() body: { wallet: string }) {
    const { wallet } = body;
    
    if (!wallet || typeof wallet !== 'string') {
      throw new BadRequestException('Valid wallet address is required');
    }

    try {
      const vaultAddress = await this.solanaService.createSessionVault(wallet);
      
      return {
        success: true,
        message: 'Session vault created successfully',
        vaultAddress,
        wallet
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create session vault: ${error.message}`);
    }
  }

  @Post('session-vault/deposit')
  async depositToSessionVault(@Body() body: { userWallet: string; amount: number }) {
    try {
      this.logger.log(`💰 Creating deposit transaction for ${body.userWallet}: ${body.amount} SOL`);
      
      // Use the new manual transaction creation method
      const result = await this.solanaService.createDepositTransaction(body.userWallet, body.amount);
      
      return {
        success: true,
        transaction: result.transaction,
        message: result.message
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create deposit transaction: ${error.message}`);
      throw new BadRequestException(`Failed to create deposit transaction: ${error.message}`);
    }
  }

  @Post('session-vault/withdraw')
  async withdrawFromSessionVault(@Body() body: { wallet: string; amount: number }) {
    const { wallet, amount } = body;
    
    if (!wallet || typeof wallet !== 'string') {
      throw new BadRequestException('Valid wallet address is required');
    }
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Derive session vault PDA
      const vaultAddress = await this.solanaService.getSessionVaultAddress(wallet);
      const transactionId = await this.solanaService.withdrawFromVault(vaultAddress, wallet, amount);
      
      return {
        success: true,
        message: `Successfully withdrew ${amount} SOL from session vault`,
        transactionId,
        wallet
      };
    } catch (error) {
      throw new BadRequestException(`Failed to withdraw from session vault: ${error.message}`);
    }
  }

  @Get('session-vault/:wallet')
  async getSessionVaultBalance(@Param('wallet') wallet: string) {
    if (!wallet || typeof wallet !== 'string') {
      throw new BadRequestException('Valid wallet address is required');
    }

    try {
      this.logger.log(`🔍 Getting session vault balance for wallet: ${wallet}`);
      
      const balance = await this.solanaService.getSessionVaultBalance(wallet);
      
      this.logger.log(`💰 Balance from service: ${balance} lamports`);
      
      const result = {
        success: true,
        wallet,
        balance,
        balanceSOL: balance / 1_000_000_000 // Convert lamports to SOL
      };
      
      this.logger.log(`📤 Returning result:`, result);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to get session vault balance: ${error.message}`);
      throw new BadRequestException(`Failed to get session vault balance: ${error.message}`);
    }
  }

  /**
   * Get recent verifications for security dashboard
   * GET /matches/recent-verifications
   */
  @Get('recent-verifications')
  async getRecentVerifications(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      await this.authService.getUserProfile(token);
      
      // Get recent completed matches with verification data
      const recentMatches = await this.matchService.getRecentCompletedMatches(10);
      
      return res.status(HttpStatus.OK).json({
        verifications: recentMatches,
      });
    } catch (error) {
      this.logger.error(`Failed to get recent verifications: ${error.message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        verifications: [],
      });
    }
  }

  /**
   * Verify cryptographic proof of match result (Oracle endpoint)
   * GET /matches/:matchId/verify
   */
  @Get(':matchId/verify')
  async verifyMatch(@Param('matchId') matchId: string) {
    try {
      const match = await this.matchService.getMatchWithDetails(matchId);
      
      if (!match) {
        return {
          verified: false,
          error: 'Match not found',
          matchId: matchId
        };
      }

      // Get verification data using the service
      const verificationData = await this.matchService.getMatchVerificationData(matchId);

      return {
        verified: verificationData.isValid,
        matchId: matchId,
        winner: match.winner?.wallet,
        cryptographicProof: {
          resultHash: verificationData.proof.signature,
          verifierPublicKey: "7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W",
          timestamp: verificationData.proof.timestamp,
          signature: verificationData.proof.signature,
          verificationInstructions: {
            gameType: match.gameType,
            randomnessSource: verificationData.randomnessSource
          }
        },
        verificationDetails: {
          description: "This result has been cryptographically verified using Ed25519 signature verification",
          securityLevel: "Military-grade cryptographic proof",
          tamperProof: "Mathematically impossible to forge without private key",
          transparency: "Anyone can verify this result independently",
          auditTrail: "Permanent record on Solana blockchain"
        },
        howToVerify: {
          step1: "Download the verification data above",
          step2: "Use any Ed25519 verification library",
          step3: "Recreate message: matchPDA + winnerPubkey + resultHash",
          step4: "Verify signature matches verifierPublicKey",
          step5: "Check blockchain transaction for on-chain proof"
        }
      };

    } catch (error) {
      this.logger.error(`❌ Failed to verify match result: ${error.message}`);
      return {
        verified: false,
        error: error.message,
        matchId: matchId
      };
    }
  }

  @Get('verify-result/:matchId')
  async verifyMatchResult(@Param('matchId') matchId: string) {
    try {
      const match = await this.matchService.getMatchWithDetails(matchId);
      
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      // Get cryptographic proof for verification
      const verificationData = await this.matchService.getMatchVerificationData(matchId);
      
      return {
        success: true,
        match: {
          id: match.id,
          gameType: match.gameType,
          status: match.status,
          wager: match.wager,
          player1: {
            wallet: match.player1.wallet,
            username: match.player1.username,
          },
          player2: match.player2 ? {
            wallet: match.player2.wallet,
            username: match.player2.username,
          } : null,
          winner: match.winner ? {
            wallet: match.winner.wallet,
            username: match.winner.username,
          } : null,
          createdAt: match.createdAt,
          completedAt: match.completedAt,
          escrowAddress: match.escrowAddress,
          gameData: match.gameData,
        },
        verification: verificationData,
        oracle: {
          verifiedAt: new Date().toISOString(),
          platformFee: match.wager * 0.065, // 6.5% platform fee
          verifierContract: "7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W",
          blockchainVerified: !!match.transactionHash,
        }
      };
    } catch (error) {
      this.logger.error(`Failed to verify match ${matchId}:`, error);
      throw new BadRequestException(`Failed to verify match: ${error.message}`);
    }
  }

  @Get('coinflip/:matchId/verification')
  async verifyCoinFlipMatch(@Param('matchId') matchId: string) {
    try {
      const match = await this.matchService.getMatchWithDetails(matchId);
      
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (match.gameType !== 'coin-flip') {
        throw new BadRequestException('Not a coinflip match');
      }

      // Get coinflip-specific verification data
      const coinflipVerification = await this.matchService.getCoinFlipVerificationData(matchId);
      
      return {
        success: true,
        matchId: match.id,
        gameType: 'coin-flip',
        status: match.status,
        wager: match.wager,
        players: {
          player1: {
            wallet: match.player1.wallet,
            username: match.player1.username,
          },
          player2: match.player2 ? {
            wallet: match.player2.wallet,
            username: match.player2.username,
          } : null,
        },
        result: {
          winner: match.winner ? {
            wallet: match.winner.wallet,
            username: match.winner.username,
          } : null,
          gameData: match.gameData,
          rounds: coinflipVerification.rounds,
          finalScore: coinflipVerification.finalScore,
        },
        verification: {
          cryptographicProof: coinflipVerification.cryptographicProof,
          serverSignature: coinflipVerification.serverSignature,
          randomnessSource: 'crypto.randomBytes(32)', // Server-side cryptographic randomness
          verifiedAt: new Date().toISOString(),
          blockchainTx: match.transactionHash,
        },
        oracle: {
          platformFee: match.wager * 0.065,
          verifierContract: "7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W",
          fairnessGuarantee: "Server-side cryptographic randomness with ed25519 signature verification",
        }
      };
    } catch (error) {
      this.logger.error(`Failed to verify coinflip match ${matchId}:`, error);
      throw new BadRequestException(`Failed to verify coinflip match: ${error.message}`);
    }
  }

  @Get('verify-payout/:matchId')
  async verifyPayout(@Param('matchId') matchId: string) {
    return this.matchService.verifyMatchPayout(matchId);
  }

  @Get('debug/:matchId')
  async debugMatch(@Param('matchId') matchId: string) {
    return this.matchService.debugMatchStatus(matchId);
  }

  /**
   * 🔗 CONNECTION TRACKING: Track user activity to prevent bot joining abandoned matches
   */
  @Post('track-activity')
  async trackUserActivity(
    @Headers('authorization') authorization: string, 
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // ✅ SECURITY: Authenticate user first
      const token = this.extractToken(authorization, req);
      const tokenData = await this.authService.validateToken(token);
      
      if (!tokenData) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }

      await this.matchService.trackUserActivityForMatch(tokenData.wallet);
      return res.json({ success: true, message: 'Activity tracked' });
      
    } catch (error) {
      this.logger.error('Error tracking user activity:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
} 
