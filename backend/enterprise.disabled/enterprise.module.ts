import { Module } from "@nestjs/common";
import { EnterpriseController } from "./enterprise.controller";
import { EnterpriseService } from "./enterprise.service";
import { SecurityComplianceService } from "./security-compliance.service";
import { InfrastructureMonitoringService } from "./infrastructure-monitoring.service";
import { EnterpriseAnalyticsService } from "./enterprise-analytics.service";
import { AuditLoggingService } from "./audit-logging.service";
import { HighAvailabilityService } from "./high-availability.service";
import { AuthModule } from "../auth/auth.module";
import { LoggerModule } from "../common/logger.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { WebsocketModule } from "../websocket/websocket.module";

@Module({
  imports: [AuthModule, LoggerModule, AnalyticsModule, WebsocketModule],
  controllers: [EnterpriseController],
  providers: [
    EnterpriseService,
    SecurityComplianceService,
    InfrastructureMonitoringService,
    EnterpriseAnalyticsService,
    AuditLoggingService,
    HighAvailabilityService,
  ],
  exports: [
    EnterpriseService,
    SecurityComplianceService,
    InfrastructureMonitoringService,
    EnterpriseAnalyticsService,
    AuditLoggingService,
    HighAvailabilityService,
  ],
})
export class EnterpriseModule {}
