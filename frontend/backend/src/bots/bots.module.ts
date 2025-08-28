import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { BotManagerService } from './services/bot-manager.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    DatabaseModule,
  ],
  controllers: [BotsController],
  providers: [
    BotsService,
    BotManagerService,
  ],
  exports: [BotsService, BotManagerService],
})
export class BotsModule {} 