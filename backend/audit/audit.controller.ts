import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("audit")
@Controller("audit")
export class AuditController {
  @Get("logs")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get audit logs" })
  async getAuditLogs() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
