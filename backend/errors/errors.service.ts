import { Injectable, Logger } from "@nestjs/common";
import { ErrorLogDto } from "./dto/error-log.dto";
import { randomUUID } from "crypto";

interface ClientInfo {
  ip: string;
  userAgent: string;
  referer?: string;
  timestamp: string;
}

@Injectable()
export class ErrorsService {
  private readonly logger = new Logger(ErrorsService.name);

  async logError(
    errorLogDto: ErrorLogDto,
    clientInfo: ClientInfo,
  ): Promise<string> {
    const errorId = randomUUID();

    // Create structured error log
    const errorLog = {
      errorId,
      message: errorLogDto.message,
      stack: errorLogDto.stack,
      url: errorLogDto.url,
      severity: errorLogDto.severity || "medium",
      context: errorLogDto.context,
      client: {
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        referer: clientInfo.referer,
      },
      timestamp: clientInfo.timestamp,
    };

    // Log the error with appropriate level based on severity
    switch (errorLogDto.severity) {
      case "critical":
        this.logger.error(`[CRITICAL] Frontend Error: ${errorLogDto.message}`, {
          errorId,
          stack: errorLogDto.stack,
          url: errorLogDto.url,
          client: clientInfo,
          context: errorLogDto.context,
        });
        break;
      case "high":
        this.logger.error(
          `[HIGH] Frontend Error: ${errorLogDto.message}`,
          errorLog,
        );
        break;
      case "medium":
        this.logger.warn(
          `[MEDIUM] Frontend Error: ${errorLogDto.message}`,
          errorLog,
        );
        break;
      case "low":
      default:
        this.logger.log(
          `[LOW] Frontend Error: ${errorLogDto.message}`,
          errorLog,
        );
        break;
    }

    // In a production environment, you might want to:
    // 1. Store errors in a database
    // 2. Send critical errors to monitoring services (Sentry, DataDog, etc.)
    // 3. Alert on high-frequency error patterns

    return errorId;
  }

  async getErrorStats(): Promise<any> {
    // Placeholder for error statistics
    // In production, this would query stored error data
    return {
      totalErrors: 0,
      criticalErrors: 0,
      recentErrors: [],
    };
  }
}
