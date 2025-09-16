import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("security")
@Controller("security")
export class SecurityController {
  @Get("events")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get security events" })
  async getSecurityEvents() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
