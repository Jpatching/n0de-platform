import { Module } from "@nestjs/common";
import { LoggerModule } from "./logger.module";
import { PrismaModule } from "./prisma.module";
import { RedisModule } from "./redis.module";

@Module({
  imports: [LoggerModule, PrismaModule, RedisModule],
  exports: [LoggerModule, PrismaModule, RedisModule],
})
export class CommonModule {}
