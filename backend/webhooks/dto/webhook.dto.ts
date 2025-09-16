import {
  IsUrl,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateWebhookDto {
  @ApiProperty({
    description: "Webhook URL endpoint",
    example: "https://example.com/webhooks/n0de",
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: "Array of events to subscribe to",
    example: ["api_key.created", "usage.limit_reached"],
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];
}

export class UpdateWebhookDto {
  @ApiProperty({
    description: "Webhook URL endpoint",
    example: "https://example.com/webhooks/n0de",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({
    description: "Array of events to subscribe to",
    example: ["api_key.created", "usage.limit_reached"],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @ApiProperty({
    description: "Whether the webhook is active",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
