// Auto-generated types from auth.dto.ts
// Generated at: 2025-09-03T19:08:53.211Z
// Source: /home/sol/n0de-deploy/backend/auth/dto/auth.dto.ts
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  username?: string;
}


// Utility types for Auth
export type CreateAuthRequest = Partial<RegisterDto>;
export type UpdateAuthRequest = Partial<RegisterDto>;
export type AuthResponse = RegisterDto;

// API response wrapper
export interface AuthApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
