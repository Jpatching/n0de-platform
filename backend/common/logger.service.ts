import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class LoggerService implements NestLoggerService {
  private logLevel: string;
  private logFilePath: string;

  constructor(private configService: ConfigService) {
    this.logLevel = this.configService.get("LOG_LEVEL") || "info";
    this.logFilePath = this.configService.get("LOG_FILE_PATH") || "./logs";

    // Ensure log directory exists
    if (!fs.existsSync(this.logFilePath)) {
      fs.mkdirSync(this.logFilePath, { recursive: true });
    }
  }

  log(message: any, context?: string) {
    this.writeLog("info", message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.writeLog("error", message, context, trace);
  }

  warn(message: any, context?: string) {
    this.writeLog("warn", message, context);
  }

  debug(message: any, context?: string) {
    if (this.shouldLog("debug")) {
      this.writeLog("debug", message, context);
    }
  }

  verbose(message: any, context?: string) {
    if (this.shouldLog("verbose")) {
      this.writeLog("verbose", message, context);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ["error", "warn", "info", "debug", "verbose"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private writeLog(
    level: string,
    message: any,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : "";
    const messageStr =
      typeof message === "object" ? JSON.stringify(message) : message;
    const traceStr = trace ? `\n${trace}` : "";

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      context,
      message: messageStr,
      trace,
    };

    // Console output with colors
    const colorCode = this.getColorCode(level);
    const resetCode = "\x1b[0m";
    const consoleMessage = `${colorCode}[${timestamp}] ${level.toUpperCase()}${contextStr}: ${messageStr}${resetCode}${traceStr}`;

    console.log(consoleMessage);

    // File output
    this.writeToFile(logEntry);
  }

  private getColorCode(level: string): string {
    switch (level) {
      case "error":
        return "\x1b[31m"; // Red
      case "warn":
        return "\x1b[33m"; // Yellow
      case "info":
        return "\x1b[36m"; // Cyan
      case "debug":
        return "\x1b[35m"; // Magenta
      case "verbose":
        return "\x1b[37m"; // White
      default:
        return "\x1b[0m"; // Reset
    }
  }

  private writeToFile(logEntry: any) {
    try {
      const date = new Date().toISOString().split("T")[0];
      const filename = path.join(this.logFilePath, `n0de-${date}.log`);
      const logLine = JSON.stringify(logEntry) + "\n";

      fs.appendFileSync(filename, logLine);
    } catch (error) {
      console.error("Failed to write log to file:", error);
    }
  }

  // API-specific logging methods
  logApiRequest(
    method: string,
    url: string,
    userId?: string,
    apiKeyId?: string,
    duration?: number,
  ) {
    this.log(
      {
        type: "api_request",
        method,
        url,
        userId,
        apiKeyId,
        duration,
      },
      "API",
    );
  }

  logApiError(
    method: string,
    url: string,
    error: any,
    userId?: string,
    apiKeyId?: string,
  ) {
    this.error(
      {
        type: "api_error",
        method,
        url,
        error: error.message || error,
        stack: error.stack,
        userId,
        apiKeyId,
      },
      error.stack,
      "API",
    );
  }

  logRpcCall(
    method: string,
    params: any,
    duration: number,
    success: boolean,
    userId?: string,
    apiKeyId?: string,
  ) {
    this.log(
      {
        type: "rpc_call",
        method,
        params,
        duration,
        success,
        userId,
        apiKeyId,
      },
      "RPC",
    );
  }

  logSecurityEvent(
    event: string,
    details: any,
    userId?: string,
    ipAddress?: string,
  ) {
    this.warn(
      {
        type: "security_event",
        event,
        details,
        userId,
        ipAddress,
      },
      "SECURITY",
    );
  }

  logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    region?: string,
  ) {
    this.log(
      {
        type: "performance_metric",
        metric,
        value,
        unit,
        region,
      },
      "METRICS",
    );
  }
}
