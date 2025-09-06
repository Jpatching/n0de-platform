import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService, ActivityItem } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recent user activity data' })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of activities to return (default: 20, max: 100)', 
    type: Number 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Recent activity data retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['api_key_created', 'rate_limit_alert', 'login', 'milestone', 'team_member_added'] 
          },
          description: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: { 
            type: 'object',
            description: 'Additional activity-specific data'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRecentActivity(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<ActivityItem[]> {
    // Cap the limit at 100 for performance reasons
    const cappedLimit = Math.min(limit, 100);
    return this.activityService.getRecentActivity(req.user.userId, cappedLimit);
  }
}