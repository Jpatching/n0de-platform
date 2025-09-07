import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosResponse } from "axios";
import { ApiKeysService } from "../api-keys/api-keys.service";
import { UsageService } from "../usage/usage.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { RedisService } from "../common/redis.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class RpcService {
  private readonly logger = new Logger(RpcService.name);
  private readonly solanaRpcUrl: string;
  private readonly timeout: number;
  private readonly maxRetries = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeysService: ApiKeysService,
    private readonly usageService: UsageService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.solanaRpcUrl =
      this.configService.get("SOLANA_RPC_ENDPOINT") ||
      "https://api.mainnet-beta.solana.com";
    this.timeout = parseInt(this.configService.get("RPC_TIMEOUT")) || 30000;

    this.logger.log(
      `RPC Service initialized for MAINNET: ${this.solanaRpcUrl}`,
    );
  }

  async proxyRpcCall(
    apiKey: string,
    rpcPayload: any,
    userIp: string,
  ): Promise<any> {
    // Validate API key
    const keyData = await this.apiKeysService.validateApiKey(apiKey);
    if (!keyData) {
      throw new HttpException("Invalid API key", HttpStatus.UNAUTHORIZED);
    }

    const userId = keyData.userId;

    // Check subscription limits and quota
    const quotaCheck = await this.checkUsageQuota(userId);
    if (!quotaCheck.allowed) {
      throw new HttpException(quotaCheck.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Check rate limits
    const rateLimitCheck = await this.checkRateLimit(userId, apiKey);
    if (!rateLimitCheck.allowed) {
      throw new HttpException(
        "Rate limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const startTime = Date.now();

        // Make RPC call to Solana mainnet
        const response: AxiosResponse = await axios.post(
          this.solanaRpcUrl,
          rpcPayload,
          {
            timeout: this.timeout,
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "n0de-rpc-proxy/1.0",
            },
          },
        );

        const responseTime = Date.now() - startTime;

        // Calculate compute units (rough estimate based on method)
        const computeUnits = this.estimateComputeUnits(rpcPayload.method);

        // Record usage and update quota counters
        await Promise.all([
          this.usageService.recordRequest({
            userId,
            apiKeyId: keyData.id,
            method: rpcPayload.method || "unknown",
            responseTime,
            success: true,
            userIp,
            network: "mainnet-beta",
            computeUnits,
          }),
          this.incrementUsageCounters(userId, 1, computeUnits),
        ]);

        this.logger.log(
          `RPC call successful: ${rpcPayload.method} (${responseTime}ms, ${computeUnits} CU)`,
        );
        return response.data;
      } catch (error) {
        attempt++;
        const responseTime = Date.now() - Date.now();

        // Log failed request (still counts toward usage)
        const computeUnits = this.estimateComputeUnits(rpcPayload.method);
        await Promise.all([
          this.usageService.recordRequest({
            userId,
            apiKeyId: keyData.id,
            method: rpcPayload.method || "unknown",
            responseTime,
            success: false,
            userIp,
            network: "mainnet-beta",
            error: error.message,
            computeUnits,
          }),
          this.incrementUsageCounters(userId, 1, computeUnits),
        ]);

        if (attempt >= this.maxRetries) {
          this.logger.error(
            `RPC call failed after ${this.maxRetries} attempts: ${error.message}`,
          );

          if (error.response) {
            throw new HttpException(
              error.response.data || "RPC call failed",
              error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          throw new HttpException(
            "RPC service unavailable",
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
  }

  private async checkUsageQuota(
    userId: string,
  ): Promise<{ allowed: boolean; reason?: string; quota?: any }> {
    try {
      const subscription =
        await this.subscriptionsService.getUserSubscription(userId);
      const plan = subscription.plan;

      // Check if plan has unlimited requests
      if (plan.limits.requests === -1) {
        return { allowed: true };
      }

      // Get current period usage
      const usageKey = `usage:${userId}:${this.getCurrentPeriodKey()}`;
      const currentUsage = await this.redisService.get(usageKey);
      const usedRequests = currentUsage ? parseInt(currentUsage) : 0;

      if (usedRequests >= plan.limits.requests) {
        // Check if user has pay-as-you-go enabled
        const overageAllowed = await this.checkOverageAllowed(userId);
        if (!overageAllowed) {
          return {
            allowed: false,
            reason: `Monthly quota of ${plan.limits.requests.toLocaleString()} requests exceeded. Upgrade your plan or enable pay-as-you-go billing.`,
          };
        }
      }

      return {
        allowed: true,
        quota: {
          used: usedRequests,
          limit: plan.limits.requests,
          percentage: Math.round((usedRequests / plan.limits.requests) * 100),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check usage quota: ${error.message}`);
      return { allowed: true }; // Allow request on error to prevent service disruption
    }
  }

  private async checkRateLimit(
    userId: string,
    apiKey: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const subscription =
        await this.subscriptionsService.getUserSubscription(userId);
      const rateLimit = subscription.plan.limits.rateLimit;

      const rateLimitKey = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`; // Per minute
      const currentRequests = await this.redisService.get(rateLimitKey);
      const requestCount = currentRequests ? parseInt(currentRequests) : 0;

      if (requestCount >= rateLimit) {
        return {
          allowed: false,
          reason: `Rate limit of ${rateLimit} requests per minute exceeded.`,
        };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(`Failed to check rate limit: ${error.message}`);
      return { allowed: true }; // Allow request on error
    }
  }

  private async incrementUsageCounters(
    userId: string,
    requests: number,
    computeUnits: number,
  ): Promise<void> {
    try {
      const currentPeriodKey = this.getCurrentPeriodKey();
      const usageKey = `usage:${userId}:${currentPeriodKey}`;
      const computeKey = `compute:${userId}:${currentPeriodKey}`;
      const rateLimitKey = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;

      const [newUsageCount] = await Promise.all([
        // Increment monthly usage counter
        this.redisService.increment(usageKey, requests, 30 * 24 * 60 * 60), // 30 day expiry
        // Increment monthly compute units
        this.redisService.increment(
          computeKey,
          computeUnits,
          30 * 24 * 60 * 60,
        ),
        // Increment rate limit counter (per minute)
        this.redisService.increment(rateLimitKey, requests, 60), // 1 minute expiry
      ]);

      // Check usage thresholds and send notifications if needed
      try {
        const subscription =
          await this.subscriptionsService.getUserSubscription(userId);
        const limit = subscription.plan.limits.requests;

        if (limit !== -1) {
          // Don't check for unlimited plans
          await this.notificationsService.checkUsageThresholds(
            userId,
            newUsageCount,
            limit,
          );

          // Send overage notification if exceeded
          if (newUsageCount > limit) {
            const overage = newUsageCount - limit;
            const cost = (overage * 0.01).toFixed(2);
            await this.notificationsService.sendOverageNotification(
              userId,
              overage,
              cost,
            );
          }
        }
      } catch (notificationError) {
        this.logger.warn(
          `Failed to check usage thresholds for user ${userId}: ${notificationError.message}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to increment usage counters: ${error.message}`);
    }
  }

  private getCurrentPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  private estimateComputeUnits(method: string): number {
    // Estimate compute units based on RPC method
    const computeMap: Record<string, number> = {
      // Light operations
      getHealth: 1,
      getSlot: 1,
      getBlockHeight: 1,
      getVersion: 1,
      getGenesisHash: 1,

      // Medium operations
      getAccountInfo: 5,
      getBalance: 3,
      getTokenAccountBalance: 3,
      getTransaction: 10,
      getSignatureStatus: 2,

      // Heavy operations
      getBlock: 50,
      getProgramAccounts: 100,
      sendTransaction: 20,
      simulateTransaction: 15,

      // Default fallback
      default: 10,
    };

    return computeMap[method] || computeMap["default"];
  }

  private async checkOverageAllowed(userId: string): Promise<boolean> {
    // Check if user has enabled pay-as-you-go billing
    // This would be stored in user preferences or subscription settings
    try {
      const overageKey = `overage:${userId}`;
      const overageEnabled = await this.redisService.get(overageKey);
      return overageEnabled === "true";
    } catch (error) {
      return false;
    }
  }

  async getNodeHealth(): Promise<any> {
    try {
      const healthPayload = {
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
      };

      const response = await axios.post(this.solanaRpcUrl, healthPayload, {
        timeout: 5000,
      });

      return {
        status: "healthy",
        network: "mainnet-beta",
        endpoint: this.solanaRpcUrl,
        responseTime: response.headers["x-response-time"] || "unknown",
        result: response.data.result,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        network: "mainnet-beta",
        endpoint: this.solanaRpcUrl,
        error: error.message,
      };
    }
  }

  async getNetworkStats(): Promise<any> {
    try {
      const requests = [
        { jsonrpc: "2.0", id: 1, method: "getSlot" },
        { jsonrpc: "2.0", id: 2, method: "getBlockHeight" },
        { jsonrpc: "2.0", id: 3, method: "getVersion" },
      ];

      const responses = await Promise.all(
        requests.map((req) =>
          axios.post(this.solanaRpcUrl, req, { timeout: 10000 }),
        ),
      );

      return {
        network: "mainnet-beta",
        slot: responses[0].data.result,
        blockHeight: responses[1].data.result,
        version: responses[2].data.result,
        endpoint: this.solanaRpcUrl,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        "Failed to get network stats",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
