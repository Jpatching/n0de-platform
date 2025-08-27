import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics() {
    return this.metricsService.getPerformanceMetrics();
  }
}