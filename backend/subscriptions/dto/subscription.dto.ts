import { IsString, IsOptional, IsNotEmpty, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SubscriptionType } from "@prisma/client";

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: "Plan type to upgrade to",
    enum: SubscriptionType,
    example: "PROFESSIONAL",
  })
  @IsNotEmpty()
  planType: SubscriptionType | string;

  @ApiPropertyOptional({ description: "Payment provider preference" })
  @IsOptional()
  @IsString()
  paymentProvider?: "STRIPE" | "COINBASE_COMMERCE" | "NOWPAYMENTS";

  @ApiPropertyOptional({ description: "Additional payment information" })
  @IsOptional()
  paymentInfo?: any;
}
