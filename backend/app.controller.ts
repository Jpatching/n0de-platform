import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("app")
@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return "N0DE RPC Backend API v1.0";
  }

  @Get("status")
  getStatus() {
    return {
      status: "online",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }
}
