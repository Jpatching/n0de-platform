'use client';

import { useState, useEffect, ReactNode } from 'react';

interface HydrationSafeProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * HydrationSafe Component - Prevents hydration mismatches
 * Ensures consistent rendering between server and client
 */
export default function HydrationSafe({ 
  children, 
  fallback = <div style={{ visibility: 'hidden', height: '1px' }} />,
  className 
}: HydrationSafeProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={className} suppressHydrationWarning>
      {isMounted ? children : fallback}
    </div>
  );
}