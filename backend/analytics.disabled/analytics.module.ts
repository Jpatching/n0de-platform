import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsInsightsService } from './analytics-insights.service';
import { UserProfilingService } from './user-profiling.service';

@Module({
  imports: [CommonModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsInsightsService,
    UserProfilingService,
  ],
  exports: [
    AnalyticsService,
    AnalyticsInsightsService,
    UserProfilingService,
  ],
})
export class AnalyticsModule {}