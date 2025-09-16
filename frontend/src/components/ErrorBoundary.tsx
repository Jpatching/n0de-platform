'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  goHome: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to your error tracking service
    // You can integrate with services like Sentry, LogRocket, etc.
    if (typeof window !== 'undefined') {
      // Example: Sentry.captureException(error);
      console.error('Error details:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  goHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          goHome={this.goHome}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError, goHome }) => {
  const isAuthError = error?.message?.includes('auth') || error?.message?.includes('token');
  const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-bg-elevated border border-red-500/20 rounded-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Something went wrong
          </h1>
          
          <p className="text-text-secondary mb-6">
            {isAuthError
              ? 'There was an authentication error. Please try signing in again.'
              : isNetworkError
              ? 'We\'re having trouble connecting to our servers. Please check your connection and try again.'
              : 'An unexpected error occurred. Our team has been notified and is working on a fix.'}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-4 bg-bg-hover rounded-lg border border-border text-left">
              <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Error Details (Development)
              </h3>
              <div className="text-xs font-mono text-red-400 break-all">
                {error.message}
              </div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-text-secondary cursor-pointer hover:text-text-primary">
                    Stack trace
                  </summary>
                  <div className="mt-2 text-xs font-mono text-text-secondary whitespace-pre-wrap">
                    {error.stack}
                  </div>
                </details>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={resetError}
              className="flex items-center gap-2"
              variant="default"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
            
            <Button
              onClick={goHome}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <Home className="w-4 h-4" />
              Go home
            </Button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-secondary">
              If this problem persists, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error boundary for authentication errors
export const AuthErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleAuthError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Authentication error:', error, errorInfo);
    
    // Clear auth tokens on auth errors
    if (typeof window !== 'undefined') {
      localStorage.removeItem('n0de_token');
      localStorage.removeItem('n0de_refresh_token');
      localStorage.removeItem('n0de_user');
    }
  };

  return (
    <ErrorBoundary onError={handleAuthError}>
      {children}
    </ErrorBoundary>
  );
};

// Specialized error boundary for API errors
export const ApiErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleApiError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('API error:', error, errorInfo);
    
    // You can add specific API error handling logic here
    // For example, retry logic, fallback data, etc.
  };

  return (
    <ErrorBoundary onError={handleApiError}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
export type { ErrorBoundaryProps, ErrorFallbackProps };