import { Module } from "@nestjs/common";
import { RpcController } from "./rpc.controller";
import { RpcService } from "./rpc.service";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { UsageModule } from "../usage/usage.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { RedisModule } from "../common/redis.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    ApiKeysModule,
    UsageModule,
    SubscriptionsModule,
    RedisModule,
    NotificationsModule,
  ],
  controllers: [RpcController],
  providers: [RpcService],
  exports: [RpcService],
})
export class RpcModule {}
