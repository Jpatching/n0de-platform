import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("endpoints")
@Controller("endpoints")
export class EndpointsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get RPC endpoints" })
  async getEndpoints() {
    // Return empty array for now - will implement full functionality later
    return [];
  }
}
