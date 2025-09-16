import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("integrations")
@Controller("integrations")
export class IntegrationsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get integrations" })
  async getIntegrations() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
