import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { StreamingGateway } from './streaming.gateway';
import { CloudflareStreamService } from './cloudflare-stream.service';
import { RailwayNativeStreamingService } from './railway-native.service';
import { DatabaseModule } from '../database/database.module';
import { SolanaModule } from '../solana/solana.module';
import { SessionVaultModule } from '../session-vault/session-vault.module';
import { SocialModule } from '../social/social.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    SolanaModule,
    SessionVaultModule,
    SocialModule,
    AuthModule,
  ],
  controllers: [StreamingController],
  providers: [
    StreamingService, 
    StreamingGateway, 
    CloudflareStreamService,
    RailwayNativeStreamingService, // Railway's built-in streaming
  ],
  exports: [
    StreamingService, 
    CloudflareStreamService,
    RailwayNativeStreamingService,
  ],
})
export class StreamingModule {} 