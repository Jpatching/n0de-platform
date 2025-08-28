# PV3 IP Blocking & Bad Actor Prevention
**Integration with Existing DDOS Protection**

## 1. IP Blocking Layers

### 1.1 Cloudflare Layer
```typescript
// Cloudflare Firewall Rules
const cloudflareRules = {
    // Automatic blocking
    autoBlock: {
        threshold: {
            requests: 1000,    // requests per minute
            errorRate: 0.3,    // 30% error rate
            failedAuths: 10    // failed auth attempts
        },
        duration: 24 * 60 * 60 // 24 hours
    },
    
    // Manual blocking
    manualBlock: {
        type: "IP_LIST",
        action: "BLOCK",
        notes: "Manually identified bad actors"
    }
};
```

### 1.2 Application Layer
```typescript
// PV3 IP Management Service
class IPManagementService {
    private readonly REDIS_KEY = 'pv3:blocked_ips';
    
    async blockIP(ip: string, reason: string, duration: number): Promise<void> {
        // 1. Add to Redis blocklist
        await this.redis.sadd(this.REDIS_KEY, ip);
        
        // 2. Log the block
        await this.logIPBlock({
            ip,
            reason,
            timestamp: Date.now(),
            duration
        });
        
        // 3. Propagate to Cloudflare
        await this.updateCloudflareRules(ip);
    }

    async isBlocked(ip: string): Promise<boolean> {
        return await this.redis.sismember(this.REDIS_KEY, ip);
    }
}
```

## 2. Bad Actor Detection

### 2.1 Behavioral Patterns
```typescript
const badActorPatterns = {
    gameplay: {
        rapidMatchCreation: {
            threshold: 10,     // matches per minute
            action: "TEMP_BLOCK"
        },
        abnormalWinRate: {
            threshold: 0.90,   // 90% win rate
            minMatches: 20,    // minimum matches to consider
            action: "REVIEW"
        },
        multiAccountPattern: {
            sameIP: true,
            rapidSwitching: true,
            action: "BLOCK"
        }
    },
    
    authentication: {
        failedAttempts: {
            threshold: 5,      // per 5 minutes
            action: "TEMP_BLOCK"
        },
        invalidSignatures: {
            threshold: 3,      // per hour
            action: "BLOCK"
        }
    },
    
    transactions: {
        failedDeposits: {
            threshold: 5,      // per hour
            action: "REVIEW"
        },
        suspiciousWithdrawals: {
            threshold: "100 SOL", // per day
            action: "REVIEW"
        }
    }
};
```

### 2.2 Implementation
```typescript
class BadActorDetection {
    async analyzeUserBehavior(userId: string, ip: string): Promise<void> {
        // 1. Gather metrics
        const metrics = await this.gatherUserMetrics(userId, ip);
        
        // 2. Check against patterns
        const violations = this.checkViolations(metrics);
        
        // 3. Take action if needed
        if (violations.length > 0) {
            await this.handleViolations(violations, userId, ip);
        }
    }

    private async handleViolations(violations: Violation[], userId: string, ip: string): Promise<void> {
        for (const violation of violations) {
            switch (violation.action) {
                case "BLOCK":
                    await this.ipManagement.blockIP(ip, violation.reason, violation.duration);
                    await this.notifyAdmins(violation);
                    break;
                case "TEMP_BLOCK":
                    await this.ipManagement.blockIP(ip, violation.reason, 3600); // 1 hour
                    break;
                case "REVIEW":
                    await this.flagForReview(userId, ip, violation);
                    break;
            }
        }
    }
}
```

## 3. Integration with PV3 Architecture

### 3.1 NestJS Middleware
```typescript
// IP Blocking Middleware
@Injectable()
export class IPBlockMiddleware implements NestMiddleware {
    constructor(
        private readonly ipManagement: IPManagementService,
        private readonly badActorDetection: BadActorDetection
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const ip = req.ip;
        
        // 1. Check if IP is blocked
        if (await this.ipManagement.isBlocked(ip)) {
            throw new ForbiddenException('IP blocked');
        }
        
        // 2. Analyze behavior in background
        this.badActorDetection.analyzeUserBehavior(req.user?.id, ip)
            .catch(err => console.error('Error in behavior analysis:', err));
        
        next();
    }
}
```

### 3.2 WebSocket Protection
```typescript
// WebSocket Gateway with IP Protection
@WebSocketGateway()
export class MatchGateway {
    @SubscribeMessage('joinMatch')
    async handleJoinMatch(client: Socket, payload: any) {
        const ip = client.handshake.address;
        
        // 1. Check IP block
        if (await this.ipManagement.isBlocked(ip)) {
            client.disconnect();
            return;
        }
        
        // 2. Rate limiting per IP
        if (!await this.rateLimiter.checkLimit(ip, 'match_join')) {
            client.disconnect();
            return;
        }
        
        // Continue with match join...
    }
}
```

## 4. Admin Controls

### 4.1 Manual IP Management
```typescript
class AdminIPController {
    async blockIP(dto: BlockIPDto): Promise<void> {
        // Validate admin permissions
        if (!this.hasPermission(dto.adminId, 'BLOCK_IP')) {
            throw new UnauthorizedException();
        }
        
        // Block IP
        await this.ipManagement.blockIP(
            dto.ip,
            dto.reason,
            dto.duration || 24 * 60 * 60 // default 24h
        );
        
        // Log admin action
        await this.auditLog.log({
            action: 'BLOCK_IP',
            admin: dto.adminId,
            details: dto
        });
    }

    async unblockIP(dto: UnblockIPDto): Promise<void> {
        // Similar implementation...
    }
}
```

### 4.2 Monitoring Dashboard
```typescript
interface IPMonitoring {
    blockedIPs: {
        total: number;
        last24h: number;
        byReason: Record<string, number>;
    };
    
    suspiciousActivity: {
        ipAddresses: string[];
        reasons: string[];
        timestamp: number;
    }[];
    
    automaticBlocks: {
        timestamp: number;
        ip: string;
        reason: string;
        duration: number;
    }[];
}
```

## 5. Implementation Steps

### Immediate (24h)
1. Set up Redis for IP blocklist
2. Implement basic IP blocking middleware
3. Configure Cloudflare rules
4. Add admin blocking interface

### Week 1
1. Implement behavioral pattern detection
2. Set up monitoring dashboard
3. Configure WebSocket protection
4. Add audit logging

### Pre-Launch
1. Test with simulated attacks
2. Fine-tune thresholds
3. Set up admin alerts
4. Document response procedures

## 6. Monitoring & Maintenance

### Regular Tasks
- Review blocked IPs daily
- Analyze pattern effectiveness weekly
- Update thresholds based on data
- Clean up expired blocks

### Alerts
- Sudden spike in blocks
- Multiple accounts from same IP
- High-value account blocks
- Pattern detection triggers

---

**Note:** This system integrates with our existing DDOS protection by:
1. Using Cloudflare as the first line of defense
2. Adding application-level intelligence
3. Maintaining IP blocklists across all layers
4. Providing admin controls for manual intervention 