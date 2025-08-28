import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SolanaService } from '../../solana/solana.service';
import { VerifierService } from '../../verifier/verifier.service';
import { UnityGameService, PhotonRoomData, UnityGameResult } from './unity-game.service';
import { GameType } from '../game-types';
import { PublicKey } from '@solana/web3.js';
import { createHash } from 'crypto';
import * as bs58 from 'bs58';

// Unity-specific interfaces
export interface UnityMatchResult {
  matchId: string;
  photonRoomId: string;
  winnerId: string;
  winnerWallet: string;
  gameResult: UnityGameResult;
  verificationSignature: string;
  resultHash: string;
}

@Injectable()
export class UnityIntegrationService {
  private readonly logger = new Logger(UnityIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private solanaService: SolanaService,
    private verifierService: VerifierService,
    private unityGameService: UnityGameService,
  ) {}

  /**
   * 🎮 STEP 1: Initialize Unity match and create Photon room
   * Called when players join a Unity game match
   */
  async initializeUnityMatch(matchId: string, gameType: string, player1Id: string, player2Id: string): Promise<PhotonRoomData> {
    this.logger.log(`🎮 Initializing Unity match: ${matchId} for game: ${gameType}`);

    // Get match details
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      throw new Error(`Match not found: ${matchId}`);
    }

    // Validate gameType is a Unity game
    const unityGameType = gameType as GameType;
    if (!Object.values(GameType).includes(unityGameType)) {
      throw new Error(`Invalid game type: ${gameType}`);
    }

    // Create Photon room for Unity multiplayer
    const photonRoom = await this.unityGameService.createPhotonRoom(matchId, unityGameType, player1Id, player2Id);

