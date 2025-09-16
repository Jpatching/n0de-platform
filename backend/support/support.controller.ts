import { Controller, Get, Post, Body, Request } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SupportService } from "./support.service";

@ApiTags("Support")
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get("tickets")
  @ApiOperation({ summary: "Get support tickets" })
  async getTickets(@Request() req) {
    console.log("Support Controller - req.user:", req.user);
    console.log(
      "Support Controller - full req keys:",
      Object.keys(req).filter((k) => k.includes("user")),
    );

    if (!req.user) {
      throw new Error("Authentication failed - req.user is undefined");
    }

    return this.supportService.getTickets(req.user.id || req.user.userId);
  }

  @Post("tickets")
  @ApiOperation({ summary: "Create support ticket" })
  async createTicket(@Request() req, @Body() data: any) {
    return this.supportService.createTicket(
      req.user.id || req.user.userId,
      data,
    );
  }
}
