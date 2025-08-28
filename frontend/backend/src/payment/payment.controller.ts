import { Controller, Post, Get, Body, Headers, Param, Query, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateCoinbasePaymentDto, CoinbaseWebhookDto } from './dto/payment.dto';
import { AuthService } from '../auth/auth.service';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create Coinbase Commerce payment for SOL deposit
   * POST /payments/coinbase/create
   */
  @Post('coinbase/create')
  async createCoinbasePayment(
    @Headers('authorization') auth: string,
    @Body() createPaymentDto: CreateCoinbasePaymentDto
  ) {
    const session = await this.validateSession(auth);
    
    // Ensure user can only create payments for their own wallet
    if (createPaymentDto.userWallet !== session.wallet) {
      throw new UnauthorizedException('Can only create payments for your own wallet');
    }

    try {
      const payment = await this.paymentService.createCoinbasePayment(createPaymentDto);
      
      this.logger.log(`💳 Created payment for ${session.wallet}: $${createPaymentDto.usdAmount}`);
      
      return {
        success: true,
        payment,
        message: `Payment created for $${createPaymentDto.usdAmount}`
      };
    } catch (error) {
      this.logger.error(`❌ Payment creation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Estimate SOL amount for USD input
   * GET /payments/estimate?usd=100
   */
  @Get('estimate')
  async estimateSOLAmount(@Query('usd') usdAmount: string) {
    const amount = parseFloat(usdAmount);
    
    if (isNaN(amount) || amount < 1 || amount > 10000) {
      throw new BadRequestException('USD amount must be between $1 and $10,000');
    }

    try {
      const estimate = await this.paymentService.estimateSOLAmount(amount);
      
      return {
        success: true,
        usdAmount: amount,
        ...estimate,
        breakdown: {
          grossAmount: amount,
          coinbaseFee: estimate.fees.coinbaseProcessingFee,
          pv3ServiceFee: estimate.fees.pv3ServiceFee,
          netAmount: amount - estimate.fees.coinbaseProcessingFee - estimate.fees.pv3ServiceFee,
          solReceived: estimate.solAmount
        }
      };
    } catch (error) {
      throw new BadRequestException(`Failed to estimate: ${error.message}`);
    }
  }

  /**
   * Coinbase Commerce webhook handler
   * POST /payments/coinbase/webhook
   */
  @Post('coinbase/webhook')
  async handleCoinbaseWebhook(
    @Headers('x-cc-webhook-signature') signature: string,
    @Body() body: any
  ) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    try {
      await this.paymentService.handleCoinbaseWebhook(signature, body);
      
      return {
        success: true,
        message: 'Webhook processed successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Webhook processing failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get payment status
   * GET /payments/status/:chargeId
   */
  @Get('status/:chargeId')
  async getPaymentStatus(
    @Headers('authorization') auth: string,
    @Param('chargeId') chargeId: string
  ) {
    const session = await this.validateSession(auth);
    
    const payment = await this.paymentService.getPaymentStatus(chargeId);
    
    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // Ensure user can only view their own payments
    if (payment.userWallet !== session.wallet) {
      throw new UnauthorizedException('Can only view your own payments');
    }

    return {
      success: true,
      payment: {
        id: payment.id,
        chargeId: payment.chargeId,
        usdAmount: payment.usdAmount,
        solAmount: payment.solAmount,
        status: payment.status,
        fees: payment.fees,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt
      }
    };
  }

  /**
   * Get user's payment history
   * GET /payments/history
   */
  @Get('history')
  async getPaymentHistory(
    @Headers('authorization') auth: string,
    @Query('limit') limit?: string
  ) {
    const session = await this.validateSession(auth);
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    if (limitNum > 200) {
      throw new BadRequestException('Limit cannot exceed 200');
    }

    const payments = await this.paymentService.getUserPayments(session.wallet);
    
    return {
      success: true,
      payments: payments.slice(0, limitNum).map(payment => ({
        id: payment.id,
        chargeId: payment.chargeId,
        usdAmount: payment.usdAmount,
        solAmount: payment.solAmount,
        status: payment.status,
        fees: payment.fees,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt
      })),
      count: payments.length
    };
  }

  /**
   * Get fee structure information
   * GET /payments/fees
   */
  @Get('fees')
  async getFeeStructure() {
    return {
      success: true,
      fees: {
        pv3ServiceFeePercent: 3.0,
        coinbaseFeePercent: 1.0,
        coinbaseFixedFee: 0.30,
        minimumDeposit: 1,
        maximumDeposit: 10000
      },
      description: {
        pv3ServiceFee: 'PV3 service fee for processing and SOL conversion',
        coinbaseFee: 'Coinbase Commerce processing fee',
        totalFee: 'Approximately 4% + $0.30 total fees'
      }
    };
  }

  private async validateSession(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    const sessionId = authHeader.substring(7);
    const session = await this.authService.validateSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    return session;
  }
} 