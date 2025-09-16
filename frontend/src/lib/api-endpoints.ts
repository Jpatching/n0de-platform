/**
 * Centralized API endpoints configuration
 * Prevents URL duplication and provides type-safe endpoint access
 * 
 * IMPORTANT: These paths are relative to the base API URL which already includes /api/v1
 * Do NOT prepend /api/v1 to these paths as it will cause duplication
 */

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    GOOGLE: '/auth/google',
    GITHUB: '/auth/github',
  },

  // User endpoints
  USERS: {
    ME: '/users/me',
    PROFILE: '/users/profile',
    UPDATE: '/users/update',
    TEAM: '/users/team', // Fixed from '/team'
    DELETE: '/users/delete',
  },

  // Subscription endpoints
  SUBSCRIPTIONS: {
    CURRENT: '/subscriptions/current',
    USAGE: '/subscriptions/usage',
    PLANS: '/subscriptions/plans',
    UPGRADE: '/subscriptions/upgrade',
    CANCEL: '/subscriptions/cancel',
    HISTORY: '/subscriptions/history',
    REALTIME_USAGE: '/subscriptions/usage/realtime',
  },

  // Payment endpoints
  PAYMENTS: {
    HISTORY: '/payments/history',
    METHODS: '/payments/methods',
    CREATE_INTENT: '/payments/stripe/create-intent',
    CREATE_CHECKOUT: '/payments/checkout',
    WEBHOOK_STRIPE: '/payments/webhooks/stripe',
    WEBHOOK_COINBASE: '/payments/webhooks/coinbase',
    WEBHOOK_NOWPAYMENTS: '/payments/webhooks/nowpayments',
  },

  // API Key endpoints
  API_KEYS: {
    LIST: '/api-keys',
    CREATE: '/api-keys',
    DELETE: (id: string) => `/api-keys/${id}`,
    UPDATE: (id: string) => `/api-keys/${id}`,
    REGENERATE: (id: string) => `/api-keys/${id}/regenerate`,
  },

  // Billing endpoints
  BILLING: {
    USAGE: '/billing/usage',
    INVOICES: '/billing/invoices',
    INVOICE: (id: string) => `/billing/invoices/${id}`,
  },

  // Metrics endpoints
  METRICS: {
    PERFORMANCE: '/metrics/performance',
    USAGE: '/metrics/usage',
    FORECAST: '/metrics/forecast',
  },

  // Error logging endpoint
  ERRORS: {
    LOG: '/errors/log', // This endpoint may not exist yet on backend
  },

  // Support endpoints
  SUPPORT: {
    TICKETS: '/support/tickets',
    CREATE_TICKET: '/support/tickets',
    TICKET: (id: string) => `/support/tickets/${id}`,
  },

  // Webhook endpoints
  WEBHOOKS: {
    LIST: '/webhooks',
    CREATE: '/webhooks',
    DELETE: (id: string) => `/webhooks/${id}`,
    TEST: (id: string) => `/webhooks/${id}/test`,
  },

  // Admin endpoints (if user has admin access)
  ADMIN: {
    USERS: '/admin/users',
    STATS: '/admin/stats',
    LOGS: '/admin/logs',
    SYSTEM: '/admin/system',
  },
} as const;

/**
 * Helper function to build full API URL
 * @param endpoint - The endpoint path from API_ENDPOINTS
 * @returns Full API URL
 */
export function buildApiUrl(endpoint: string): string {
  // Remove any leading slash to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Get base URL from environment or use default
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.n0de.pro';
  
  // Base URL already includes /api/v1, so just append the endpoint
  return `${baseUrl}/api/v1/${cleanEndpoint}`;
}

/**
 * Type-safe endpoint getter
 * Ensures endpoints are used correctly and prevents typos
 */
export type EndpointPaths = 
  | typeof API_ENDPOINTS.AUTH[keyof typeof API_ENDPOINTS.AUTH]
  | typeof API_ENDPOINTS.USERS[keyof typeof API_ENDPOINTS.USERS]
  | typeof API_ENDPOINTS.SUBSCRIPTIONS[keyof typeof API_ENDPOINTS.SUBSCRIPTIONS]
  | typeof API_ENDPOINTS.PAYMENTS[keyof typeof API_ENDPOINTS.PAYMENTS]
  | typeof API_ENDPOINTS.BILLING[keyof typeof API_ENDPOINTS.BILLING]
  | typeof API_ENDPOINTS.METRICS[keyof typeof API_ENDPOINTS.METRICS]
  | typeof API_ENDPOINTS.ERRORS[keyof typeof API_ENDPOINTS.ERRORS]
  | typeof API_ENDPOINTS.SUPPORT[keyof typeof API_ENDPOINTS.SUPPORT]
  | typeof API_ENDPOINTS.ADMIN[keyof typeof API_ENDPOINTS.ADMIN];

export default API_ENDPOINTS;