import { Module } from '@nestjs/common';
import { VerifierService } from './verifier.service';
import { DatabaseModule } from '../database/database.module';
 
@Module({
  imports: [DatabaseModule],
  providers: [VerifierService],
  exports: [VerifierService],
})
export class VerifierModule {} 