// Auto-generated types from error-log.dto.ts
// Generated at: 2025-09-03T19:08:53.211Z
// Source: /home/sol/n0de-deploy/backend/errors/dto/error-log.dto.ts
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

export interface ErrorLogDto {
  id?: string;
  message: string;
  stack?: string;
  level: 'error' | 'warn' | 'info';
  timestamp: string;
  userId?: string;
}


// Utility types for Errorlog
export type CreateErrorlogRequest = Partial<ErrorLogDto>;
export type UpdateErrorlogRequest = Partial<ErrorLogDto>;
export type ErrorlogResponse = ErrorLogDto;

// API response wrapper
export interface ErrorlogApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
