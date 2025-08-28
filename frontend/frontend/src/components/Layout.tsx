'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePV3 } from '@/hooks/usePV3';
import { useNavigationPersistence } from '@/hooks/useSessionPersistence';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import PageHeader from './PageHeader';
import WalletStatus from './WalletStatus';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  title?: string;
  subtitle?: string;
  showWalletStatus?: boolean;
}

interface NavigationState {
  lastVisitedPage: string;
  sidebarState: boolean;
  preferredGameFilters: Record<string, any>;
}

export default function Layout({ 
  children, 
  currentPage, 
  title, 
  subtitle,
  showWalletStatus = true 
}: LayoutProps) {
  const { connected } = useWallet();
  const { balance, formatSOL } = usePV3();
  const { user, isSessionValid } = useAuth();
  
  // Use session persistence for navigation state
  const { value: navState, setValue: setNavState } = useNavigationPersistence();
  const typedNavState = navState as NavigationState;
  const [sidebarOpen, setSidebarOpen] = useState(typedNavState?.sidebarState || false);

  // Update navigation state when sidebar changes
  useEffect(() => {
    if (typedNavState && isSessionValid) {
      setNavState({
        ...typedNavState,
        sidebarState: sidebarOpen,
        lastVisitedPage: currentPage,
      });
    }
  }, [sidebarOpen, currentPage, setNavState, isSessionValid]);

  // Initialize sidebar state from persisted data
  useEffect(() => {
    if (typedNavState?.sidebarState !== undefined && isSessionValid) {
      setSidebarOpen(typedNavState.sidebarState);
    }
  }, [typedNavState?.sidebarState, isSessionValid]);

  // Handle sidebar toggle with persistence
  const handleSidebarToggle = () => {
    setSidebarOpen((prev: boolean) => !prev);
  };

  // Show session status in development
  const showSessionDebug = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-bg-main flex font-inter">
      {/* Session Debug Info (Development Only) */}
      {showSessionDebug && user && (
        <div className="fixed top-2 right-2 z-50 bg-black/80 text-white text-xs p-2 rounded">
          <div>User: {user.username || user.displayName}</div>
          <div>Session: {isSessionValid ? '✅' : '❌'}</div>
          <div>Page: {currentPage}</div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <PageHeader onMenuClick={handleSidebarToggle} />

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Page Header */}
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-4xl font-bold text-text-primary mb-2 font-audiowide uppercase">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-text-secondary text-lg font-inter">{subtitle}</p>
              )}
            </div>
          )}

          {/* Wallet Status */}
          {showWalletStatus && (
            <WalletStatus 
              connected={connected}
              balance={balance}
              formatSOL={formatSOL}
            />
          )}

          {/* Session Recovery Notice */}
          {user && isSessionValid && typedNavState?.lastVisitedPage && 
           typedNavState.lastVisitedPage !== currentPage && 
           typedNavState.lastVisitedPage !== '/' && (
            <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 Welcome back! Your session has been restored. 
                <a 
                  href={typedNavState.lastVisitedPage} 
                  className="underline hover:text-blue-200 ml-1"
                >
                  Return to {typedNavState.lastVisitedPage}
                </a>
              </p>
            </div>
          )}

          {/* Page Content */}
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
} 