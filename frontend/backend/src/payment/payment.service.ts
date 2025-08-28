import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCoinbasePaymentDto, CoinbaseWebhookDto, PaymentFeeStructure, CoinbasePaymentResponse, PaymentRecord } from './dto/payment.dto';
import { SolanaService } from '../solana/solana.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY;
  private readonly COINBASE_WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  private readonly COINBASE_API_URL = 'https://api.commerce.coinbase.com';
  
  // Fee configuration
  private readonly PV3_SERVICE_FEE_PERCENT = 3.0; // 3% service fee
  private readonly COINBASE_FEE_PERCENT = 1.0; // ~1% + $0.30
  private readonly COINBASE_FIXED_FEE = 0.30; // $0.30 fixed fee
  
  // In-memory payment tracking (replace with database in production)
  private payments = new Map<string, PaymentRecord>();

  constructor(private readonly solanaService: SolanaService) {
    if (!this.COINBASE_API_KEY) {
      this.logger.warn('⚠️ COINBASE_COMMERCE_API_KEY not set - Coinbase Pay will not work');
    }
  }

  /**
   * Calculate fees for a given USD amount
   */
  calculateFees(usdAmount: number): PaymentFeeStructure {
    const coinbaseProcessingFee = (usdAmount * this.COINBASE_FEE_PERCENT / 100) + this.COINBASE_FIXED_FEE;
    const pv3ServiceFee = usdAmount * this.PV3_SERVICE_FEE_PERCENT / 100;
    const solanaNetworkFee = 0.001; // ~$0.0001 in SOL terms
    
    const totalFeeUSD = coinbaseProcessingFee + pv3ServiceFee;
    const totalFeePercentage = (totalFeeUSD / usdAmount) * 100;

    return {
      coinbaseProcessingFee,
      pv3ServiceFee,
      solanaNetworkFee,
      totalFeePercentage
    };
  }

  /**
   * Create Coinbase Commerce charge for SOL deposit
   */
  async createCoinbasePayment(dto: CreateCoinbasePaymentDto): Promise<CoinbasePaymentResponse> {
    if (!this.COINBASE_API_KEY) {
      throw new BadRequestException('Coinbase Commerce not configured');
    }

    try {
      const fees = this.calculateFees(dto.usdAmount);
      const netAmount = dto.usdAmount - fees.coinbaseProcessingFee - fees.pv3ServiceFee;
      
      this.logger.log(`💳 Creating Coinbase payment: $${dto.usdAmount} → $${netAmount.toFixed(2)} net for SOL`);

      // Create Coinbase Commerce charge
      const chargeData = {
        name: 'PV3 SOL Deposit',
        description: dto.description || `Deposit $${dto.usdAmount} for SOL gaming balance`,
        pricing_type: 'fixed_price',
        local_price: {
          amount: dto.usdAmount.toFixed(2),
          currency: 'USD'
        },
        // Request settlement in SOL
        settlement_currency: 'SOL',
        metadata: {
          userWallet: dto.userWallet,
          netAmount: netAmount.toFixed(2),
          pv3ServiceFee: fees.pv3ServiceFee.toFixed(2),
          ...JSON.parse(dto.metadata || '{}')
        },
        redirect_url: `${process.env.FRONTEND_URL}/vault?payment=success`,
        cancel_url: `${process.env.FRONTEND_URL}/vault?payment=cancelled`
      };

      const response = await fetch(`${this.COINBASE_API_URL}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CC-Api-Key': this.COINBASE_API_KEY,
          'X-CC-Version': '2018-03-22'
        },
        body: JSON.stringify(chargeData)
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`❌ Coinbase API error:`, error);
        throw new BadRequestException(`Coinbase API error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const charge = result.data;

      // Store payment record
      const paymentRecord: PaymentRecord = {
        id: crypto.randomUUID(),
        userWallet: dto.userWallet,
        chargeId: charge.id,
        usdAmount: dto.usdAmount,
        solAmount: 0, // Will be updated when payment confirms
        fees,
        status: 'pending',
        coinbaseData: charge,
        createdAt: new Date()
      };

      this.payments.set(charge.id, paymentRecord);

      this.logger.log(`✅ Created Coinbase charge: ${charge.id}`);

      return {
        id: charge.id,
        hostedUrl: charge.hosted_url,
        code: charge.code,
        expiresAt: charge.expires_at,
        pricing: charge.pricing
      };

    } catch (error) {
      this.logger.error(`❌ Failed to create Coinbase payment: ${error.message}`);
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Handle Coinbase webhook events
   */
  async handleCoinbaseWebhook(signature: string, body: any): Promise<void> {
    if (!this.COINBASE_WEBHOOK_SECRET) {
      throw new BadRequestException('Webhook secret not configured');
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.COINBASE_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.error('❌ Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    const charge = event.data;

    this.logger.log(`🔔 Coinbase webhook: ${event.type} for charge ${charge.id}`);

    switch (event.type) {
      case 'charge:confirmed':
        await this.handlePaymentConfirmed(charge);
        break;
      case 'charge:failed':
        await this.handlePaymentFailed(charge);
        break;
      case 'charge:delayed':
        await this.handlePaymentDelayed(charge);
        break;
      default:
        this.logger.log(`ℹ️ Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Handle confirmed payment - deposit SOL to user vault and send fee to treasury
   */
  private async handlePaymentConfirmed(charge: any): Promise<void> {
    const payment = this.payments.get(charge.id);
    if (!payment) {
      this.logger.error(`❌ Payment record not found for charge: ${charge.id}`);
      return;
    }

    try {
      // Get SOL amount from Coinbase settlement
      const solPayment = charge.payments.find((p: any) => p.network === 'solana');
      if (!solPayment) {
        this.logger.error(`❌ No SOL payment found in charge: ${charge.id}`);
        return;
      }

      const totalSolAmount = parseFloat(solPayment.value.amount);
      
      // CORRECTED: Calculate platform fee as percentage of actual SOL received from Coinbase
      // This ensures we don't try to take more SOL than we actually have
      const platformFeePercent = 3.0; // 3% of the SOL we received
      const platformFeeSol = totalSolAmount * (platformFeePercent / 100);
      const userSolAmount = totalSolAmount - platformFeeSol;

      this.logger.log(`💰 Confirmed payment: ${totalSolAmount} SOL total from Coinbase`);
      this.logger.log(`💰 Platform fee (3% of SOL): ${platformFeeSol.toFixed(6)} SOL → Treasury`);
      this.logger.log(`💰 User receives: ${userSolAmount.toFixed(6)} SOL → Vault`);
      this.logger.log(`📊 Effective fee rate: ${platformFeePercent}% of settled SOL`);

      // Send platform fee to treasury wallet
      if (platformFeeSol > 0.001) { // Only if fee is meaningful (> 0.001 SOL)
        await this.solanaService.sendSOLToTreasury(
          payment.userWallet,
          platformFeeSol * 1_000_000_000 // Convert to lamports
        );
        this.logger.log(`✅ Sent ${platformFeeSol.toFixed(6)} SOL platform fee to treasury`);
      }

      // Deposit remaining SOL to user's session vault
      await this.solanaService.depositToSessionVault(
        payment.userWallet,
        userSolAmount * 1_000_000_000 // Convert to lamports
      );

      // Update payment record
      payment.status = 'confirmed';
      payment.solAmount = userSolAmount;
      payment.platformFeeSol = platformFeeSol;
      payment.confirmedAt = new Date();
      payment.coinbaseData = charge;

      this.payments.set(charge.id, payment);

      this.logger.log(`✅ Successfully deposited ${userSolAmount.toFixed(6)} SOL to vault for ${payment.userWallet}`);

    } catch (error) {
      this.logger.error(`❌ Failed to process confirmed payment: ${error.message}`);
      // Mark payment as failed
      payment.status = 'failed';
      this.payments.set(charge.id, payment);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(charge: any): Promise<void> {
    const payment = this.payments.get(charge.id);
    if (payment) {
      payment.status = 'failed';
      payment.coinbaseData = charge;
      this.payments.set(charge.id, payment);
      this.logger.log(`❌ Payment failed for charge: ${charge.id}`);
    }
  }

  /**
   * Handle delayed payment
   */
  private async handlePaymentDelayed(charge: any): Promise<void> {
    const payment = this.payments.get(charge.id);
    if (payment) {
      this.logger.log(`⏳ Payment delayed for charge: ${charge.id}`);
      // Keep status as pending, will be updated when confirmed
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(chargeId: string): Promise<PaymentRecord | null> {
    return this.payments.get(chargeId) || null;
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(userWallet: string): Promise<PaymentRecord[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userWallet === userWallet)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get current SOL price for fee estimation
   */
  async getSOLPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana.usd;
    } catch (error) {
      this.logger.error('Failed to fetch SOL price, using fallback');
      return 240; // Fallback price
    }
  }

  /**
   * Estimate SOL amount user will receive
   */
  async estimateSOLAmount(usdAmount: number): Promise<{ solAmount: number; fees: PaymentFeeStructure; solPrice: number }> {
    const fees = this.calculateFees(usdAmount);
    const netUSD = usdAmount - fees.coinbaseProcessingFee - fees.pv3ServiceFee;
    const solPrice = await this.getSOLPrice();
    const solAmount = netUSD / solPrice;

    return {
      solAmount: Math.floor(solAmount * 1000) / 1000, // Round to 3 decimals
      fees,
      solPrice
    };
  }
} 