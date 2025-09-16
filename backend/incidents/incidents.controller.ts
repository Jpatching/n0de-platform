import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("incidents")
@Controller("incidents")
export class IncidentsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get incidents" })
  async getIncidents() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
