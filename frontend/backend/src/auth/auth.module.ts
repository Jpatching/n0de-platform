import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { SolanaModule } from '../solana/solana.module';
import { DatabaseModule } from '../database/database.module';
import { SessionVaultModule } from '../session-vault/session-vault.module';
import { SocialModule } from '../social/social.module';
import { RedisWebSocketService } from '../common/redis-websocket.service';
import { RedisCacheService } from '../common/redis-cache.service';

@Module({
  imports: [SolanaModule, DatabaseModule, SessionVaultModule, forwardRef(() => SocialModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RedisWebSocketService, RedisCacheService],
  exports: [AuthService, AuthGuard, RedisWebSocketService, RedisCacheService],
})
export class AuthModule {} 