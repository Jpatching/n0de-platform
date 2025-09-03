import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Get,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { RpcService } from './rpc.service';

@ApiTags('RPC')
@Controller('rpc')
export class RpcController {
  constructor(private readonly rpcService: RpcService) {}

  @Post('mainnet')
  @ApiOperation({ summary: 'Proxy RPC calls to Solana Mainnet' })
  @ApiHeader({ name: 'x-api-key', description: 'API key for authentication' })
  @ApiResponse({ status: 200, description: 'RPC call successful' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 503, description: 'RPC service unavailable' })
  async proxyMainnetRpc(
    @Body() rpcPayload: any,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request,
  ) {
    if (!apiKey) {
      throw new HttpException(
        'API key required in x-api-key header',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!rpcPayload || !rpcPayload.method) {
      throw new HttpException(
        'Invalid RPC payload - method required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userIp = request.ip || request.connection.remoteAddress || 'unknown';

    return this.rpcService.proxyRpcCall(apiKey, rpcPayload, userIp);
  }

  @Post('/')
  @ApiOperation({ summary: 'Default RPC endpoint (Mainnet)' })
  @ApiHeader({ name: 'x-api-key', description: 'API key for authentication' })
  async proxyDefaultRpc(
    @Body() rpcPayload: any,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request,
  ) {
    // Default to mainnet
    return this.proxyMainnetRpc(rpcPayload, apiKey, request);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check RPC node health' })
  @ApiResponse({ status: 200, description: 'Node health status' })
  async getHealth() {
    return this.rpcService.getNodeHealth();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get network statistics' })
  @ApiResponse({ status: 200, description: 'Network statistics' })
  async getStats() {
    return this.rpcService.getNetworkStats();
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'Get available RPC endpoints' })
  @ApiResponse({ status: 200, description: 'Available endpoints' })
  async getEndpoints() {
    return {
      mainnet: {
        url: '/rpc/mainnet',
        network: 'mainnet-beta',
        description: 'Solana Mainnet RPC endpoint',
        rateLimits: {
          free: '100 requests/minute',
          pro: '10,000 requests/minute',
          enterprise: 'Unlimited',
        },
      },
      default: {
        url: '/rpc',
        network: 'mainnet-beta',
        description: 'Default RPC endpoint (Mainnet)',
      },
    };
  }
}