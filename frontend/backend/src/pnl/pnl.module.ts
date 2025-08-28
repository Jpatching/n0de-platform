import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PnLController } from './pnl.controller';
import { PnLService } from './pnl.service';
import { PnLFavoritesController } from './pnl-favorites.controller';
import { PnLFavoritesService } from './pnl-favorites.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, ScheduleModule.forRoot()],
  controllers: [PnLController, PnLFavoritesController],
  providers: [PnLService, PnLFavoritesService],
  exports: [PnLService, PnLFavoritesService]
})
export class PnLModule {} 