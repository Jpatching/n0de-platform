import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { RpcService } from "./rpc.service";
import { SimpleSecurityService } from "../services/simple-security.service";

/**
 * Secure RPC Service
 *
 * This service WRAPS your existing RPC service with optional security
 * enhancements. Your original service remains completely unchanged.
 *
 * SAFE MODE: Security is disabled by default
 */
@Injectable()
export class SecureRpcService {
  private readonly logger = new Logger(SecureRpcService.name);

  constructor(
    private readonly originalRpcService: RpcService,
    private readonly securityService: SimpleSecurityService,
  ) {
    this.logger.log("Secure RPC Service wrapper initialized");
  }

  /**
   * Enhanced RPC call with optional security checking
   * Falls back to your original service if security fails
   */
  async proxyRpcCall(
    apiKey: string,
    rpcPayload: any,
    userIp: string,
    userAgent?: string,
  ): Promise<any> {
    const startTime = Date.now();

    // OPTIONAL SECURITY CHECK (disabled by default)
    try {
      const securityCheck = await this.securityService.checkRequest({
        ipAddress: userIp,
        userAgent,
        endpoint: rpcPayload?.method || "unknown",
      });

      // Log security check result
      if (securityCheck.confidence && securityCheck.confidence > 0.3) {
        this.logger.log(
          `Security check: IP=${userIp}, Confidence=${securityCheck.confidence.toFixed(2)}`,
        );
      }

      // Only block if security explicitly says to block
      if (!securityCheck.allowed) {
        this.logger.warn(
          `Request blocked by security: ${securityCheck.reason}`,
        );
        throw new HttpException(
          securityCheck.reason || "Request blocked by security policy",
          HttpStatus.FORBIDDEN,
        );
      }
    } catch (securityError) {
      // If security check fails, log but continue with original service
      this.logger.debug(
        `Security check failed, continuing: ${securityError.message}`,
      );
    }

    // CALL YOUR ORIGINAL RPC SERVICE (unchanged)
    try {
      const result = await this.originalRpcService.proxyRpcCall(
        apiKey,
        rpcPayload,
        userIp,
      );

      const responseTime = Date.now() - startTime;

      // Track successful request for analysis
      this.trackRequestAsync(userIp, rpcPayload?.method, true, responseTime);

      return result;
    } catch (originalError) {
      const responseTime = Date.now() - startTime;

      // Track failed request for analysis
      this.trackRequestAsync(userIp, rpcPayload?.method, false, responseTime);

      // Re-throw the original error
      throw originalError;
    }
  }

  /**
   * Get health status with security info
   */
  async getNodeHealth(): Promise<any> {
    // Get original health status
    const originalHealth = await this.originalRpcService.getNodeHealth();

    // Add security status
    const securityStats = await this.securityService.getSecurityStats();

    return {
      ...originalHealth,
      security: {
        ...securityStats,
        message: "Enhanced security monitoring (safe mode)",
      },
    };
  }

  /**
   * Get network stats (unchanged)
   */
  async getNetworkStats(): Promise<any> {
    return this.originalRpcService.getNetworkStats();
  }

  // Async tracking to not slow down responses
  private trackRequestAsync(
    ipAddress: string,
    endpoint: string,
    success: boolean,
    responseTime: number,
  ): void {
    // Don't await this - track in background
    this.securityService
      .trackRequest({
        ipAddress,
        endpoint: endpoint || "unknown",
        success,
        responseTime,
      })
      .catch((error) => {
        this.logger.debug(`Request tracking failed: ${error.message}`);
      });
  }
}
