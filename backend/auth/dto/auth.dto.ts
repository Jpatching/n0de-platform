import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @ApiProperty({
    description: "User password (minimum 8 characters)",
    example: "SecurePassword123!",
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  password: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    description: "Unique username",
    example: "johndoe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, hyphens, and underscores",
  })
  username?: string;
}

export class LoginDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @ApiProperty({
    description: "User password",
    example: "SecurePassword123!",
  })
  @IsString()
  @MinLength(1, { message: "Password is required" })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: "Current password",
    example: "CurrentPassword123!",
  })
  @IsString()
  @MinLength(1, { message: "Current password is required" })
  currentPassword: string;

  @ApiProperty({
    description: "New password (minimum 8 characters)",
    example: "NewSecurePassword123!",
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    description: "User first name",
    example: "John",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    description: "Unique username",
    example: "johndoe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, hyphens, and underscores",
  })
  username?: string;

  @ApiProperty({
    description: "Avatar URL",
    example: "https://example.com/avatar.jpg",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}
