import { Injectable, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as winston from "winston";
import "winston-daily-rotate-file";

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const logLevel = this.configService.get("LOG_LEVEL", "info");
    const logFormat = this.configService.get("LOG_FORMAT", "json");
    const nodeEnv = this.configService.get("NODE_ENV", "development");

    // Define log format
    const formats = [
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
    ];

    if (logFormat === "json") {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, context, ...meta }) => {
            const contextStr = context ? `[${context}]` : "";
            const metaStr = Object.keys(meta).length
              ? JSON.stringify(meta)
              : "";
            return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
          },
        ),
      );
    }

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(...formats),
      }),
    );

    // File transport for errors
    if (nodeEnv === "production") {
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: "logs/error-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          level: "error",
          maxFiles: "14d",
          maxSize: "20m",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // File transport for all logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: "logs/application-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          level: logLevel,
          maxFiles: "7d",
          maxSize: "20m",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false,
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom methods for structured logging
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ) {
    this.logger.info("HTTP Request", {
      method,
      url,
      statusCode,
      duration,
      userId,
      type: "http_request",
    });
  }

  logError(error: Error, context?: string, userId?: string) {
    this.logger.error("Application Error", {
      message: error.message,
      stack: error.stack,
      context,
      userId,
      type: "application_error",
    });
  }

  logSecurityEvent(event: string, details: any, userId?: string) {
    this.logger.warn("Security Event", {
      event,
      details,
      userId,
      type: "security_event",
    });
  }

  logPaymentEvent(event: string, details: any, userId?: string) {
    this.logger.info("Payment Event", {
      event,
      details,
      userId,
      type: "payment_event",
    });
  }

  logPerformance(operation: string, duration: number, metadata?: any) {
    this.logger.info("Performance Metric", {
      operation,
      duration,
      metadata,
      type: "performance_metric",
    });
  }

  logDatabaseQuery(query: string, duration: number, success: boolean) {
    const level = success ? "debug" : "error";
    this.logger[level]("Database Query", {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      success,
      type: "database_query",
    });
  }

  logWebSocketEvent(event: string, userId: string, data?: any) {
    this.logger.debug("WebSocket Event", {
      event,
      userId,
      data,
      type: "websocket_event",
    });
  }

  logAuthEvent(
    event: string,
    userId?: string,
    success: boolean = true,
    details?: any,
  ) {
    const level = success ? "info" : "warn";
    this.logger[level]("Authentication Event", {
      event,
      userId,
      success,
      details,
      type: "auth_event",
    });
  }

  logApiKeyUsage(apiKey: string, endpoint: string, userId: string) {
    this.logger.info("API Key Usage", {
      apiKey: apiKey.substring(0, 8) + "...",
      endpoint,
      userId,
      type: "api_key_usage",
    });
  }

  logRateLimitExceeded(ip: string, endpoint: string, userId?: string) {
    this.logger.warn("Rate Limit Exceeded", {
      ip,
      endpoint,
      userId,
      type: "rate_limit",
    });
  }
}
