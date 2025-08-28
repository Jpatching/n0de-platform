import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SolanaModule } from '../solana/solana.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SolanaModule, AuthModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {} 