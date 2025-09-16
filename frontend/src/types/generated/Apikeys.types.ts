// Auto-generated types from api-keys.dto.ts
// Generated at: 2025-09-03T19:08:53.210Z
// Source: /home/sol/n0de-deploy/backend/api-keys/dto/api-keys.dto.ts
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

export interface CreateApiKeyDto {
  name: string;
  permissions?: string[];
}

export interface UpdateApiKeyDto {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
}


// Utility types for Apikeys
export type CreateApikeysRequest = Partial<CreateApiKeyDto>;
export type UpdateApikeysRequest = Partial<CreateApiKeyDto>;
export type ApikeysResponse = CreateApiKeyDto;

// API response wrapper
export interface ApikeysApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
