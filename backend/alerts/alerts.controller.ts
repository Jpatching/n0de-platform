import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("alerts")
@Controller("alerts")
export class AlertsController {
  @Get("rules")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get alert rules" })
  async getAlertRules() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
