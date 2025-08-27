import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Common modules
import { PrismaModule } from './common/prisma.module';
import { LoggerModule } from './common/logger.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { UsageModule } from './usage/usage.module';
import { SupportModule } from './support/support.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { RpcModule } from './rpc/rpc.module';
import { MetricsModule } from './metrics/metrics.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ([{
        ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60,
        limit: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
      }]),
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static/',
    }),

    // Common modules
    PrismaModule,
    LoggerModule,

    // Feature modules
    AuthModule,
    ApiKeysModule,
    UsageModule,
    SupportModule,
    SubscriptionsModule,
    PaymentsModule,
    AdminModule,
    RpcModule,
    MetricsModule,
    WebsocketModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}