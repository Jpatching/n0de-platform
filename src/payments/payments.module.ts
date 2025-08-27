import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CoinbaseCommerceService } from './coinbase-commerce.service';
import { NOWPaymentsService } from './nowpayments.service';
import { PrismaModule } from '../common/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule, PrismaModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CoinbaseCommerceService, NOWPaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}