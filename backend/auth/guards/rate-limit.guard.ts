import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { RedisService } from "../../common/redis.service";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIP(request);
    const key = `rate_limit:auth:${ip}`;

    try {
      // Get current request count
      const current = await this.redis.get(key);
      const requests = current ? parseInt(current) : 0;

      // Rate limit: 10 auth requests per minute per IP
      const limit = 10;
      const windowSeconds = 60;

      if (requests >= limit) {
        throw new HttpException(
          {
            message: "Rate limit exceeded. Too many authentication attempts.",
            retryAfter: windowSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Increment counter
      const pipeline = this.redis.getClient().pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      await pipeline.exec();

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // On Redis error, allow request but log warning
      console.warn("Rate limiting failed, allowing request:", error);
      return true;
    }
  }

  private getClientIP(request: any): string {
    return (
      request.headers["cf-connecting-ip"] || // Cloudflare
      request.headers["x-real-ip"] || // nginx
      request.headers["x-forwarded-for"]?.split(",")[0] || // Load balancer
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      "unknown"
    );
  }
}
