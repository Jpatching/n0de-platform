import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { RedisWebSocketService } from '../common/redis-websocket.service';
import { RedisCacheService } from '../common/redis-cache.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RedisWebSocketService, RedisCacheService],
  exports: [AnalyticsService, RedisWebSocketService, RedisCacheService],
})
export class AnalyticsModule {} 