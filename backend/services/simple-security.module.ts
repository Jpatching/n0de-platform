import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "../common/redis.module";
import { SimpleSecurityService } from "./simple-security.service";

/**
 * Simple Security Module
 *
 * Provides basic security enhancements that work with your existing
 * infrastructure without requiring new dependencies or database changes.
 */
@Module({
  imports: [ConfigModule, RedisModule],
  providers: [SimpleSecurityService],
  exports: [SimpleSecurityService],
})
export class SimpleSecurityModule {}
