import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UsageService } from "./usage.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("usage")
@Controller("usage")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsageController {
  constructor(private usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: "Get user usage statistics" })
  @ApiResponse({
    status: 200,
    description: "Usage statistics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserUsageStats(@Request() req) {
    return this.usageService.getUserUsageStats(req.user.userId);
  }
}
