// Auto-generated Prisma types for frontend
// Generated at: 2025-09-03T19:08:54.749Z
// ⚠️  DO NOT EDIT MANUALLY

// Core database models (simplified for frontend)
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'ENTERPRISE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  userId: string;
  isActive: boolean;
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  type: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: 'COINBASE' | 'STRIPE' | 'NOWPAYMENTS';
  externalId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Usage and metrics types
export interface UsageStats {
  id: string;
  userId: string;
  requests: number;
  responseTimes: number[];
  errors: number;
  date: string;
}

export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  lastUpdated: string;
}
