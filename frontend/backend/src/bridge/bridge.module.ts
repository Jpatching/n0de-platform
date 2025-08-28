import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BridgeService } from './bridge.service';
import { BridgeController } from './bridge.controller';
import { BridgeWebSocketGateway } from './bridge-websocket.gateway';
import { BridgeMonitoringService } from './bridge-monitoring.service';
import { PrismaService } from '../database/prisma.service';
import { SolanaService } from '../solana/solana.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BridgeController],
  providers: [
    BridgeService,
    BridgeWebSocketGateway,
    BridgeMonitoringService,
    PrismaService,
    SolanaService,
  ],
  exports: [
    BridgeService,
    BridgeWebSocketGateway,
    BridgeMonitoringService,
  ],
})
export class BridgeModule {} 