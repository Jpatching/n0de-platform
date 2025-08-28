import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaModule } from '../common/prisma.module';
import { RedisModule } from '../common/redis.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, RedisModule, PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}