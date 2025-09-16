'use client';

import { useState, useEffect } from 'react';
import { ApiConfig } from '@/lib/api-config';

export function useDebugMode() {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    // Enable debug mode in development or with special flag
    const shouldEnableDebug = ApiConfig.isDevelopment() || 
      typeof window !== 'undefined' && window.location.search.includes('debug=true');
    
    setDebugEnabled(shouldEnableDebug);

    if (!shouldEnableDebug) return;

    // Keyboard shortcut to open debug panel (Ctrl/Cmd + Shift + D)
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsDebugOpen(prev => !prev);
        console.log('🔧 Debug panel toggled');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return {
    isDebugOpen,
    setIsDebugOpen,
    debugEnabled
  };
}