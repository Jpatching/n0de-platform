import { Controller, Post, Get, Body, Param, Logger, BadRequestException } from '@nestjs/common';
import { BridgeService } from './bridge.service';
import { BridgeMonitoringService } from './bridge-monitoring.service';
import { BridgeWebSocketGateway } from './bridge-websocket.gateway';
import { PrismaService } from '../database/prisma.service';

export class GetBridgeQuoteDto {
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: string;
}

export class InitiateBridgeDto {
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: string;
  userAddress: string;
  targetAddress: string;
}

export class CompleteBridgeDto {
  transactionId: string;
  userPublicKey: string;
  amount: string;
  sourceTxHash: string;
  sourceChain: string;
}

@Controller('bridge')
export class BridgeController {
  private readonly logger = new Logger(BridgeController.name);

  constructor(
    private readonly bridgeService: BridgeService,
    private readonly monitoringService: BridgeMonitoringService,
    private readonly webSocketGateway: BridgeWebSocketGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Post('quote')
  async getBridgeQuote(@Body() body: {
    sourceChain: string;
    targetChain: string;
    token: string;
    amount: string;
  }) {
    try {
      const quote = await this.bridgeService.getBridgeQuote(
        body.sourceChain,
        body.targetChain,
        body.token,
        body.amount,
      );

      this.logger.log(`📊 Bridge quote generated: ${body.amount} ${body.token} from ${body.sourceChain}`);
      return { success: true, quote };
    } catch (error) {
      this.logger.error('❌ Failed to get bridge quote:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('initiate')
  async initiateBridge(@Body() body: {
    sourceChain: string;
    targetChain: string;
    token: string;
    amount: string;
    userAddress: string;
    targetAddress: string;
  }) {
    try {
      const result = await this.bridgeService.initiateBridge(
        body.sourceChain,
        body.targetChain,
        body.token,
        body.amount,
        body.userAddress,
        body.targetAddress,
      );

      // Start monitoring the transaction
      await this.monitoringService.startMonitoring(result.transactionId);

      this.logger.log(`🌉 Bridge initiated: ${result.transactionId}`);
      return { success: true, ...result };
    } catch (error) {
      this.logger.error('❌ Failed to initiate bridge:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('status/:transactionId/:sourceTxHash')
  async getBridgeStatus(
    @Param('transactionId') transactionId: string,
    @Param('sourceTxHash') sourceTxHash: string,
  ) {
    try {
      // Get current status from monitoring service
      const status = await this.monitoringService.getTransactionStatus(transactionId);
      
      if (!status) {
        return { success: false, error: 'Transaction not found' };
      }

      // Send real-time update via WebSocket
      await this.webSocketGateway.sendTransactionUpdate(transactionId, status);

      this.logger.log(`📊 Bridge status checked: ${transactionId} - ${status.status}`);
      return { success: true, status };
    } catch (error) {
      this.logger.error('❌ Failed to get bridge status:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('complete')
  async completeBridge(@Body() body: {
    transactionId: string;
    userPublicKey: string;
    amount: string;
    sourceTxHash: string;
    sourceChain: string;
  }) {
    try {
      const result = await this.bridgeService.completeBridgeToSessionVault(
        body.transactionId,
        body.userPublicKey,
        body.amount,
        body.sourceTxHash,
        body.sourceChain,
      );

      if (result.success) {
        // Broadcast completion via WebSocket
        await this.webSocketGateway.broadcastBridgeCompletion(
          body.transactionId,
          body.userPublicKey,
          body.amount,
        );
      }

      this.logger.log(`✅ Bridge completion processed: ${body.transactionId}`);
      return { success: true, ...result };
    } catch (error) {
      this.logger.error('❌ Failed to complete bridge:', error);
      
      // Broadcast failure via WebSocket
      await this.webSocketGateway.broadcastBridgeFailure(body.transactionId, error.message);
      
      return { success: false, error: error.message };
    }
  }

  @Post('monitor/:transactionId')
  async monitorTransaction(
    @Param('transactionId') transactionId: string,
    @Body() body: { sourceTxHash: string },
  ) {
    try {
      const result = await this.bridgeService.monitorBridgeTransaction(
        transactionId,
        body.sourceTxHash,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('usdc/quote')
  async getUSDCSwapQuote(@Body() body: { amount: string }) {
    try {
      const quote = await this.bridgeService.getUSDCSwapQuote(body.amount);
      return { success: true, data: quote };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('usdc/swap')
  async executeUSDCSwap(
    @Body() body: { userPublicKey: string; amount: string },
  ) {
    try {
      const result = await this.bridgeService.executeUSDCSwap(
        body.userPublicKey,
        body.amount,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('status/:transactionId')
  async getTransactionStatus(@Param('transactionId') transactionId: string) {
    try {
      const status = await this.bridgeService.getTransactionStatus(transactionId);
      return { success: true, data: status };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('create-tables')
  async createTables() {
    try {
      // Create bridge_transactions table using raw SQL
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS bridge_transactions (
          id TEXT PRIMARY KEY,
          "userId" TEXT,
          "sourceChain" TEXT,
          "targetChain" TEXT,
          "sourceToken" TEXT,
          "targetToken" TEXT,
          amount DOUBLE PRECISION,
          "bridgeFee" DOUBLE PRECISION DEFAULT 0,
          "convenienceFee" DOUBLE PRECISION DEFAULT 0,
          "netAmount" DOUBLE PRECISION,
          status TEXT DEFAULT 'pending',
          "sourceTxHash" TEXT,
          "targetTxHash" TEXT,
          "vaaId" TEXT,
          "createdAt" TIMESTAMP(3) DEFAULT NOW(),
          "completedAt" TIMESTAMP(3)
        )
      `;

      // Create bridge_fee_collections table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS bridge_fee_collections (
          id TEXT PRIMARY KEY,
          "bridgeId" TEXT,
          "feeAmount" DOUBLE PRECISION,
          "feeType" TEXT,
          "collectedAt" TIMESTAMP(3) DEFAULT NOW()
        )
      `;

      return {
        success: true,
        message: 'Bridge tables created successfully!'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
} 