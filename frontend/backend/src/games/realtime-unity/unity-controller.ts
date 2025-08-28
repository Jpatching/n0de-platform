import { Controller, Post, Body, Get, Param, Logger, BadRequestException } from '@nestjs/common';
import { UnityIntegrationService } from './unity-integration.service';
import { UnityGameResult } from './unity-game.service';

export interface UnityGameCompleteRequest {
  photonRoomId: string;
  gameResult: UnityGameResult;
  authToken?: string; // Optional authentication token from Unity
}

export interface UnityMatchInitRequest {
  matchId: string;
  gameType: string;
  player1Id: string;
  player2Id: string;
}

@Controller('unity')
export class UnityController {
  private readonly logger = new Logger(UnityController.name);

  constructor(
    private readonly unityIntegrationService: UnityIntegrationService,
  ) {}

  /**
   * 🎮 Initialize Unity multiplayer match
   * Called when a Unity game match is created/joined
   */
  @Post('initialize')
  async initializeMatch(@Body() request: UnityMatchInitRequest) {
    try {
      this.logger.log(`🚀 Initialize Unity match request: ${request.matchId}`);

      const photonRoom = await this.unityIntegrationService.initializeUnityMatch(
        request.matchId,
        request.gameType,
        request.player1Id,
        request.player2Id
      );

      return {
        success: true,
        data: {
          photonRoomId: photonRoom.roomId,
          gameType: photonRoom.gameType,
          matchId: photonRoom.matchId,
          players: {
            player1Id: photonRoom.player1Id,
            player2Id: photonRoom.player2Id,
          },
          startTime: photonRoom.startTime,
          gameState: photonRoom.gameState,
        },
        message: 'Unity match initialized successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Unity match: ${error.message}`);
      throw new BadRequestException(`Failed to initialize Unity match: ${error.message}`);
    }
  }

  /**
   * 🏁 Unity game completion webhook
   * Called by Unity client when game finishes
   * This is the main entry point for Unity → Smart Contract flow
   */
  @Post('game-complete')
  async handleGameComplete(@Body() request: UnityGameCompleteRequest) {
    try {
      this.logger.log(`🏁 Unity game completion webhook: ${request.photonRoomId}`);

      // Validate request
      if (!request.photonRoomId || !request.gameResult) {
        throw new BadRequestException('Missing required fields: photonRoomId, gameResult');
      }

      // Optional: Validate auth token if provided
      if (request.authToken) {
        // TODO: Implement Unity auth token validation
        // This could verify the request came from your Unity build
      }

      // Process complete Unity game flow (validation + smart contract submission)
      const txSignature = await this.unityIntegrationService.processUnityGameComplete(
        request.photonRoomId,
        request.gameResult
      );

      return {
        success: true,
        data: {
          transactionSignature: txSignature,
          photonRoomId: request.photonRoomId,
          winner: request.gameResult.winner,
          player1Score: request.gameResult.player1Score,
          player2Score: request.gameResult.player2Score,
          gameDuration: request.gameResult.gameDurationMs,
        },
        message: 'Unity game completed and payout processed successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to process Unity game completion: ${error.message}`);
      throw new BadRequestException(`Failed to process Unity game completion: ${error.message}`);
    }
  }

  /**
   * 📊 Get Unity game status
   * Called by frontend to check Unity game progress
   */
  @Get('status/:matchId')
  async getGameStatus(@Param('matchId') matchId: string) {
    try {
      this.logger.log(`📊 Get Unity game status: ${matchId}`);

      const status = await this.unityIntegrationService.getUnityGameStatus(matchId);
      
      if (!status) {
        throw new BadRequestException(`Unity game not found: ${matchId}`);
      }

      return {
        success: true,
        data: status,
        message: 'Unity game status retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get Unity game status: ${error.message}`);
      throw new BadRequestException(`Failed to get Unity game status: ${error.message}`);
    }
  }

  /**
   * ❌ Cancel Unity match
   * Emergency endpoint to cancel Unity matches
   */
  @Post('cancel/:matchId')
  async cancelMatch(@Param('matchId') matchId: string, @Body() body: { reason: string }) {
    try {
      this.logger.log(`❌ Cancel Unity match: ${matchId}`);

      await this.unityIntegrationService.cancelUnityMatch(matchId, body.reason || 'Manual cancellation');

      return {
        success: true,
        data: { matchId },
        message: 'Unity match cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to cancel Unity match: ${error.message}`);
      throw new BadRequestException(`Failed to cancel Unity match: ${error.message}`);
    }
  }

  /**
   * 🔍 Health check for Unity integration
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      data: {
        service: 'Unity Integration',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      message: 'Unity integration service is healthy',
    };
  }
} 