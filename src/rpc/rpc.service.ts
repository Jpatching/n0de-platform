import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { UsageService } from '../usage/usage.service';

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
  ) {
    this.solanaRpcUrl = this.configService.get('SOLANA_RPC_ENDPOINT') || 'https://api.mainnet-beta.solana.com';
    this.timeout = parseInt(this.configService.get('RPC_TIMEOUT')) || 30000;
    
    this.logger.log(`RPC Service initialized for MAINNET: ${this.solanaRpcUrl}`);
  }

  async proxyRpcCall(
    apiKey: string,
    rpcPayload: any,
    userIp: string,
  ): Promise<any> {
    // Validate API key
    const keyData = await this.apiKeysService.validateApiKey(apiKey);
    if (!keyData) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }

    // Check rate limits
    const userId = keyData.userId;
    const canProceed = await this.checkRateLimit(userId, apiKey);
    if (!canProceed) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
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
              'Content-Type': 'application/json',
              'User-Agent': 'n0de-rpc-proxy/1.0',
            },
          }
        );

        const responseTime = Date.now() - startTime;

        // Log usage analytics
        await this.usageService.recordRequest({
          userId,
          apiKeyId: keyData.id,
          method: rpcPayload.method || 'unknown',
          responseTime,
          success: true,
          userIp,
          network: 'mainnet-beta',
        });

        this.logger.log(`RPC call successful: ${rpcPayload.method} (${responseTime}ms)`);
        return response.data;

      } catch (error) {
        attempt++;
        const responseTime = Date.now() - Date.now();

        // Log failed request
        await this.usageService.recordRequest({
          userId,
          apiKeyId: keyData.id,
          method: rpcPayload.method || 'unknown',
          responseTime,
          success: false,
          userIp,
          network: 'mainnet-beta',
          error: error.message,
        });

        if (attempt >= this.maxRetries) {
          this.logger.error(`RPC call failed after ${this.maxRetries} attempts: ${error.message}`);
          
          if (error.response) {
            throw new HttpException(
              error.response.data || 'RPC call failed',
              error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
          
          throw new HttpException(
            'RPC service unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private async checkRateLimit(userId: string, apiKey: string): Promise<boolean> {
    // Implement rate limiting logic based on user tier
    const maxRequestsPerMinute = parseInt(this.configService.get('RATE_LIMIT_MAINNET')) || 10000;
    
    // TODO: Implement Redis-based rate limiting
    // For now, return true (no rate limiting)
    return true;
  }

  async getNodeHealth(): Promise<any> {
    try {
      const healthPayload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      };

      const response = await axios.post(this.solanaRpcUrl, healthPayload, {
        timeout: 5000,
      });

      return {
        status: 'healthy',
        network: 'mainnet-beta',
        endpoint: this.solanaRpcUrl,
        responseTime: response.headers['x-response-time'] || 'unknown',
        result: response.data.result,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        network: 'mainnet-beta',
        endpoint: this.solanaRpcUrl,
        error: error.message,
      };
    }
  }

  async getNetworkStats(): Promise<any> {
    try {
      const requests = [
        { jsonrpc: '2.0', id: 1, method: 'getSlot' },
        { jsonrpc: '2.0', id: 2, method: 'getBlockHeight' },
        { jsonrpc: '2.0', id: 3, method: 'getVersion' },
      ];

      const responses = await Promise.all(
        requests.map(req => 
          axios.post(this.solanaRpcUrl, req, { timeout: 10000 })
        )
      );

      return {
        network: 'mainnet-beta',
        slot: responses[0].data.result,
        blockHeight: responses[1].data.result,
        version: responses[2].data.result,
        endpoint: this.solanaRpcUrl,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get network stats',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}