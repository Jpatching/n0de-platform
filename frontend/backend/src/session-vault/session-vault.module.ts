import { Module } from '@nestjs/common';
import { SessionVaultService } from './session-vault.service';
import { SolanaModule } from '../solana/solana.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [SolanaModule, DatabaseModule],
  providers: [SessionVaultService],
  exports: [SessionVaultService],
})
export class SessionVaultModule {} 