import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUrl,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ErrorLogDto {
  @ApiProperty({ description: "Error message" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: "Error stack trace" })
  @IsString()
  @IsNotEmpty()
  stack: string;

  @ApiPropertyOptional({ description: "URL where the error occurred" })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: "User agent string" })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: "Additional error context" })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: "Error severity level" })
  @IsString()
  @IsOptional()
  severity?: "low" | "medium" | "high" | "critical";
}
