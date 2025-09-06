// Auto-generated types from payments.dto.ts
// Generated at: 2025-09-03T19:08:53.211Z
// Source: /home/sol/n0de-deploy/backend/payments/dto/payments.dto.ts
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

export interface CreatePaymentDto {

}

export interface PaymentCallbackDto {

}

export interface WebhookPayloadDto {

}


// Utility types for Payments
export type CreatePaymentsRequest = Partial<CreatePaymentDto>;
export type UpdatePaymentsRequest = Partial<CreatePaymentDto>;
export type PaymentsResponse = CreatePaymentDto;

// API response wrapper
export interface PaymentsApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
