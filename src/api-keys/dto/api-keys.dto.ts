import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNumber, IsOptional, IsBoolean, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name for the API key',
    example: 'Production App',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Permissions for the API key',
    example: ['read', 'write'],
    required: false,
    default: ['read'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    description: 'Rate limit (requests per minute)',
    example: 1000,
    required: false,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  rateLimit?: number;
}

export class UpdateApiKeyDto {
  @ApiProperty({
    description: 'Name for the API key',
    example: 'Production App',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Permissions for the API key',
    example: ['read', 'write'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    description: 'Rate limit (requests per minute)',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  rateLimit?: number;

  @ApiProperty({
    description: 'Whether the API key is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}