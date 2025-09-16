'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface AuthHandlerProps {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (show: boolean) => void;
}

export default function AuthHandler({ setAuthMode, setShowAuthModal }: AuthHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const authRequired = searchParams.get('auth');
    const _redirectPath = searchParams.get('redirect');
    
    if (authRequired === 'required') {
      // User was redirected here because they tried to access a protected route
      setAuthMode('signin'); // Default to signin for protected route access
      setShowAuthModal(true);
      
      // Clean up URL by removing auth parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      url.searchParams.delete('redirect');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  }, [searchParams, setAuthMode, setShowAuthModal]);

  return null; // This component doesn't render anything
}