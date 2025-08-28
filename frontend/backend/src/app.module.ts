import { Module } from '@nestjs/common';
import { MatchModule } from './match/match.module';
import { GameModule } from './game/game.module';
import { SolanaModule } from './solana/solana.module';
import { VerifierModule } from './verifier/verifier.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ReferralModule } from './referral/referral.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TournamentModule } from './tournament/tournament.module';
import { SecurityModule } from './security/security.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BridgeModule } from './bridge/bridge.module';
import { SessionVaultModule } from './session-vault/session-vault.module';
import { DeveloperModule } from './developer/developer.module';
import { PaymentModule } from './payment/payment.module';
import { UploadModule } from './upload/upload.module';
import { SocialModule } from './social/social.module';
import { StreamingModule } from './streaming/streaming.module';
import { ChatModule } from './chat/chat.module';
import { BotsModule } from './bots/bots.module';
import { PnLModule } from './pnl/pnl.module';
import { DemoModule } from './demo/demo.module';
import { RedisCacheService } from './common/redis-cache.service';

@Module({
  imports: [
    DatabaseModule,
    SolanaModule,
    AuthModule,
    UserModule,
    ReferralModule,
    LeaderboardModule,
    TournamentModule,
    SecurityModule,
    AdminModule,
    AnalyticsModule,
    MatchModule,
    GameModule,
    VerifierModule,
    BridgeModule,
    SessionVaultModule,
    DeveloperModule,
    PaymentModule,
    UploadModule,
    SocialModule,
    StreamingModule,
    ChatModule,
    BotsModule,
    PnLModule,
    DemoModule,
  ],
  controllers: [],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class AppModule {} 