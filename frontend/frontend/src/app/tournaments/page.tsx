'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';

export default function TournamentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="text-8xl mb-8">🏆</div>
            <h1 className="text-6xl font-bold text-text-primary mb-4 font-audiowide uppercase">Tournaments</h1>
            <p className="text-2xl text-text-secondary mb-12 font-inter">Compete against the best and claim victory</p>
            
            <div className="glass-card p-12 mb-8">
              <h2 className="text-3xl font-bold text-accent-primary mb-6 font-audiowide">Coming Soon</h2>
              <p className="text-lg text-text-secondary mb-6 font-inter">
                Multi-player tournaments with prize pools, brackets, and leaderboards. Weekly and monthly competitions await.
              </p>
              <div className="text-text-muted font-inter">
                Tournament system is under development.
              </div>
            </div>

            <Link href="/" className="text-accent-secondary hover:text-accent-primary transition-colors font-audiowide">
              ← Back to Home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
} 