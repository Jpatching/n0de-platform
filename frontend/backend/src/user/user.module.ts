import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { BatchQueryService } from '../common/batch-query.service';
import { RedisWebSocketService } from '../common/redis-websocket.service';
import { RedisCacheService } from '../common/redis-cache.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, BatchQueryService, RedisWebSocketService, RedisCacheService],
  exports: [UserService, BatchQueryService, RedisWebSocketService, RedisCacheService],
})
export class UserModule {} 