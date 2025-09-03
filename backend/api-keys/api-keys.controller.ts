import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-keys.dto';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createApiKey(@Request() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.createApiKey(req.user.userId, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for the current user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserApiKeys(@Request() req) {
    return this.apiKeysService.getUserApiKeys(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific API key by ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getApiKeyById(@Request() req, @Param('id') keyId: string) {
    return this.apiKeysService.getApiKeyById(req.user.userId, keyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async updateApiKey(
    @Request() req,
    @Param('id') keyId: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.updateApiKey(req.user.userId, keyId, updateApiKeyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteApiKey(@Request() req, @Param('id') keyId: string) {
    return this.apiKeysService.deleteApiKey(req.user.userId, keyId);
  }
}