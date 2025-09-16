import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Get,
  Req,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { Request } from "express";
import { SecureRpcService } from "./secure-rpc.service";
import { ConfigService } from "@nestjs/config";

/**
 * Secure RPC Controller
 *
 * This controller provides the same endpoints as your original RPC controller
 * but with optional security enhancements that can be enabled via environment
 * variables.
 *
 * SAFE MODE: Uses your original logic with optional security wrapper
 */
@ApiTags("RPC")
@Controller("secure-rpc")
export class SecureRpcController {
  private readonly logger = new Logger(SecureRpcController.name);
  private readonly enableSecureEndpoints: boolean;

  constructor(
    private readonly secureRpcService: SecureRpcService,
    private readonly configService: ConfigService,
  ) {
    this.enableSecureEndpoints =
      this.configService.get("ENABLE_SECURE_ENDPOINTS") === "true";
    this.logger.log(
      `Secure RPC endpoints ${this.enableSecureEndpoints ? "ENABLED" : "DISABLED"}`,
    );
  }

  @Post("mainnet")
  @ApiOperation({
    summary: "Proxy RPC calls to Solana Mainnet with security monitoring",
  })
  @ApiHeader({ name: "x-api-key", description: "API key for authentication" })
  @ApiResponse({ status: 200, description: "RPC call successful" })
  @ApiResponse({ status: 401, description: "Invalid API key" })
  @ApiResponse({ status: 429, description: "Rate limit exceeded" })
  @ApiResponse({ status: 503, description: "RPC service unavailable" })
  async proxyMainnetRpc(
    @Body() rpcPayload: any,
    @Headers("x-api-key") apiKey: string,
    @Req() request: Request,
  ) {
    // Same basic validation as your original controller
    if (!apiKey) {
      throw new HttpException(
        "API key required in x-api-key header",
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!rpcPayload || !rpcPayload.method) {
      throw new HttpException(
        "Invalid RPC payload - method required",
        HttpStatus.BAD_REQUEST,
      );
    }

    const userIp = this.extractIpAddress(request);
    const userAgent = request.headers["user-agent"];

    // Call the secure wrapper (which calls your original service)
    return this.secureRpcService.proxyRpcCall(
      apiKey,
      rpcPayload,
      userIp,
      userAgent,
    );
  }

  @Post("/")
  @ApiOperation({
    summary: "Default RPC endpoint (Mainnet) with security monitoring",
  })
  @ApiHeader({ name: "x-api-key", description: "API key for authentication" })
  async proxyDefaultRpc(
    @Body() rpcPayload: any,
    @Headers("x-api-key") apiKey: string,
    @Req() request: Request,
  ) {
    // Default to mainnet (same as your original logic)
    return this.proxyMainnetRpc(rpcPayload, apiKey, request);
  }

  @Get("health")
  @ApiOperation({ summary: "Check RPC node health with security status" })
  @ApiResponse({
    status: 200,
    description: "Node health status with security monitoring info",
  })
  async getHealth() {
    return this.secureRpcService.getNodeHealth();
  }

  @Get("stats")
  @ApiOperation({ summary: "Get network statistics" })
  @ApiResponse({ status: 200, description: "Network statistics" })
  async getStats() {
    return this.secureRpcService.getNetworkStats();
  }

  @Get("security")
  @ApiOperation({ summary: "Get security monitoring statistics" })
  @ApiResponse({ status: 200, description: "Security monitoring data" })
  async getSecurityStats() {
    const health = await this.secureRpcService.getNodeHealth();
    return {
      security: health.security,
      endpoints: {
        secure: this.enableSecureEndpoints ? "enabled" : "disabled",
        monitoring: "active",
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get("endpoints")
  @ApiOperation({ summary: "Get available RPC endpoints with security info" })
  @ApiResponse({ status: 200, description: "Available endpoints" })
  async getEndpoints() {
    return {
      mainnet: {
        url: "/secure-rpc/mainnet",
        network: "mainnet-beta",
        description:
          "Solana Mainnet RPC endpoint with enhanced security monitoring",
        security: "Real-time abuse detection and monitoring (safe mode)",
        rateLimits: {
          free: "100 requests/minute + security monitoring",
          pro: "10,000 requests/minute + enhanced protection",
          enterprise: "Unlimited + advanced security features",
        },
      },
      default: {
        url: "/secure-rpc",
        network: "mainnet-beta",
        description: "Default RPC endpoint (Mainnet) with security monitoring",
      },
      original: {
        url: "/rpc",
        network: "mainnet-beta",
        description:
          "Original RPC endpoint (unchanged for backward compatibility)",
        note: "Your existing endpoint remains unchanged",
      },
    };
  }

  // Helper method
  private extractIpAddress(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      (request.headers["x-real-ip"] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      "0.0.0.0"
    );
  }
}
