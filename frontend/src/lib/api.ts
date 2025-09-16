import { toast } from 'sonner';
import { ApiConfig } from './api-config';

interface ApiOptions extends RequestInit {
  retry?: number;
  retryDelay?: number;
  requiresAuth?: boolean;
  skipRefresh?: boolean;
  enableDebug?: boolean;
}

interface RequestLog {
  url: string;
  method: string;
  timestamp: number;
  duration?: number;
  status?: number;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<string | null> | null = null;
  private requestLogs: RequestLog[] = [];
  private isDebugMode: boolean = false;

  constructor(baseURL: string, debugMode: boolean = false) {
    this.baseURL = baseURL;
    this.isDebugMode = debugMode || ApiConfig.isDevelopment();
    
    if (this.isDebugMode) {
      console.log('🔧 ApiClient initialized with baseURL:', baseURL);
    }
  }

  private logRequest(log: RequestLog): void {
    if (this.isDebugMode) {
      console.log('🌐 API Request:', {
        method: log.method,
        url: log.url,
        duration: log.duration ? `${log.duration}ms` : 'pending',
        status: log.status || 'pending',
        timestamp: new Date(log.timestamp).toISOString()
      });
    }
    
    this.requestLogs.push(log);
    
    // Keep only last 100 requests to prevent memory leaks
    if (this.requestLogs.length > 100) {
      this.requestLogs.shift();
    }
  }

  public getRequestLogs(): RequestLog[] {
    return [...this.requestLogs];
  }

  public clearLogs(): void {
    this.requestLogs = [];
  }

  private async getAuthHeaders(skipRefresh = false): Promise<HeadersInit> {
    const token = localStorage.getItem('n0de_token');
    const tokenTimestamp = localStorage.getItem('n0de_token_timestamp');
    
    if (!token) return {};
    
    // Check if token needs refresh (older than 10 minutes)
    if (!skipRefresh && tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      if (tokenAge > 10 * 60 * 1000) {
        // Token needs refresh
        await this.refreshToken();
        const newToken = localStorage.getItem('n0de_token');
        return newToken ? { 'Authorization': `Bearer ${newToken}` } : {};
      }
    }
    
    return { 'Authorization': `Bearer ${token}` };
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('n0de_refresh_token');
      if (!refreshToken) {
        console.warn('No refresh token available');
        return null;
      }

      try {
        console.log('Attempting token refresh...');
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include', // Include cookies for CORS
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Token refresh successful');
          
          // Store new tokens
          localStorage.setItem('n0de_token', data.accessToken);
          localStorage.setItem('n0de_token_timestamp', Date.now().toString());
          
          // Update refresh token if provided
          if (data.refreshToken) {
            localStorage.setItem('n0de_refresh_token', data.refreshToken);
          }
          
          if (data.user) {
            localStorage.setItem('n0de_user', JSON.stringify(data.user));
          }
          
          return data.accessToken;
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('Token refresh failed:', response.status, errorData);
          
          // Clear auth only if refresh token is actually invalid (401)
          if (response.status === 401) {
            this.clearAuth();
          }
          return null;
        }
      } catch (error) {
        console.error('Token refresh network error:', error);
        // Don't clear auth on network errors - might be temporary
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private clearAuth() {
    localStorage.removeItem('n0de_token');
    localStorage.removeItem('n0de_refresh_token');
    localStorage.removeItem('n0de_session');
    localStorage.removeItem('n0de_user');
    localStorage.removeItem('n0de_token_timestamp');
    window.dispatchEvent(new Event('storage'));
    
    // Only redirect if not already on auth pages
    if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
      window.location.href = '/?auth=expired';
    }
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const {
      retry = 3,
      retryDelay = 1000,
      requiresAuth = true,
      skipRefresh = false,
      enableDebug = this.isDebugMode,
      headers = {},
      ...fetchOptions
    } = options;

    const startTime = performance.now();
    const method = fetchOptions.method || 'GET';
    const fullUrl = `${this.baseURL}${endpoint}`;
    
    // Create request log entry
    const requestLog: RequestLog = {
      url: fullUrl,
      method,
      timestamp: Date.now()
    };

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retry) {
      try {
        const authHeaders = requiresAuth ? await this.getAuthHeaders(skipRefresh) : {};
        
        const response = await fetch(fullUrl, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
          },
        });

        // Calculate request duration
        const duration = Math.round(performance.now() - startTime);
        requestLog.duration = duration;
        requestLog.status = response.status;

        // Handle 401 - try to refresh token once per request
        if (response.status === 401 && requiresAuth && !skipRefresh && attempt === 0) {
          console.log('Received 401, attempting token refresh...');
          const newToken = await this.refreshToken();
          if (newToken) {
            console.log('Token refreshed, retrying request...');
            // Retry with new token - don't increment attempt counter for retry
            const retryAuthHeaders = { 'Authorization': `Bearer ${newToken}` };
            
            const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
              ...fetchOptions,
              headers: {
                'Content-Type': 'application/json',
                ...retryAuthHeaders,
                ...headers,
              },
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json().catch(() => null);
              return retryData as T;
            }
            
            // If retry also failed, continue with normal error handling
            const retryData = await retryResponse.json().catch(() => null);
            if (!retryResponse.ok) {
              throw new Error(retryData?.message || `Request failed with status ${retryResponse.status}`);
            }
          } else {
            // Refresh failed, clear auth
            console.warn('Token refresh failed, clearing auth');
            this.clearAuth();
            throw new Error('Session expired. Please sign in again.');
          }
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt);
          
          if (attempt < retry) {
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }
          
          throw new Error('Too many requests. Please try again later.');
        }

        // Handle server errors with retry
        if (response.status >= 500 && attempt < retry) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        // Parse response
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage = data?.message || `Request failed with status ${response.status}`;
          requestLog.error = errorMessage;
          throw new Error(errorMessage);
        }

        // Log successful request
        this.logRequest(requestLog);
        return data as T;
      } catch (error) {
        lastError = error as Error;
        requestLog.error = lastError.message;
        
        // Network errors - retry with exponential backoff
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt < retry) {
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }
        }
        
        // Don't retry for client errors (4xx except 429)
        if (error instanceof Error && error.message.includes('4')) {
          break;
        }
        
        attempt++;
      }
    }

    // All retries exhausted - log failed request
    this.logRequest(requestLog);
    const errorMessage = lastError?.message || 'Request failed after multiple attempts';
    
    if (this.isDebugMode) {
      console.error('🚨 API Request Failed:', {
        url: fullUrl,
        method,
        attempts: attempt + 1,
        finalError: errorMessage,
        duration: Math.round(performance.now() - startTime)
      });
    }
    
    toast.error(errorMessage);
    throw lastError || new Error(errorMessage);
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance with centralized configuration
const api = new ApiClient(ApiConfig.getApiUrl(), ApiConfig.isDevelopment());

export default api;

// Export types for use in components
export type { ApiOptions };