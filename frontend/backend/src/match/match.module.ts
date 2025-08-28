import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchGateway } from './match.gateway';
import { SolanaModule } from '../solana/solana.module';
import { VerifierModule } from '../verifier/verifier.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SocialModule } from '../social/social.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { ChatModule } from '../chat/chat.module';
import { ChessService } from '../games/chess.service';
import { CoinFlipService } from '../games/coinflip.service';
import { CrashService } from '../games/crash.service';
import { RPSService } from '../games/rps.service';

import { MinesService } from '../games/mines.service';
import { MinesBatchingService } from '../games/mines-batching.service';
import { MinesTileProtectionService } from '../games/mines-tile-protection.service';
import { MinesSyncValidationService } from '../games/mines-sync-validation.service';
// 🚀 ROBUST IMPROVEMENT: RPS Services
import { RPSBatchingService } from '../games/rps-batching.service';
import { RPSChoiceProtectionService } from '../games/rps-choice-protection.service';
import { RPSSyncValidationService } from '../games/rps-sync-validation.service';
import { PrestigeService } from '../social/prestige.service';
import { ReferralService } from '../social/referral.service';
import { RedisCacheService } from '../common/redis-cache.service';
import { ConnectionRecoveryService } from '../common/connection-recovery.service';
import { AntiCheatModule } from '../security/anti-cheat/anti-cheat.module';
import { PnLModule } from '../pnl/pnl.module';

@Module({
  imports: [
    DatabaseModule,
    SolanaModule,
    VerifierModule,
    AuthModule,
    SocialModule,
    LeaderboardModule,
    ChatModule,
    AntiCheatModule,
    PnLModule,
  ],
  controllers: [MatchController],
  providers: [
    MatchService, 
    MatchGateway, 
    ChessService,
    CoinFlipService,
    CrashService,
    RPSService,
    MinesService,
    // 🚀 ROBUST IMPROVEMENT: RPS Services
    RPSBatchingService,
    RPSChoiceProtectionService,
    RPSSyncValidationService,
    // 🚀 ROBUST IMPROVEMENT: Mines Services
    MinesBatchingService,
    MinesTileProtectionService,
    MinesSyncValidationService,
    ConnectionRecoveryService,
    PrestigeService,
    ReferralService,
    RedisCacheService
  ],
  exports: [
    MatchService, 
    ChessService,
    CoinFlipService,
    CrashService,
    RPSService,
    MinesService,
  ],
})
export class MatchModule {} 