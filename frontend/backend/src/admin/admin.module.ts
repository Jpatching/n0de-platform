import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SecurityModule } from '../security/security.module';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [DatabaseModule, AuthModule, UserModule, SecurityModule, SolanaModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {} 