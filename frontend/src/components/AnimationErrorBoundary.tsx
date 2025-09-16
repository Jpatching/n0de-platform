'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for animation-related errors
 * Gracefully falls back to static content when animations fail
 */
class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName } = this.props;
    
    // Log animation errors for debugging
    console.error('🎭 Animation Error in', componentName || 'component', ':', error);
    console.error('Error Info:', errorInfo);
    
    // In development, provide more detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.group('🎭 Animation Error Details');
      console.error('Component:', componentName);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // Provide fallback UI or render children without animations
      if (fallback) {
        return fallback;
      }

      // Default fallback: render a non-animated version
      if (process.env.NODE_ENV === 'development') {
        return (
          <div 
            className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg"
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          >
            <p className="text-red-400 mb-2">🎭 Animation Error in {componentName}</p>
            <details className="text-red-300">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {error?.message}
              </pre>
            </details>
          </div>
        );
      }

      // In production, render nothing or minimal fallback
      return <div className="opacity-75">{children}</div>;
    }

    return children;
  }
}

export default AnimationErrorBoundary;

/**
 * Higher-order component to wrap components with animation error boundary
 */
export function withAnimationErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) {
  const WithAnimationErrorBoundary = (props: P) => (
    <AnimationErrorBoundary 
      componentName={componentName || WrappedComponent.displayName || WrappedComponent.name}
      fallback={fallback}
    >
      <WrappedComponent {...props} />
    </AnimationErrorBoundary>
  );

  WithAnimationErrorBoundary.displayName = `withAnimationErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithAnimationErrorBoundary;
}