import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { RedisWebSocketService } from '../common/redis-websocket.service';
import { RedisCacheService } from '../common/redis-cache.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { LeaderboardService } from './leaderboard.service';
import { ReferralService } from './referral.service';
import { PrestigeService } from './prestige.service';
import { ForumService } from './forum.service';
import { AchievementService } from './achievement.service';
import { FriendsService } from './friends.service';
import { SocialSeederService } from './social-seeder.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [SocialController],
  providers: [
    SocialService,
    LeaderboardService,
    PrestigeService,
    ForumService,
    AchievementService,
    FriendsService,
    ReferralService,
    SocialSeederService,
    RedisCacheService,
    RedisWebSocketService,
  ],
  exports: [
    SocialService,
    LeaderboardService,
    PrestigeService,
    ForumService,
    AchievementService,
    FriendsService,
    ReferralService,
    SocialSeederService,
    RedisWebSocketService,
  ],
})
export class SocialModule {} 