    // Update match with Unity-specific game data
    const gameData = {
      photonRoomId: photonRoom.roomId,
      gameType,
      unityVersion: '2023.3.0f1',
      createdAt: Date.now(),
    };

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        gameData,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    this.logger.log(`✅ Unity match initialized with Photon room: ${photonRoom.roomId}`);
    return photonRoom;
  }

  /**
   * 🏆 STEP 2: Handle Unity game completion and validate result
   * Called by Unity game server when match completes
   */
  async handleUnityGameCompletion(
    photonRoomId: string,
    gameResult: UnityGameResult
  ): Promise<UnityMatchResult> {
    this.logger.log(`🏆 Handling Unity game completion: ${photonRoomId}`);

    // Get room data and match
    const room = this.unityGameService.getActiveRoom(photonRoomId);
    if (!room) {
      throw new Error(`Photon room not found: ${photonRoomId}`);
    }

    const match = await this.prisma.match.findUnique({
      where: { id: room.matchId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      throw new Error(`Match not found: ${room.matchId}`);
    }

    // Validate Unity game result
    const validation = await this.unityGameService.handleGameCompletion(photonRoomId, gameResult);
    if (!validation.isValid) {
      throw new Error(`Unity game validation failed: ${validation.errors.join(', ')}`);
    }

    // Determine winner based on scores
    const winnerId = gameResult.player1Score > gameResult.player2Score ? room.player1Id : room.player2Id;
    const winnerWallet = winnerId === match.player1Id ? match.player1.wallet : match.player2!.wallet;

    // Create result hash for smart contract
    const resultHash = this.createUnityResultHash(gameResult);

    // Sign the result with verifier key
    const verificationSignature = await this.signUnityResult(room.matchId, winnerWallet, resultHash);

    const unityMatchResult: UnityMatchResult = {
      matchId: room.matchId,
      photonRoomId,
      winnerId,
      winnerWallet,
      gameResult,
      verificationSignature,
      resultHash,
    };

    // Update match status
    const currentGameData = match.gameData as any || {};
    await this.prisma.match.update({
      where: { id: room.matchId },
      data: {
        status: 'completed',
        winnerId,
        endedAt: new Date(),
        gameData: {
          ...currentGameData,
          gameResult,
          resultHash,
          completedAt: Date.now(),
        },
      },
    });

    this.logger.log(`✅ Unity game result processed for match: ${room.matchId}`);
    return unityMatchResult;
  }

  /**
   * 💰 STEP 3: Submit result to smart contract for payout
   * Automatically called after successful Unity game validation
   */
  async submitUnityResultToContract(unityMatchResult: UnityMatchResult): Promise<string> {
    this.logger.log(`💰 Submitting Unity result to smart contract: ${unityMatchResult.matchId}`);

    try {
      // Get match details for smart contract call
      const match = await this.prisma.match.findUnique({
        where: { id: unityMatchResult.matchId },
        include: {
          player1: true,
          player2: true,
        },
      });

      if (!match) {
        throw new Error(`Match not found: ${unityMatchResult.matchId}`);
      }

      // Submit to smart contract using the correct signature
      const txSignature = await this.solanaService.submitMatchResult(
        match.escrowAddress!,
        unityMatchResult.winnerWallet,
        unityMatchResult.verificationSignature,
        {
          resultHash: unityMatchResult.resultHash,
          gameType: 'unity',
          gameResult: unityMatchResult.gameResult,
        }
      );

      // Update match with transaction
      await this.prisma.match.update({
        where: { id: unityMatchResult.matchId },
        data: {
          transactionId: txSignature,
          status: 'paid_out',
        },
      });

      this.logger.log(`✅ Unity result submitted to smart contract: ${txSignature}`);
      return txSignature;

    } catch (error) {
      this.logger.error(`❌ Failed to submit Unity result to smart contract: ${error.message}`);
      
      // Update match status to failed
      const currentGameData = (await this.prisma.match.findUnique({
        where: { id: unityMatchResult.matchId }
      }))?.gameData as any || {};

      await this.prisma.match.update({
        where: { id: unityMatchResult.matchId },
        data: {
          status: 'failed',
          gameData: {
            ...currentGameData,
            error: error.message,
            failedAt: Date.now(),
          },
        },
      });

      throw error;
    }
  }

  /**
   * 🔄 Complete Unity game flow (Steps 2 + 3 combined)
   * Main entry point for Unity game completion webhook
   */
  async processUnityGameComplete(
    photonRoomId: string,
    gameResult: UnityGameResult
  ): Promise<string> {
    this.logger.log(`🎮 Processing complete Unity game flow: ${photonRoomId}`);

    // Step 2: Handle game completion and validation
    const unityMatchResult = await this.handleUnityGameCompletion(photonRoomId, gameResult);

    // Step 3: Submit to smart contract for payout
    const txSignature = await this.submitUnityResultToContract(unityMatchResult);

    // Cleanup Unity resources
    await this.unityGameService.cleanupGame(photonRoomId);

    this.logger.log(`🏆 Unity game flow completed successfully: ${txSignature}`);
    return txSignature;
  }

  /**
   * Create deterministic hash of Unity game result for smart contract
   */
  private createUnityResultHash(gameResult: UnityGameResult): string {
    const hashData = {
      photonRoomId: gameResult.photonRoomId,
      gameDurationMs: gameResult.gameDurationMs,
      player1Score: gameResult.player1Score,
      player2Score: gameResult.player2Score,
      totalActions: gameResult.totalActions,
      gameEventsHash: gameResult.gameEventsHash,
      photonSessionHash: gameResult.photonSessionHash,
      unityBuildVersion: gameResult.unityBuildVersion,
      antiCheatSignature: gameResult.antiCheatSignature,
      winner: gameResult.winner,
    };

    const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
    return createHash('sha256').update(hashString).digest('hex');
  }

  /**
   * Sign Unity game result with verifier private key
   */
  private async signUnityResult(matchId: string, winnerWallet: string, resultHash: string): Promise<string> {
    const gameResult = {
      matchId,
      gameType: 'unity',
      player1Id: '', // Will be filled by verifier service
      player2Id: '', // Will be filled by verifier service
      winnerId: winnerWallet,
      resultHash,
      timestamp: Date.now(),
      gameData: {
        resultHash,
        timestamp: Date.now(),
      }
    };

    return await this.verifierService.signGameResult(gameResult);
  }

  /**
   * Get Unity game status for frontend
   */
  async getUnityGameStatus(matchId: string): Promise<any> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      return null;
    }

    const gameData = match.gameData as any;
    if (!gameData?.photonRoomId) {
      return null;
    }

    const room = this.unityGameService.getActiveRoom(gameData.photonRoomId);
    
    return {
      matchId,
      photonRoomId: gameData.photonRoomId,
      status: match.status,
      players: [
        {
          id: match.player1.id,
          wallet: match.player1.wallet,
          displayName: match.player1.displayName,
        },
        match.player2 ? {
          id: match.player2.id,
          wallet: match.player2.wallet,
          displayName: match.player2.displayName,
        } : null,
      ],
      wagerAmount: match.wager,
      gameType: gameData.gameType,
      room: room ? {
        roomId: room.roomId,
        gameState: room.gameState,
        startTime: room.startTime,
        endTime: room.endTime,
      } : null,
    };
  }

  /**
   * Cancel Unity match (before game starts)
   */
  async cancelUnityMatch(matchId: string, reason: string): Promise<void> {
    this.logger.log(`❌ Cancelling Unity match: ${matchId} - ${reason}`);

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error(`Match not found: ${matchId}`);
    }

    // Cancel smart contract escrow if exists
    if (match.escrowAddress) {
      // Note: This would need to be implemented in SolanaService
      // await this.solanaService.cancelMatch(match.escrowAddress);
    }

    // Update match status
    const currentGameData = match.gameData as any || {};
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'cancelled',
        gameData: {
          ...currentGameData,
          cancelledAt: Date.now(),
          cancelReason: reason,
        },
      },
    });

    // Cleanup Unity resources if room exists
    const gameData = match.gameData as any;
    if (gameData?.photonRoomId) {
      await this.unityGameService.cleanupGame(gameData.photonRoomId);
    }

    this.logger.log(`✅ Unity match cancelled: ${matchId}`);
  }
} 