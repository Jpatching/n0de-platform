import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, RequestRecord>();
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests, please try again later'
  };

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const config = this.reflector.get<RateLimitConfig>('rateLimit', context.getHandler()) || this.defaultConfig;
    
    const key = this.getClientKey(request);
    const now = Date.now();
    
    // Clean up expired records
    this.cleanupExpiredRecords(now);
    
    const record = this.requests.get(key);
    
    if (!record) {
      // First request from this client
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }
    
    if (now > record.resetTime) {
      // Window has expired, reset counter
      record.count = 1;
      record.resetTime = now + config.windowMs;
      return true;
    }
    
    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: config.message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    
    // Increment counter
    record.count++;
    return true;
  }
  
  private getClientKey(request: any): string {
    // Use IP + User-Agent for better identification
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const wallet = request.headers['x-wallet-address'] || request.body?.wallet || '';
    
    return `${ip}:${userAgent.slice(0, 50)}:${wallet}`;
  }
  
  private cleanupExpiredRecords(now: number): void {
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Decorator for custom rate limiting
export const RateLimit = (config: RateLimitConfig) => {
  return Reflector.createDecorator<RateLimitConfig>({ key: 'rateLimit' })(config);
}; 