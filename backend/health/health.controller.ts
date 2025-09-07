import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Get system health status" })
  @ApiResponse({
    status: 200,
    description: "Health status retrieved successfully",
  })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }
}
