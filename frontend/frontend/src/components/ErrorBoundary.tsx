'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a recursion error
    if (error.message.includes('Maximum call stack size exceeded')) {
      console.error('🔄 Recursion detected! Clearing localStorage to prevent infinite loops...');
      
      // Clear problematic localStorage items
      try {
        localStorage.removeItem('pv3_auth_session');
        localStorage.removeItem('pv3_token');
        localStorage.removeItem('pv3_user');
        localStorage.removeItem('pv3_session_data');
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
    }
    
    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-main flex items-center justify-center">
          <div className="max-w-md mx-auto p-6 bg-surface border border-border rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Something went wrong
              </h2>
              
              <p className="text-text-secondary mb-4">
                {this.state.error?.message.includes('Maximum call stack size exceeded') 
                  ? 'We detected a recursion issue and cleared your session. Please try connecting your wallet again.'
                  : 'An unexpected error occurred. We\'ve logged the details.'
                }
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={this.resetError}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
                >
                  Reload Page
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-text-secondary">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="mt-2 p-2 bg-bg-card rounded text-xs text-text-secondary overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 