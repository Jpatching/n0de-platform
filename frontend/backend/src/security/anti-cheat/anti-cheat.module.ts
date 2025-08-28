import { Module } from '@nestjs/common';
import { AntiCheatService } from './anti-cheat.service';
import { MinesValidationService } from './mines-validation.service';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { SecurityRateLimitService } from './security-rate-limit.service';
import { AntiCheatAuditService } from './anti-cheat-audit.service';
import { RedisCacheService } from '../../common/redis-cache.service';

@Module({
  providers: [
    AntiCheatService,
    MinesValidationService,
    SuspiciousActivityService,
    SecurityRateLimitService,
    AntiCheatAuditService,
    RedisCacheService,
  ],
  exports: [
    AntiCheatService,
    MinesValidationService,
    SuspiciousActivityService,
    SecurityRateLimitService,
    AntiCheatAuditService,
  ],
})
export class AntiCheatModule {} 