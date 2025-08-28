import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradeSubscriptionDto } from './dto/subscription.dto';
import { SubscriptionType } from '@prisma/client';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentSubscription(@Request() req) {
    return this.subscriptionsService.getUserSubscription(req.user.userId);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage stats retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsageStats(@Request() req) {
    return this.subscriptionsService.getUsageStats(req.user.userId);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan upgraded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid plan or payment' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upgradePlan(
    @Request() req,
    @Body() body: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionsService.upgradePlan(
      req.user.userId,
      body.planType,
      body.paymentInfo,
    );
  }

  @Post('upgrade/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get checkout URL for plan upgrade' })
  @ApiResponse({ 
    status: 200, 
    description: 'Checkout URL created successfully',
    schema: {
      type: 'object',
      properties: {
        checkoutUrl: { type: 'string' },
        planName: { type: 'string' },
        planPrice: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async getUpgradeCheckoutUrl(
    @Request() req,
    @Body() body: UpgradeSubscriptionDto,
  ) {
    const plan = await this.subscriptionsService.getPlanByType(body.planType as any);
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    // Return checkout URL - in production this would create actual payment session
    return {
      checkoutUrl: `/checkout?plan=${plan.id}`,
      planName: plan.name,
      planPrice: plan.price,
      message: `Redirecting to checkout for ${plan.name} plan upgrade`,
    };
  }

  @Put('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel free plan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async cancelSubscription(@Request() req) {
    return this.subscriptionsService.cancelSubscription(req.user.userId);
  }

  @Get('check-limits/api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can create more API keys' })
  @ApiResponse({ status: 200, description: 'Limit check successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkApiKeyLimit(@Request() req) {
    const canCreate = await this.subscriptionsService.checkApiKeyLimit(req.user.userId);
    return { canCreate };
  }
}