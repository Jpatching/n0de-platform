import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto, WebhookPayloadDto } from './dto/payments.dto';
import { PaymentProvider } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
@UseGuards(ThrottlerGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ 
    status: 201, 
    description: 'Payment created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        provider: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        status: { type: 'string' },
        planType: { type: 'string' },
        chargeUrl: { type: 'string' },
        paymentUrl: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPayment(@Request() req, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(req.user.userId, createPaymentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payments' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ 
    status: 200, 
    description: 'User payments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        payments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              provider: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              status: { type: 'string' },
              planType: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              paidAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  })
  async getUserPayments(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.getUserPayments(req.user.userId, page, limit);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payment statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalPayments: { type: 'number' },
        completedPayments: { type: 'number' },
        successRate: { type: 'number' },
        totalRevenue: { type: 'number' },
        recentPayments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getUserPaymentStats(@Request() req) {
    return this.paymentsService.getPaymentStats(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        provider: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        status: { type: 'string' },
        planType: { type: 'string' },
        chargeUrl: { type: 'string', nullable: true },
        paymentUrl: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        paidAt: { type: 'string', format: 'date-time', nullable: true },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
          },
        },
        paymentHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              statusReason: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Request() req, @Param('id') paymentId: string) {
    return this.paymentsService.getPayment(paymentId, req.user.userId);
  }

  // Webhook endpoints
  @Post('webhooks/coinbase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Coinbase Commerce webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async coinbaseWebhook(
    @Body() payload: any,
    @Headers('X-CC-Webhook-Signature') signature: string,
  ) {
    return this.paymentsService.processWebhook(PaymentProvider.COINBASE_COMMERCE, payload, signature);
  }

  @Post('webhooks/nowpayments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'NOWPayments IPN webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async nowpaymentsWebhook(
    @Body() payload: any,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    return this.paymentsService.processWebhook(PaymentProvider.NOWPAYMENTS, payload, signature);
  }
}