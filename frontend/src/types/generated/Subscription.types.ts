// Auto-generated types from subscription.dto.ts
// Generated at: 2025-09-03T19:08:53.212Z
// Source: /home/sol/n0de-deploy/backend/subscriptions/dto/subscription.dto.ts
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

export interface UpgradeSubscriptionDto {
  planId: string;
  paymentMethod: 'stripe' | 'coinbase' | 'nowpayments';
}


// Utility types for Subscription
export type CreateSubscriptionRequest = Partial<UpgradeSubscriptionDto>;
export type UpdateSubscriptionRequest = Partial<UpgradeSubscriptionDto>;
export type SubscriptionResponse = UpgradeSubscriptionDto;

// API response wrapper
export interface SubscriptionApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
