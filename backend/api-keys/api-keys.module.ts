import { Module } from "@nestjs/common";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { IntelligentApiKeysService } from "./intelligent-api-keys.service";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { LoggerModule } from "../common/logger.module";
// import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    AuthModule,
    SubscriptionsModule,
    LoggerModule /*, AnalyticsModule*/,
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, IntelligentApiKeysService],
  exports: [ApiKeysService, IntelligentApiKeysService],
})
export class ApiKeysModule {}
