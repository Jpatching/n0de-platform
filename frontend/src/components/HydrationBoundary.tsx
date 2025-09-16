'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface HydrationBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Prevents hydration mismatches by only rendering children after client-side hydration
 * This fixes React Error #418 caused by server/client rendering differences
 */
export default function HydrationBoundary({ children, fallback }: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This only runs on the client side after hydration
    setIsHydrated(true);
  }, []);

  // During SSR and initial hydration, show fallback or nothing
  if (!isHydrated) {
    return fallback || <div className="min-h-4" />; // Minimal placeholder to maintain layout
  }

  // After hydration, render the actual content
  return <>{children}</>;
}

/**
 * Higher-order component for components that might cause hydration issues
 */
export function withHydrationBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WithHydrationBoundary = (props: P) => (
    <HydrationBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </HydrationBoundary>
  );

  WithHydrationBoundary.displayName = `withHydrationBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithHydrationBoundary;
}

/**
 * Hook to safely check if we're hydrated
 */
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}