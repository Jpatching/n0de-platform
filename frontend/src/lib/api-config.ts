/**
 * Centralized API configuration management
 * Fixes URL construction bugs and provides consistent API endpoint handling
 */

export class ApiConfig {
  private static _instance: ApiConfig;
  private readonly isDevelopment: boolean;
  private readonly baseUrl: string;
  private readonly backendUrl: string;
  private readonly wsUrl: string;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Clean base URLs without /api/v1 suffix to prevent duplication
    this.backendUrl = this.isDevelopment
      ? process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.n0de.pro';
    
    // API base URL includes /api/v1 path
    this.baseUrl = `${this.backendUrl}/api/v1`;
    
    // WebSocket URL for real-time connections
    this.wsUrl = this.isDevelopment
      ? 'ws://localhost:4000'
      : process.env.NEXT_PUBLIC_WS_URL || 'wss://api.n0de.pro';
  }

  static getInstance(): ApiConfig {
    if (!ApiConfig._instance) {
      ApiConfig._instance = new ApiConfig();
    }
    return ApiConfig._instance;
  }

  /**
   * Get the API base URL with /api/v1 path
   * Use this for all API calls
   */
  static getApiUrl(): string {
    return ApiConfig.getInstance().baseUrl;
  }

  /**
   * Get the backend base URL without /api/v1 path
   * Use this for WebSocket connections and non-API endpoints
   */
  static getBackendUrl(): string {
    return ApiConfig.getInstance().backendUrl;
  }

  /**
   * Get WebSocket URL for real-time connections
   */
  static getWebSocketUrl(): string {
    return ApiConfig.getInstance().wsUrl;
  }

  /**
   * Check if running in development mode
   */
  static isDevelopment(): boolean {
    return ApiConfig.getInstance().isDevelopment;
  }

  /**
   * Build full API endpoint URL
   * @param endpoint - API endpoint (without /api/v1)
   * @returns Complete URL for the API endpoint
   */
  static buildApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${ApiConfig.getApiUrl()}/${cleanEndpoint}`;
  }

  /**
   * Build WebSocket endpoint URL
   * @param namespace - WebSocket namespace
   * @returns Complete WebSocket URL
   */
  static buildWebSocketUrl(namespace: string): string {
    const cleanNamespace = namespace.startsWith('/') ? namespace.slice(1) : namespace;
    return `${ApiConfig.getWebSocketUrl()}/${cleanNamespace}`;
  }

  /**
   * Validate environment configuration
   * Throws error if configuration is invalid
   */
  static validateConfiguration(): void {
    const config = ApiConfig.getInstance();
    
    if (!config.backendUrl) {
      throw new Error('Backend URL is not configured');
    }
    
    if (!config.wsUrl) {
      throw new Error('WebSocket URL is not configured');
    }

    // Log configuration in development
    if (config.isDevelopment) {
      console.log('🔧 API Configuration:', {
        apiUrl: config.baseUrl,
        backendUrl: config.backendUrl,
        wsUrl: config.wsUrl,
        isDev: config.isDevelopment
      });
    }
  }

  /**
   * Get OAuth provider URL
   * @param provider - OAuth provider (google, github, etc.)
   * @returns Complete OAuth URL
   */
  static getOAuthUrl(provider: string): string {
    return ApiConfig.buildApiUrl(`auth/${provider}`);
  }

  /**
   * Get environment-specific URLs for debugging
   */
  static getDebugInfo(): Record<string, any> {
    const config = ApiConfig.getInstance();
    return {
      environment: config.isDevelopment ? 'development' : 'production',
      apiUrl: config.baseUrl,
      backendUrl: config.backendUrl,
      wsUrl: config.wsUrl,
      envVars: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL
      }
    };
  }
}

// Initialize and validate configuration on import
if (typeof window !== 'undefined') {
  ApiConfig.validateConfiguration();
}

// Export convenience functions
export const {
  getApiUrl,
  getBackendUrl,
  getWebSocketUrl,
  isDevelopment,
  buildApiUrl,
  buildWebSocketUrl,
  validateConfiguration,
  getOAuthUrl,
  getDebugInfo
} = ApiConfig;