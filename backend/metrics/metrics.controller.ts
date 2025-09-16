import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MetricsService } from "./metrics.service";

@ApiTags("Metrics")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("performance")
  @ApiOperation({ summary: "Get performance metrics" })
  async getPerformanceMetrics() {
    return this.metricsService.getPerformanceMetrics();
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get dashboard metrics for authenticated user" })
  async getDashboardMetrics(@Request() req) {
    return this.metricsService.getDashboardMetrics(req.user.userId);
  }

  @Get("live")
  @ApiOperation({ summary: "Get live system metrics" })
  async getLiveMetrics() {
    return this.metricsService.getLiveMetrics();
  }

  @Get("forecast")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get metrics forecast" })
  async getMetricsForecast() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
