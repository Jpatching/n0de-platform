'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import CommandPalette from '@/components/CommandPalette';
import SharedHeader from '@/components/SharedHeader';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthErrorBoundary from '@/components/AuthErrorBoundary';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const pathname = usePathname();

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

  return (
    <AuthErrorBoundary>
      <AuthProvider>
        {showSharedHeader && (
          <SharedHeader 
            showAuthModal={showAuthModal}
            setShowAuthModal={setShowAuthModal}
            authMode={authMode}
            setAuthMode={setAuthMode}
          />
        )}
        
        {/* Add top padding when header is shown */}
        <div className={showSharedHeader ? 'pt-16' : ''}>
          {children}
        </div>
        
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </AuthProvider>
    </AuthErrorBoundary>
  );
}