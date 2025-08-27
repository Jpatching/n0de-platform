import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentProvider, SubscriptionType } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    enum: PaymentProvider,
    description: 'Payment provider to use',
    example: PaymentProvider.COINBASE_COMMERCE,
  })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({
    enum: SubscriptionType,
    description: 'Subscription plan type',
    example: SubscriptionType.STARTER,
  })
  @IsEnum(SubscriptionType)
  planType: SubscriptionType;

  @ApiProperty({
    description: 'Payment amount',
    example: 49.99,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class PaymentCallbackDto {
  @ApiProperty({
    description: 'Payment ID from our system',
  })
  @IsString()
  paymentId: string;

  @ApiProperty({
    description: 'Provider payment ID',
  })
  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @ApiProperty({
    description: 'Payment status from provider',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Additional provider data',
  })
  @IsOptional()
  metadata?: any;
}

export class WebhookPayloadDto {
  @ApiProperty({
    description: 'Webhook payload from payment provider',
  })
  payload: any;

  @ApiProperty({
    description: 'Webhook signature for verification',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}