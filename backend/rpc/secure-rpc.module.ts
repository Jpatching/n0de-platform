import { Module } from "@nestjs/common";
import { RpcController } from "./rpc.controller";
import { RpcService } from "./rpc.service";
import { SecureRpcService } from "./secure-rpc.service";
import { SimpleSecurityModule } from "../services/simple-security.module";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { UsageModule } from "../usage/usage.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { RedisModule } from "../common/redis.module";
import { NotificationsModule } from "../notifications/notifications.module";

/**
 * Secure RPC Module
 *
 * This module provides your original RPC functionality with OPTIONAL
 * security enhancements. Your existing service remains unchanged.
 *
 * You can switch between:
 * - RpcService (original, no changes)
 * - SecureRpcService (original + optional security)
 */
@Module({
  imports: [
    // Your existing imports (unchanged)
    ApiKeysModule,
    UsageModule,
    SubscriptionsModule,
    RedisModule,
    NotificationsModule,

    // New optional security module
    SimpleSecurityModule,
  ],
  controllers: [RpcController], // Same controller
  providers: [
    RpcService, // Your original service (unchanged)
    SecureRpcService, // Optional secure wrapper
  ],
  exports: [
    RpcService, // Export original for backward compatibility
    SecureRpcService, // Export secure version for enhanced features
  ],
})
export class SecureRpcModule {}
