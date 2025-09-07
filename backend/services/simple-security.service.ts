import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../common/redis.service";
import * as crypto from "crypto";

/**
 * Simple Security Service
 *
 * This service provides BASIC security enhancements that work with your
 * existing infrastructure without requiring new database models or services.
 *
 * SAFE MODE: All features are disabled by default and log only
 */
@Injectable()
export class SimpleSecurityService {
  private readonly logger = new Logger(SimpleSecurityService.name);
  private readonly enableSecurity: boolean;
  private readonly confidenceThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.enableSecurity =
      this.configService.get("ENABLE_ABUSE_DETECTION") === "true";
    this.confidenceThreshold =
      parseFloat(this.configService.get("ABUSE_CONFIDENCE_THRESHOLD")) || 0.95;

    this.logger.log(
      `Simple Security Service initialized - Enabled: ${this.enableSecurity}`,
    );
  }

  /**
   * Check if request should be allowed
   */
  async checkRequest(params: {
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    endpoint: string;
  }): Promise<{ allowed: boolean; reason?: string; confidence?: number }> {
    if (!this.enableSecurity) {
      return { allowed: true };
    }

    try {
      const checks = await Promise.all([
        this.checkIpReputation(params.ipAddress),
        this.checkRequestPatterns(params.ipAddress, params.endpoint),
        this.checkUserAgent(params.userAgent),
      ]);

      // Calculate simple risk score
      const riskScore =
        checks.reduce((sum, check) => sum + (check.risk || 0), 0) /
        checks.length;

      // Log suspicious activity
      if (riskScore > 0.3) {
        this.logger.log(
          `Suspicious activity detected: IP=${params.ipAddress}, Risk=${riskScore.toFixed(2)}`,
        );

        // Store suspicious activity
        await this.logSuspiciousActivity(params.ipAddress, riskScore, checks);
      }

      // Only block very obvious abuse
      const shouldBlock = riskScore > this.confidenceThreshold;

      if (shouldBlock) {
        this.logger.warn(
          `HIGH RISK REQUEST BLOCKED: IP=${params.ipAddress}, Risk=${riskScore.toFixed(2)}`,
        );
      }

      return {
        allowed: !shouldBlock,
        reason: shouldBlock ? "High risk activity detected" : undefined,
        confidence: riskScore,
      };
    } catch (error) {
      this.logger.error(`Security check failed: ${error.message}`);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Track request for pattern analysis
   */
  async trackRequest(params: {
    ipAddress: string;
    endpoint: string;
    success: boolean;
    responseTime: number;
  }): Promise<void> {
    if (!this.enableSecurity) return;

    try {
      const timestamp = Date.now();

      // Track request frequency per IP
      const frequencyKey = `security:freq:${params.ipAddress}`;
      await this.redisService.incr(frequencyKey);
      await this.redisService.expire(frequencyKey, 60); // 1 minute window

      // Track endpoint usage per IP
      const endpointKey = `security:endpoints:${params.ipAddress}`;
      const endpointCount =
        (await this.redisService.get(`${endpointKey}:${params.endpoint}`)) || 0;
      await this.redisService.set(
        `${endpointKey}:${params.endpoint}`,
        (parseInt(endpointCount.toString()) + 1).toString(),
      );
      await this.redisService.expire(`${endpointKey}:${params.endpoint}`, 3600); // 1 hour

      // Track failed requests
      if (!params.success) {
        const errorKey = `security:errors:${params.ipAddress}`;
        await this.redisService.incr(errorKey);
        await this.redisService.expire(errorKey, 3600); // 1 hour
      }
    } catch (error) {
      this.logger.debug(`Request tracking failed: ${error.message}`);
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<any> {
    if (!this.enableSecurity) {
      return {
        enabled: false,
        message: "Security monitoring is disabled",
      };
    }

    try {
      // Get basic statistics from Redis
      const suspiciousIps = await this.redisService.keys(
        "security:suspicious:*",
      );
      const blockedRequests =
        (await this.redisService.get("security:blocked:count")) || "0";

      return {
        enabled: true,
        suspiciousIps: suspiciousIps.length,
        blockedRequests: parseInt(blockedRequests.toString()),
        confidenceThreshold: this.confidenceThreshold,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        enabled: true,
        error: error.message,
      };
    }
  }

  // Private helper methods

  private async checkIpReputation(
    ipAddress: string,
  ): Promise<{ risk: number; reason?: string }> {
    try {
      // Check if IP was previously flagged
      const flaggedKey = `security:flagged:${ipAddress}`;
      const flagged = await this.redisService.get(flaggedKey);

      if (flagged) {
        return { risk: 0.5, reason: "Previously flagged IP" };
      }

      // Check request frequency
      const frequencyKey = `security:freq:${ipAddress}`;
      const frequency = (await this.redisService.get(frequencyKey)) || 0;

      if (parseInt(frequency.toString()) > 60) {
        // More than 60 requests per minute
        return { risk: 0.7, reason: "High frequency requests" };
      }

      return { risk: 0 };
    } catch (error) {
      return { risk: 0 };
    }
  }

  private async checkRequestPatterns(
    ipAddress: string,
    endpoint: string,
  ): Promise<{ risk: number; reason?: string }> {
    try {
      // Check endpoint diversity (scanning behavior)
      const endpointKeys = await this.redisService.keys(
        `security:endpoints:${ipAddress}:*`,
      );

      if (endpointKeys.length > 10) {
        // Accessing many different endpoints
        return { risk: 0.6, reason: "Endpoint scanning detected" };
      }

      // Check error rate
      const errorKey = `security:errors:${ipAddress}`;
      const errors = (await this.redisService.get(errorKey)) || 0;

      if (parseInt(errors.toString()) > 20) {
        // High error rate
        return { risk: 0.4, reason: "High error rate" };
      }

      return { risk: 0 };
    } catch (error) {
      return { risk: 0 };
    }
  }

  private checkUserAgent(userAgent?: string): {
    risk: number;
    reason?: string;
  } {
    if (!userAgent) {
      return { risk: 0.2, reason: "Missing user agent" };
    }

    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /scrapy/i,
      /bot/i,
      /crawler/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        return {
          risk: 0.8,
          reason: `Suspicious user agent: ${pattern.source}`,
        };
      }
    }

    return { risk: 0 };
  }

  private async logSuspiciousActivity(
    ipAddress: string,
    riskScore: number,
    details: any[],
  ): Promise<void> {
    try {
      const logKey = `security:suspicious:${ipAddress}:${Date.now()}`;
      const logData = {
        ipAddress,
        riskScore,
        details,
        timestamp: new Date().toISOString(),
      };

      await this.redisService.set(logKey, JSON.stringify(logData));
      await this.redisService.expire(logKey, 86400); // 24 hours

      // Flag IP for future checks
      if (riskScore > 0.7) {
        const flagKey = `security:flagged:${ipAddress}`;
        await this.redisService.set(flagKey, "true");
        await this.redisService.expire(flagKey, 3600); // 1 hour flag
      }
    } catch (error) {
      this.logger.debug(`Failed to log suspicious activity: ${error.message}`);
    }
  }
}
