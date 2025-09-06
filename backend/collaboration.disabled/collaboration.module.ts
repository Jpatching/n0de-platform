import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { TeamManagementService } from './team-management.service';
import { WorkspaceService } from './workspace.service';
import { SharedResourcesService } from './shared-resources.service';
import { RealTimeService } from './real-time.service';
import { AuthModule } from '../auth/auth.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { LoggerModule } from '../common/logger.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    AuthModule,
    ApiKeysModule,
    LoggerModule,
    WebsocketModule,
    SubscriptionsModule,
    JwtModule,
  ],
  controllers: [CollaborationController],
  providers: [
    CollaborationService,
    TeamManagementService,
    WorkspaceService,
    SharedResourcesService,
    RealTimeService,
  ],
  exports: [
    CollaborationService,
    TeamManagementService,
    WorkspaceService,
    SharedResourcesService,
    RealTimeService,
  ],
})
export class CollaborationModule {}