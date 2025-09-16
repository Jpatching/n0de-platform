'use client';

import { useEffect } from 'react';

/**
 * Development-only CSS Error Boundary to catch undefined CSS property errors
 */
export default function CSSErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Override console.error to catch CSS parsing errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Detect CSS parsing errors
      if (message.includes('Error in parsing value') || 
          message.includes('Declaration dropped') ||
          message.includes('undefined')) {
        
        // Stack trace to find the component causing the issue
        const error = new Error('CSS Undefined Value Error');
        const stack = error.stack;
        
        console.group('🚨 CSS UNDEFINED ERROR DETECTED');
        console.error('Original error:', ...args);
        console.error('Stack trace:', stack);
        console.groupEnd();
        
        // Optionally throw in development to help debugging
        if (message.includes('undefined')) {
          console.warn('⚠️  CSS undefined value detected. Check your style objects for undefined properties.');
        }
      } else {
        // Call original console.error for non-CSS errors
        originalError(...args);
      }
    };

    // Cleanup function
    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}

/**
 * Hook to monitor for CSS undefined errors
 */
export function useCSSErrorMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Monitor for CSS-related errors in the console
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for inline styles with undefined values
              if (element.hasAttribute('style')) {
                const style = element.getAttribute('style');
                if (style && style.includes('undefined')) {
                  console.warn('🎨 CSS Warning: Element has undefined in style attribute:', element, style);
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}