import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { BridgeService } from './bridge.service';

export interface BridgeTransactionStatus {
  id: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: string;
  sourceTxHash?: string;
  targetTxHash?: string;
  vaaId?: string;
  error?: string;
}

@Injectable()
export class BridgeMonitoringService {
  private readonly logger = new Logger(BridgeMonitoringService.name);
  private monitoringTransactions = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private bridgeService: BridgeService,
  ) {}

  async startMonitoring(transactionId: string) {
    if (this.monitoringTransactions.has(transactionId)) {
      this.logger.warn(`⚠️ Already monitoring transaction: ${transactionId}`);
      return;
    }

    this.monitoringTransactions.add(transactionId);
    this.logger.log(`🔍 Started monitoring bridge transaction: ${transactionId}`);
    
    // Start monitoring immediately
    this.monitorSingleTransaction(transactionId);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorAllTransactions() {
    try {
      // Get all pending/bridging transactions from database
      const pendingTransactions = await this.prisma.bridgeTransaction.findMany({
        where: {
          status: {
            in: ['PENDING', 'BRIDGING']
          }
        }
      });

      for (const transaction of pendingTransactions) {
        if (!this.monitoringTransactions.has(transaction.id)) {
          this.startMonitoring(transaction.id);
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to monitor all transactions:', error);
    }
  }

  private async monitorSingleTransaction(transactionId: string) {
    try {
      const transaction = await this.prisma.bridgeTransaction.findUnique({
        where: { id: transactionId }
      });
      
      if (!transaction) {
        this.logger.warn(`⚠️ Transaction ${transactionId} not found in database`);
        this.monitoringTransactions.delete(transactionId);
        return;
      }

      this.logger.log(`🔍 Monitoring bridge transaction: ${transactionId} (${transaction.status})`);

      // Check Wormhole status
      const status = await this.checkWormholeTransactionStatus(transactionId, transaction);
      
      // Handle completion
      if (status.status === 'completed') {
        await this.handleBridgeCompletion(transactionId, transaction, status);
        this.monitoringTransactions.delete(transactionId);
      } else if (status.status === 'failed') {
        await this.handleBridgeFailure(transactionId, transaction, status);
        this.monitoringTransactions.delete(transactionId);
      } else {
        // Continue monitoring
        setTimeout(() => this.monitorSingleTransaction(transactionId), 15000); // Check again in 15s
      }
    } catch (error) {
      this.logger.error(`❌ Failed to monitor transaction ${transactionId}:`, error);
      this.monitoringTransactions.delete(transactionId);
    }
  }

  private async checkWormholeTransactionStatus(transactionId: string, transaction: any): Promise<BridgeTransactionStatus> {
    try {
      const now = Date.now();
      const elapsed = now - transaction.createdAt.getTime();
      const elapsedMinutes = elapsed / (1000 * 60);

      // Check if we have a source transaction hash
      if (!transaction.sourceTxHash) {
        return {
          id: transactionId,
          status: 'pending',
          progress: 5,
          currentStep: 'Waiting for source transaction...',
          estimatedTimeRemaining: 'Waiting for user confirmation',
        };
      }

      // Real Wormhole VAA status check
      const vaaStatus = await this.checkWormholeVAAStatus(transaction.sourceTxHash);
      
      if (vaaStatus.isComplete) {
        return {
          id: transactionId,
          status: 'completed',
          progress: 100,
          currentStep: 'Bridge completed successfully!',
          sourceTxHash: transaction.sourceTxHash,
          targetTxHash: transaction.targetTxHash,
          vaaId: vaaStatus.vaaId,
        };
      }

      // Progressive status based on time elapsed
      if (elapsedMinutes < 1) {
        return {
          id: transactionId,
          status: 'pending',
          progress: 20,
          currentStep: 'Confirming source transaction...',
          estimatedTimeRemaining: '2-4 minutes',
          sourceTxHash: transaction.sourceTxHash,
        };
      } else if (elapsedMinutes < 5) {
        return {
          id: transactionId,
          status: 'bridging',
          progress: 60,
          currentStep: 'Processing through Wormhole bridge...',
          estimatedTimeRemaining: '1-3 minutes',
          sourceTxHash: transaction.sourceTxHash,
          vaaId: vaaStatus.vaaId,
        };
      } else if (elapsedMinutes < 10) {
        return {
          id: transactionId,
          status: 'bridging',
          progress: 80,
          currentStep: 'Finalizing on Solana...',
          estimatedTimeRemaining: '30 seconds',
          sourceTxHash: transaction.sourceTxHash,
          vaaId: vaaStatus.vaaId,
        };
      } else {
        // After 10 minutes, consider it failed
        return {
          id: transactionId,
          status: 'failed',
          progress: 0,
          currentStep: 'Bridge timeout - transaction failed',
          error: 'Transaction took too long to complete',
          sourceTxHash: transaction.sourceTxHash,
        };
      }
    } catch (error) {
      this.logger.error(`❌ Failed to check Wormhole status for ${transactionId}:`, error);
      return {
        id: transactionId,
        status: 'failed',
        progress: 0,
        currentStep: 'Bridge monitoring failed',
        error: error.message,
      };
    }
  }

  private async handleBridgeCompletion(transactionId: string, transaction: any, status: BridgeTransactionStatus) {
    try {
      this.logger.log(`✅ Bridge completed: ${transactionId}`);

      // Complete the bridge to session vault using real service
      const result = await this.bridgeService.completeBridgeToSessionVault(
        transactionId,
        transaction.userAddress,
        transaction.amount.toString(),
        transaction.sourceTxHash,
        transaction.sourceChain,
      );

      this.logger.log(`💰 Bridge completion result:`, result);

    } catch (error) {
      this.logger.error(`❌ Failed to handle bridge completion for ${transactionId}:`, error);
      
      // Update database with failure
      await this.prisma.bridgeTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'failed',
        },
      });
    }
  }

  private async handleBridgeFailure(transactionId: string, transaction: any, status: BridgeTransactionStatus) {
    try {
      this.logger.error(`❌ Bridge failed: ${transactionId} - ${status.error}`);

      // Update database with failure
      await this.prisma.bridgeTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'failed',
        },
      });

    } catch (error) {
      this.logger.error(`❌ Failed to handle bridge failure for ${transactionId}:`, error);
    }
  }

  private async checkWormholeVAAStatus(sourceTxHash: string): Promise<{ isComplete: boolean; vaaId?: string }> {
    try {
      // Query Wormhole Guardian API for VAA status
      const response = await fetch(`https://api.wormhole.com/v1/signed-vaa/${sourceTxHash}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          isComplete: true,
          vaaId: data.vaaBytes,
        };
      }
      
      return { isComplete: false };
    } catch (error) {
      this.logger.warn(`⚠️ Could not check VAA status for ${sourceTxHash}:`, error);
      return { isComplete: false };
    }
  }

  async getTransactionStatus(transactionId: string): Promise<BridgeTransactionStatus | null> {
    try {
      const transaction = await this.prisma.bridgeTransaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) {
        return null;
      }

      return await this.checkWormholeTransactionStatus(transactionId, transaction);
    } catch (error) {
      this.logger.error(`❌ Failed to get transaction status for ${transactionId}:`, error);
      return null;
    }
  }
} 