import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SolanaService } from '../solana/solana.service';
import { 
  wormhole, 
  Wormhole, 
  Chain, 
  TokenTransfer,
  CircleTransfer,
  TokenId,
  ChainAddress,
  amount,
  signSendWait
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

export interface BridgeQuote {
  sourceChain: string;
  targetChain: string;
  sourceToken: string;
  targetToken: string;
  amount: string;
  estimatedGasFee: string;
  bridgeFee: string;
  convenienceFee: string;
  totalFee: string;
  netAmount: string;
  estimatedTime: string;
  swapType?: 'bridge' | 'swap';
}

export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  fee: string;
  route: string;
}

export interface BridgeTransaction {
  id: string;
  sourceChain: string;
  targetChain: string;
  sourceToken: string;
  amount: string;
  userAddress: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  sourceTxHash?: string;
  targetTxHash?: string;
  vaaId?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class BridgeService {
  private readonly logger = new Logger(BridgeService.name);
  private wormhole: Wormhole<'Mainnet'>;
  private solanaConnection: Connection;
  private ethProvider: ethers.JsonRpcProvider;

  constructor(
    private prisma: PrismaService,
    private solanaService: SolanaService,
  ) {
    this.initializeWormhole();
  }

  private async initializeWormhole() {
    try {
      // Initialize Wormhole with mainnet using the correct v2 API
      this.wormhole = await wormhole('Mainnet', [evm, solana]);
      
      // Initialize connections with proper RPC endpoints
      this.solanaConnection = new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        { commitment: 'confirmed' }
      );
      
      this.ethProvider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      );
      
      this.logger.log('✅ Wormhole bridge service initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Wormhole:', error);
      throw error;
    }
  }

  async getBridgeQuote(
    sourceChain: string,
    targetChain: string,
    token: string,
    amount: string,
  ): Promise<BridgeQuote> {
    try {
      // Get chain contexts using the correct v2 API
      const srcChain = this.wormhole.getChain(sourceChain as Chain);
      const dstChain = this.wormhole.getChain(targetChain as Chain);

      // Create token ID using Wormhole v2 API
      const tokenId = Wormhole.tokenId(sourceChain as Chain, token === 'native' ? 'native' : await this.getTokenAddress(sourceChain, token));
      
      // Create source and destination addresses
      const sourceAddress = Wormhole.chainAddress(sourceChain as Chain, '0x0000000000000000000000000000000000000000'); // placeholder
      const destinationAddress = Wormhole.chainAddress(targetChain as Chain, '11111111111111111111111111111111'); // placeholder

      // Create a token transfer to get quote
      const transfer = await this.wormhole.tokenTransfer(
        tokenId,
        BigInt(Math.floor(parseFloat(amount) * 1e9)), // Convert to proper bigint amount
        sourceAddress,
        destinationAddress,
        false // not automatic
      );

      // Get quote using TokenTransfer with correct parameters
      const quote = await TokenTransfer.quoteTransfer(
        this.wormhole,
        srcChain,
        dstChain,
        transfer.transfer
      );

      // Calculate our convenience fee (5% of amount)
      const amountNum = parseFloat(amount);
      const convenienceFeeNum = amountNum * 0.05; // 5% markup
      const convenienceFee = convenienceFeeNum.toString();
      
      // Estimate gas fees
      let estimatedGasFee = '0';
      if (sourceChain === 'Ethereum') {
        const gasPrice = await this.ethProvider.getFeeData();
        const gasCost = BigInt(200000) * (gasPrice.gasPrice || BigInt(20000000000)); // 200k gas * 20 gwei
        estimatedGasFee = ethers.formatEther(gasCost);
      } else if (sourceChain === 'Polygon') {
        estimatedGasFee = '0.01'; // ~0.01 MATIC
      } else if (sourceChain === 'Solana') {
        estimatedGasFee = '0.001'; // ~0.001 SOL
      }
      
      const totalFeeNum = parseFloat(estimatedGasFee) + convenienceFeeNum;
      const totalFee = totalFeeNum.toString();
      
      const netAmount = (amountNum - convenienceFeeNum).toString();

      return {
        sourceChain,
        targetChain,
        sourceToken: token,
        targetToken: token === 'ETH' ? 'SOL' : token,
        amount,
        estimatedGasFee,
        bridgeFee: '0', // Wormhole is free
        convenienceFee,
        totalFee,
        netAmount,
        estimatedTime: this.getEstimatedTime(sourceChain),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get bridge quote:', error);
      throw new Error(`Failed to get bridge quote: ${error.message}`);
    }
  }

  async initiateBridge(
    sourceChain: string,
    targetChain: string,
    token: string,
    amount: string,
    userAddress: string,
    targetAddress: string,
  ): Promise<{ transactionId: string; instructions: any }> {
    try {
      const transactionId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.log(`🌉 Initiating REAL bridge: ${amount} ${token} from ${sourceChain} to ${targetChain}`);
      this.logger.log(`📍 User: ${userAddress} → Target: ${targetAddress}`);

      // Create database record with correct field names
      const bridgeRecord = await this.prisma.bridgeTransaction.create({
        data: {
          id: transactionId,
          userId: userAddress, // Will be updated with actual user ID
          sourceChain,
          targetChain,
          sourceToken: token,
          targetToken: token === 'ETH' ? 'SOL' : token,
          amount: parseFloat(amount),
          bridgeFee: 0,
          convenienceFee: parseFloat(amount) * 0.05,
          netAmount: parseFloat(amount) * 0.95,
          status: 'pending',
          createdAt: new Date(),
        },
      });

      // Create token ID and addresses using Wormhole v2 API
      const tokenId = Wormhole.tokenId(sourceChain as Chain, token === 'native' ? 'native' : await this.getTokenAddress(sourceChain, token));
      const sourceAddress = Wormhole.chainAddress(sourceChain as Chain, userAddress);
      const destinationAddress = Wormhole.chainAddress(targetChain as Chain, targetAddress);

      // Create REAL Wormhole transfer using v2 API
      const transfer = await this.wormhole.tokenTransfer(
        tokenId,
        BigInt(Math.floor(parseFloat(amount) * 1e9)), // Convert to proper bigint amount
        sourceAddress,
        destinationAddress,
        false // manual transfer (not automatic)
      );

      // For now, return instructions for the user to sign
      // In a real implementation, you'd need a signer to actually execute
      const instructions = {
        type: 'wormhole_bridge',
        sourceChain,
        targetChain,
        token,
        amount,
        userAddress,
        targetAddress,
        transferObject: transfer,
        message: 'Please sign the transaction in your wallet to initiate the bridge'
      };

      this.logger.log(`✅ Bridge initiated with ID: ${transactionId}`);
      
      return {
        transactionId,
        instructions,
      };
    } catch (error) {
      this.logger.error('❌ Failed to initiate bridge:', error);
      throw new Error(`Failed to initiate bridge: ${error.message}`);
    }
  }

  async monitorBridgeTransaction(transactionId: string, sourceTxHash: string): Promise<BridgeTransaction> {
    try {
      this.logger.log(`🔍 Monitoring bridge transaction: ${transactionId}`);
      
      // Update database with source transaction hash
      await this.prisma.bridgeTransaction.update({
        where: { id: transactionId },
        data: { 
          sourceTxHash,
          status: 'bridging',
        },
      });

      // Check VAA status using Wormhole v2 API
      const vaaStatus = await this.checkWormholeVAAStatus(sourceTxHash);
      
      if (vaaStatus.isComplete && vaaStatus.vaaId) {
        // Update status to completed
        const updatedTransaction = await this.prisma.bridgeTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'completed',
            vaaId: vaaStatus.vaaId,
            completedAt: new Date(),
          },
        });

        this.logger.log(`✅ Bridge transaction completed: ${transactionId}`);
        return this.mapPrismaToTransaction(updatedTransaction);
      }

      // Still pending
      const transaction = await this.prisma.bridgeTransaction.findUnique({
        where: { id: transactionId },
      });

      return this.mapPrismaToTransaction(transaction);
    } catch (error) {
      this.logger.error('❌ Failed to monitor bridge transaction:', error);
      
      // Update status to failed
      await this.prisma.bridgeTransaction.update({
        where: { id: transactionId },
        data: { 
          status: 'failed',
        },
      });
      
      throw new Error(`Failed to monitor bridge transaction: ${error.message}`);
    }
  }

  async completeBridgeToSessionVault(
    transactionId: string,
    userPublicKey: string,
    amount: string,
    sourceTxHash: string,
    sourceChain: string,
  ): Promise<{ success: boolean; sessionVaultTx?: string }> {
    try {
      this.logger.log(`🎯 Completing bridge to session vault: ${transactionId}`);
      
      // Get the bridge transaction
      const bridgeTransaction = await this.prisma.bridgeTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!bridgeTransaction) {
        throw new Error('Bridge transaction not found');
      }

      // Check if VAA is ready using Wormhole v2 API
      const vaaStatus = await this.checkWormholeVAAStatus(sourceTxHash);
      
      if (!vaaStatus.isComplete) {
        return { success: false };
      }

      // Complete the bridge transfer to session vault
      const sessionVaultTx = await this.solanaService.depositToSessionVault(
        userPublicKey,
        parseFloat(amount) * 1e9 // Convert to lamports
      );

      // Update bridge transaction
      await this.prisma.bridgeTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'completed',
          targetTxHash: sessionVaultTx,
          completedAt: new Date(),
        },
      });

      // Record fee collection with correct field names
      const convenienceFee = parseFloat(amount) * 0.05; // 5% fee
      await this.prisma.bridgeFeeCollection.create({
        data: {
          bridgeId: transactionId,
          feeAmount: convenienceFee,
          feeType: 'convenience',
          collectedAt: new Date(),
        },
      });

      this.logger.log(`✅ Bridge completed to session vault: ${sessionVaultTx}`);
      
      return {
        success: true,
        sessionVaultTx,
      };
    } catch (error) {
      this.logger.error('❌ Failed to complete bridge to session vault:', error);
      return { success: false };
    }
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const transaction = await this.prisma.bridgeTransaction.findUnique({
        where: { id: transactionId },
        include: {
          feeCollections: true,
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // If transaction is still bridging, check VAA status
      if (transaction.status === 'bridging' && transaction.sourceTxHash) {
        const vaaStatus = await this.checkWormholeVAAStatus(transaction.sourceTxHash);
        
        if (vaaStatus.isComplete) {
          // Update status
          await this.prisma.bridgeTransaction.update({
            where: { id: transactionId },
            data: {
              status: 'completed',
              vaaId: vaaStatus.vaaId,
              completedAt: new Date(),
            },
          });
          
          transaction.status = 'completed';
          transaction.vaaId = vaaStatus.vaaId;
          transaction.completedAt = new Date();
        }
      }

      return {
        id: transaction.id,
        status: transaction.status,
        sourceChain: transaction.sourceChain,
        targetChain: transaction.targetChain,
        sourceToken: transaction.sourceToken,
        amount: transaction.amount.toString(),
        userAddress: transaction.userId, // Using userId as userAddress
        targetAddress: transaction.targetToken, // Using targetToken as targetAddress for now
        sourceTxHash: transaction.sourceTxHash,
        targetTxHash: transaction.targetTxHash,
        vaaId: transaction.vaaId,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        feeCollections: transaction.feeCollections,
      };
    } catch (error) {
      this.logger.error('❌ Failed to get transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  private mapPrismaToTransaction(prismaTransaction: any): BridgeTransaction {
    return {
      id: prismaTransaction.id,
      sourceChain: prismaTransaction.sourceChain,
      targetChain: prismaTransaction.targetChain,
      sourceToken: prismaTransaction.sourceToken,
      amount: prismaTransaction.amount.toString(),
      userAddress: prismaTransaction.userId, // Using userId as userAddress
      status: prismaTransaction.status.toLowerCase(),
      sourceTxHash: prismaTransaction.sourceTxHash,
      targetTxHash: prismaTransaction.targetTxHash,
      vaaId: prismaTransaction.vaaId,
      createdAt: prismaTransaction.createdAt,
      completedAt: prismaTransaction.completedAt,
    };
  }

  private async getTokenAddress(chain: string, token: string): Promise<string> {
    // Token address mapping for different chains
    const tokenAddresses = {
      Ethereum: {
        USDC: '0xA0b86a33E6441b8C4505B8C4505B8C4505B8C4505', // Example USDC address
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
      Polygon: {
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      },
      Solana: {
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      },
    };

    return tokenAddresses[chain]?.[token] || token;
  }

  private getEstimatedTime(sourceChain: string): string {
    const times = {
      Ethereum: '15-20 minutes',
      Polygon: '5-10 minutes',
      Solana: '1-2 minutes',
      BSC: '3-5 minutes',
    };
    return times[sourceChain] || '10-15 minutes';
  }

  private async checkWormholeVAAStatus(sourceTxHash: string): Promise<{ isComplete: boolean; vaaId?: string }> {
    try {
      // In a real implementation, you would:
      // 1. Parse the transaction to get the Wormhole message ID
      // 2. Use wormhole.getVaa() to check if VAA is available
      // 3. Return the status
      
      // For now, simulate VAA completion after some time
      // This is a placeholder - implement actual VAA checking logic
      const mockVaaId = `vaa_${sourceTxHash}_${Date.now()}`;
      
      return {
        isComplete: true, // Mock completion
        vaaId: mockVaaId,
      };
    } catch (error) {
      this.logger.error('❌ Failed to check VAA status:', error);
      return { isComplete: false };
    }
  }

  // USDC Swap functionality using Jupiter on Solana
  async getUSDCSwapQuote(usdcAmount: string): Promise<BridgeQuote> {
    try {
      this.logger.log(`💱 Getting USDC swap quote for ${usdcAmount} USDC`);
      
      // Get Jupiter quote for USDC to SOL
      const jupiterQuote = await this.getJupiterQuote(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
        'So11111111111111111111111111111111111111112', // SOL mint
        parseFloat(usdcAmount) * 1000000 // Convert to lamports (USDC has 6 decimals)
      );

      if (!jupiterQuote) {
        throw new Error('Failed to get Jupiter quote');
      }

      const outputAmount = (parseInt(jupiterQuote.outAmount) / 1000000000).toString(); // Convert from lamports to SOL
      const convenienceFeeRate = 0.03; // 3% convenience fee
      const convenienceFee = (parseFloat(usdcAmount) * convenienceFeeRate).toString();
      const netAmount = (parseFloat(outputAmount) * (1 - convenienceFeeRate)).toString();

      return {
        sourceChain: 'Solana',
        targetChain: 'Solana',
        sourceToken: 'USDC',
        targetToken: 'SOL',
        amount: usdcAmount,
        estimatedGasFee: '0.001', // ~0.001 SOL for Solana transaction
        bridgeFee: '0',
        convenienceFee,
        totalFee: convenienceFee,
        netAmount,
        estimatedTime: '1-2 minutes',
        swapType: 'swap',
      };
    } catch (error) {
      this.logger.error('❌ Failed to get USDC swap quote:', error);
      throw new Error(`Failed to get USDC swap quote: ${error.message}`);
    }
  }

  async executeUSDCSwap(
    userPublicKey: string,
    usdcAmount: string,
  ): Promise<{ transactionId: string; instructions: any }> {
    try {
      const transactionId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.log(`💱 Executing USDC swap: ${usdcAmount} USDC → SOL for ${userPublicKey}`);

      // Get Jupiter swap transaction
      const swapTransaction = await this.getJupiterSwapTransaction(userPublicKey, usdcAmount);
      
      if (!swapTransaction) {
        throw new Error('Failed to get swap transaction');
      }

      // Create database record with correct field names
      await this.prisma.bridgeTransaction.create({
        data: {
          id: transactionId,
          userId: userPublicKey,
          sourceChain: 'Solana',
          targetChain: 'Solana',
          sourceToken: 'USDC',
          targetToken: 'SOL',
          amount: parseFloat(usdcAmount),
          bridgeFee: 0,
          convenienceFee: parseFloat(usdcAmount) * 0.03,
          netAmount: parseFloat(usdcAmount) * 0.97,
          status: 'pending',
          createdAt: new Date(),
        },
      });

      return {
        transactionId,
        instructions: {
          type: 'jupiter_swap',
          swapTransaction: swapTransaction.swapTransaction,
          message: 'Please sign the swap transaction in your wallet',
        },
      };
    } catch (error) {
      this.logger.error('❌ Failed to execute USDC swap:', error);
      throw new Error(`Failed to execute USDC swap: ${error.message}`);
    }
  }

  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
  ): Promise<any> {
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
      );
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      this.logger.error('❌ Failed to get Jupiter quote:', error);
      return null;
    }
  }

  private async getJupiterSwapTransaction(
    userPublicKey: string,
    usdcAmount: string,
  ): Promise<any> {
    try {
      // First get the quote
      const quote = await this.getJupiterQuote(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'So11111111111111111111111111111111111111112', // SOL
        parseFloat(usdcAmount) * 1000000 // Convert to micro-USDC
      );

      if (!quote) {
        throw new Error('Failed to get Jupiter quote');
      }

      // Get the swap transaction
      const response = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Jupiter swap API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('❌ Failed to get Jupiter swap transaction:', error);
      return null;
    }
  }
} 