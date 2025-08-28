'use client';

import { useState, useEffect } from 'react';
import EntranceScreen from './EntranceScreen';

interface EntranceManagerProps {
  children: React.ReactNode;
}

export default function EntranceManager({ children }: EntranceManagerProps) {
  const [showEntrance, setShowEntrance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has seen entrance screen in this session
    const hasSeenEntrance = sessionStorage.getItem('pv3-entrance-seen');
    
    if (!hasSeenEntrance) {
      setShowEntrance(true);
    }
    
    setIsLoading(false);
  }, []);

  const handleEntranceComplete = () => {
    // Mark entrance as seen for this session
    sessionStorage.setItem('pv3-entrance-seen', 'true');
    
    // Smooth fade out
    setShowEntrance(false);
  };

  // Don't render anything while checking session storage
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {showEntrance && (
        <EntranceScreen onComplete={handleEntranceComplete} />
      )}
      {/* Main app content with fade-in transition */}
      <div className={`transition-opacity duration-1000 ${
        showEntrance ? 'opacity-0' : 'opacity-100'
      }`}>
        {children}
      </div>
    </>
  );
} 