import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "./common/common.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { UsageModule } from "./usage/usage.module";
import { BillingModule } from "./billing/billing.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { AdminModule } from "./admin/admin.module";
import { UsersModule } from "./users/users.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PaymentsModule } from "./payments/payments.module";
import { SupportModule } from "./support/support.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { RpcModule } from "./rpc/rpc.module";
import { SecureRpcModule } from "./rpc/secure-rpc.module";
import { ErrorsModule } from "./errors/errors.module";
import { HealthModule } from "./health/health.module";
import { EmailModule } from "./email/email.module";
import { WebsocketModule } from "./websocket/websocket.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { EndpointsModule } from "./endpoints/endpoints.module";
import { AlertsModule } from "./alerts/alerts.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { AuditModule } from "./audit/audit.module";
import { SecurityModule } from "./security/security.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    CommonModule,
    RedisModule,
    AuthModule,
    SubscriptionsModule,
    UsageModule,
    BillingModule,
    ApiKeysModule,
    AdminModule,
    UsersModule,
    MetricsModule,
    PaymentsModule,
    SupportModule,
    NotificationsModule,
    RpcModule,
    SecureRpcModule,
    ErrorsModule,
    HealthModule,
    EmailModule,
    WebsocketModule,
    WebhooksModule,
    EndpointsModule,
    AlertsModule,
    IncidentsModule,
    IntegrationsModule,
    AuditModule,
    SecurityModule,
  ],
})
export class AppModule {}
