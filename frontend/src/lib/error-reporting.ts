/**
 * Frontend Error Reporting Integration
 * Connects to Error Correlation Agent for intelligent debugging
 */

class ErrorReporter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.init();
    this.setupGlobalErrorHandlers();
  }

  private init() {
    this.connect();
  }

  private connect() {
    try {
      // Connect to Error Correlation Agent WebSocket
      this.ws = new WebSocket('ws://localhost:8081');
      
      this.ws.onopen = () => {
        console.log('📡 Connected to Error Correlation Agent');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleCorrelationUpdate(data);
        } catch (_error) {
          console.error('Invalid correlation data received');
        }
      };

      this.ws.onclose = () => {
        console.log('📡 Disconnected from Error Correlation Agent');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Error Correlation Agent connection failed');
        this.scheduleReconnect();
      };

    } catch (_error) {
      console.error('Failed to connect to Error Correlation Agent');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private setupGlobalErrorHandlers() {
    // React error boundary integration
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'unhandled-promise-rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        level: 'error'
      });
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript-error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        level: 'error'
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError({
          type: 'resource-error',
          message: `Failed to load: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          level: 'warning'
        });
      }
    }, true);
  }

  public reportError(error: {
    type: string;
    message: string;
    stack?: string;
    url?: string;
    timestamp?: string;
    level?: string;
    userId?: string;
    context?: any;
  }) {
    // Enhanced error data
    const enhancedError = {
      ...error,
      userAgent: navigator.userAgent,
      url: error.url || window.location.href,
      timestamp: error.timestamp || new Date().toISOString(),
      level: error.level || 'error',
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION,
      context: {
        route: window.location.pathname,
        referrer: document.referrer,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        connection: (navigator as any).connection?.effectiveType,
        ...error.context
      }
    };

    // Send to Error Correlation Agent
    this.sendToCorrelationAgent(enhancedError);
    
    // Also log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report: ${error.type}`);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('Context:', enhancedError.context);
      console.groupEnd();
    }
  }

  private sendToCorrelationAgent(error: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(error));
      } catch (sendError) {
        console.error('Failed to send error to correlation agent');
      }
    } else {
      // Queue error for when connection is restored
      this.queueError(error);
    }
  }

  private queueError(error: any) {
    const queueKey = 'n0de-error-queue';
    try {
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      queue.push(error);
      
      // Keep only last 50 errors in queue
      if (queue.length > 50) {
        queue.splice(0, queue.length - 50);
      }
      
      localStorage.setItem(queueKey, JSON.stringify(queue));
    } catch (storageError) {
      // LocalStorage failed, error will be lost
      console.error('Failed to queue error');
    }
  }

  private handleCorrelationUpdate(data: any) {
    if (data.type === 'error-alert' && data.suggestions) {
      // Show intelligent error suggestions to developers
      if (process.env.NODE_ENV === 'development') {
        console.group('🔍 Error Correlation Insights');
        console.log('Suggestions:', data.suggestions);
        if (data.correlations?.length > 0) {
          console.log('Related errors found:', data.correlations);
        }
        console.groupEnd();
      }
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Adapt this to your auth system
      const authData = localStorage.getItem('auth-user');
      return authData ? JSON.parse(authData).id : undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('n0de-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('n0de-session-id', sessionId);
    }
    return sessionId;
  }

  // Manual error reporting for caught errors
  public reportCaughtError(error: Error, context?: any) {
    this.reportError({
      type: 'caught-error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      level: 'error',
      context
    });
  }

  // API error reporting
  public reportApiError(endpoint: string, status: number, response?: any) {
    this.reportError({
      type: 'api-error',
      message: `API ${endpoint} failed with status ${status}`,
      timestamp: new Date().toISOString(),
      level: status >= 500 ? 'error' : 'warning',
      context: {
        endpoint,
        status,
        response: response ? JSON.stringify(response).substring(0, 500) : undefined
      }
    });
  }

  // Performance issue reporting
  public reportPerformanceIssue(metric: string, value: number, threshold: number) {
    this.reportError({
      type: 'performance-issue',
      message: `Performance metric ${metric} (${value}) exceeded threshold (${threshold})`,
      timestamp: new Date().toISOString(),
      level: 'warning',
      context: {
        metric,
        value,
        threshold,
        userTiming: this.getPerformanceMetrics()
      }
    });
  }

  private getPerformanceMetrics() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: window.performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: window.performance.getEntriesByName('first-contentful-paint')[0]?.startTime
      };
    }
    
    return {};
  }
}

// Create singleton instance
export const errorReporter = new ErrorReporter();

// Export for use in other components
export default ErrorReporter;