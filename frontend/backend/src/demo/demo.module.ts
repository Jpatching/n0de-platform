import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoGateway } from './demo.gateway';
import { MatchModule } from '../match/match.module';
import { DatabaseModule } from '../database/database.module';
import { ChessService } from '../games/chess.service';
import { CoinFlipService } from '../games/coinflip.service';

@Module({
  imports: [
    MatchModule,
    DatabaseModule,
  ],
  controllers: [DemoController],
  providers: [DemoService, DemoGateway, ChessService, CoinFlipService],
  exports: [DemoService],
})
export class DemoModule {}