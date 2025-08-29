import { Module } from '@nestjs/common';
import { PerformanceMonitorService } from './performance-monitor.service';
import { ScalingOptimizationService } from './scaling-optimization.service';
import { AlertingService } from './alerting.service';
import { PerformanceTestingService } from './performance-testing.service';
import { MonitoringController } from './monitoring.controller';
import { CommonModule } from '../common/common.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [CommonModule, WebsocketModule],
  providers: [
    PerformanceMonitorService,
    ScalingOptimizationService,
    AlertingService,
    PerformanceTestingService,
  ],
  controllers: [MonitoringController],
  exports: [
    PerformanceMonitorService,
    ScalingOptimizationService,
    AlertingService,
    PerformanceTestingService,
  ],
})
export class MonitoringModule {}