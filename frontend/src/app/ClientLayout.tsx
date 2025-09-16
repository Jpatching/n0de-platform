'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import CommandPalette from '@/components/CommandPalette';
import SharedHeader from '@/components/SharedHeader';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthErrorBoundary from '@/components/AuthErrorBoundary';
import ComprehensiveErrorBoundary from '@/components/ComprehensiveErrorBoundary';
import HydrationBoundary from '@/components/HydrationBoundary';
import '../lib/css-error-monitor'; // Initialize CSS error monitoring
import { initializeCSSValidation } from '@/lib/css-utils';
import InteractiveBackground from '@/components/InteractiveBackground';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const pathname = usePathname();

  // Initialize CSS validation on mount
  useEffect(() => {
    initializeCSSValidation();
  }, []);

  // Command palette hotkey (Cmd/Ctrl + K)
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setIsCommandPaletteOpen(true);
  });

  // Also listen for Cmd/Ctrl + / for help
  useHotkeys('mod+/', (e) => {
    e.preventDefault();
    setIsCommandPaletteOpen(true);
  });

  // Don't show header on home page (it has its own)
  const showSharedHeader = pathname !== '/';
  const showHomeBackground = pathname === '/';

  return (
    <ComprehensiveErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <HydrationBoundary>
        <AuthErrorBoundary>
          <AuthProvider>
            {showHomeBackground && (
              <InteractiveBackground />
            )}
            {showSharedHeader && (
              <SharedHeader 
                showAuthModal={showAuthModal}
                setShowAuthModal={setShowAuthModal}
                authMode={authMode}
                setAuthMode={setAuthMode}
              />
            )}
            
            {/* Add top padding when header is shown */}
            <div className={(showSharedHeader ? 'pt-16 ' : '') + 'relative z-10'}>
              {children}
            </div>
            
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
            />
          </AuthProvider>
        </AuthErrorBoundary>
      </HydrationBoundary>
    </ComprehensiveErrorBoundary>
  );
}