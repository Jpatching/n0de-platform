import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsageModule } from './usage/usage.module';
import { BillingModule } from './billing/billing.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { MetricsModule } from './metrics/metrics.module';
import { PaymentsModule } from './payments/payments.module';
import { SupportModule } from './support/support.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RpcModule } from './rpc/rpc.module';
import { SecureRpcModule } from './rpc/secure-rpc.module';
import { ErrorsModule } from './errors/errors.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './email/email.module';
import { WebsocketModule } from './websocket/websocket.module';
// import { AnalyticsModule } from './analytics/analytics.module';
// import { CollaborationModule } from './collaboration/collaboration.module';
// import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    CommonModule,
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
    RpcModule,        // Your original RPC module (unchanged)
    SecureRpcModule,  // Optional enhanced RPC with security (disabled by default)
    ErrorsModule,
    HealthModule,
    EmailModule,
    WebsocketModule,
    // AnalyticsModule,        // Disabled - causing build errors
    // CollaborationModule,    // Disabled - causing build errors  
    // ActivityModule,         // Disabled - causing build errors
  ],
})
export class AppModule {}
