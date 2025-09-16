import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ErrorsService } from "./errors.service";
import { ErrorLogDto } from "./dto/error-log.dto";

@ApiTags("errors")
@Controller("errors")
@UseGuards(ThrottlerGuard)
export class ErrorsController {
  constructor(private errorsService: ErrorsService) {}

  @Post("log")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: "Log frontend errors",
    description:
      "Endpoint for logging client-side errors from the frontend application",
  })
  @ApiResponse({
    status: 200,
    description: "Error logged successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        errorId: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 429, description: "Too many requests" })
  @ApiResponse({ status: 400, description: "Invalid error data" })
  async logError(
    @Body() errorLogDto: ErrorLogDto,
    @Headers() headers: Record<string, string>,
    @Request() req: any,
  ) {
    // Extract client info
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: headers["user-agent"] || errorLogDto.userAgent,
      referer: headers.referer,
      timestamp: new Date().toISOString(),
    };

    const errorId = await this.errorsService.logError(errorLogDto, clientInfo);

    return {
      success: true,
      message: "Error logged successfully",
      errorId,
    };
  }
}
