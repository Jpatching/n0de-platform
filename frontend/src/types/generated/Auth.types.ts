// Auto-generated types from auth.dto.ts
// Generated at: 2025-09-03T19:08:53.211Z
// Source: /home/sol/n0de-deploy/backend/auth/dto/auth.dto.ts
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

export interface RegisterDto {

}

export interface LoginDto {

}

export interface ChangePasswordDto {

}

export interface UpdateProfileDto {

}


// Utility types for Auth
export type CreateAuthRequest = Partial<RegisterDto>;
export type UpdateAuthRequest = Partial<RegisterDto>;
export type AuthResponse = RegisterDto;

// API response wrapper
export interface AuthApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
