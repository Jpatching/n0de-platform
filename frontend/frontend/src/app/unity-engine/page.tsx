'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import WalletStatus from '@/components/WalletStatus';
import { usePV3 } from '@/hooks/usePV3';
import Image from 'next/image';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function UnityEnginePage() {
  const router = useRouter();
  const { 
    connected, 
    balance,
    vaultBalance, 
    loading, 
    formatSOL 
  } = usePV3();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Unity games (coming soon)
  const unityGames = [
    {
      id: 'racing',
      title: '3D Racing Championship',
      description: 'High-speed racing with realistic physics and stunning graphics',
      icon: '🏎️',
      gradient: 'from-red-500 to-orange-600',
      status: 'Coming Soon',
      features: ['Realistic physics', '3D graphics', 'Multiplayer races', 'Custom vehicles'],
      minWager: '0.5 SOL',
      maxWager: '25 SOL'
    },
    {
      id: 'fighting',
      title: 'Combat Arena 3D',
      description: 'Intense fighting game with skill-based combat mechanics',
      icon: '🥊',
      gradient: 'from-purple-500 to-pink-600',
      status: 'In Development',
      features: ['Skill-based combat', 'Character customization', 'Tournament mode', 'Real-time battles'],
      minWager: '1 SOL',
      maxWager: '50 SOL'
    },
    {
      id: 'sports',
      title: 'Virtual Sports League',
      description: 'Multiple sports games with competitive leagues and rankings',
      icon: '⚽',
      gradient: 'from-green-500 to-teal-600',
      status: 'Planning',
      features: ['Multiple sports', 'League system', 'Team management', 'Season tournaments'],
      minWager: '0.3 SOL',
      maxWager: '20 SOL'
    },
    {
      id: 'adventure',
      title: 'Treasure Quest 3D',
      description: 'Adventure game with treasure hunting and strategic gameplay',
      icon: '🗺️',
      gradient: 'from-yellow-500 to-amber-600',
      status: 'Concept',
      features: ['Adventure quests', 'Treasure hunting', 'Strategic gameplay', 'Exploration'],
      minWager: '0.2 SOL',
      maxWager: '15 SOL'
    },
  ];

  // Unity Engine info slider
  const unitySlides = [
    {
      title: 'Next-Gen Gaming',
      description: 'High-quality 3D games powered by Unity Engine technology',
      icon: '🚀',
      gradient: 'from-purple-500/20 to-pink-600/20',
    },
    {
      title: 'Realistic Physics',
      description: 'Advanced physics simulation for immersive gameplay experiences',
      icon: '🌪️',
      gradient: 'from-blue-500/20 to-cyan-600/20',
    },
    {
      title: 'Stunning Graphics',
      description: 'Beautiful 3D graphics and visual effects that bring games to life',
      icon: '✨',
      gradient: 'from-yellow-500/20 to-orange-600/20',
    },
    {
      title: 'Competitive Gaming',
      description: 'Skill-based gameplay with fair matchmaking and anti-cheat protection',
      icon: '🏆',
      gradient: 'from-green-500/20 to-emerald-600/20',
    },
    {
      title: 'Coming Soon',
      description: 'Revolutionary gaming experiences are in development - stay tuned!',
      icon: '⏳',
      gradient: 'from-indigo-500/20 to-purple-600/20',
    },
  ];

  const [unitySlide, setUnitySlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setUnitySlide((prev) => (prev + 1) % unitySlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="w-full">
            {/* Unity Engine Header */}
            <div className="mb-2">
              <div className="flex items-center space-x-4 mb-4">
                <OptimizedImage src="/logos/unity.png" alt="Unity Engine" width={48} height={48} />
                <h1 className="text-3xl font-bold font-audiowide mb-1">Unity Engine Games</h1>
              </div>
              <p className="text-text-secondary font-inter mb-2">
                Next-generation 3D gaming experiences with cutting-edge technology
              </p>
            </div>

            {/* Unity Engine info slider */}
            <div className="relative mb-6 overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${unitySlide * 100}%)` }}
              >
                {unitySlides.map((slide, idx) => (
                  <div
                    key={idx}
                    className={`w-full flex-shrink-0 glass-card p-8 bg-gradient-to-r ${slide.gradient}`}
                  >
                    <div className="flex items-center">
                      <div className="flex-1 flex items-center">
                        <span className="text-5xl mr-6">{slide.icon}</span>
                        <div>
                          <h2 className="text-2xl font-bold text-text-primary mb-2 font-audiowide uppercase">
                            {slide.title}
                          </h2>
                          <p className="text-text-secondary text-xl font-inter">
                            {slide.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {unitySlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUnitySlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === unitySlide
                        ? 'bg-accent-primary'
                        : 'bg-text-muted hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Development Status Notice */}
            <div className="mb-6 glass-card p-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20">
              <div className="flex items-center">
                <div className="mr-4">
                  <OptimizedImage src="/logos/unity.png" alt="Unity" width={48} height={48} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-audiowide mb-2 text-text-primary">
                    Unity Games in Development
                  </h3>
                  <p className="text-text-secondary font-inter">
                    Our team is working hard to bring you the most advanced 3D gaming experiences on Web3. 
                    These games will feature cutting-edge graphics, realistic physics, and competitive gameplay 
                    with the same secure, non-custodial architecture you love.
                  </p>
                </div>
              </div>
            </div>

            {/* Unity Games Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {unityGames.map((game) => (
                  <div
                    key={game.id}
                    className="glass-card p-6 rounded-xl transition-all duration-300 group relative overflow-hidden"
                  >
                    {/* Unity Logo Badge - Top Left */}
                    <div className="absolute top-4 left-4 z-20">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
                        <OptimizedImage src="/logos/unity.png" alt="Unity" width={20} height={20} />
                      </div>
                    </div>

                    {/* Status Badge - Top Right */}
                    <div className="absolute top-4 right-4 z-10">
                      <div className={`text-xs px-2 py-1 rounded font-semibold ${
                        game.status === 'Coming Soon' ? 'bg-green-500/20 text-green-400' :
                        game.status === 'In Development' ? 'bg-yellow-500/20 text-yellow-400' :
                        game.status === 'Planning' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {game.status}
                      </div>
                    </div>

                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${game.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-2xl">{game.icon}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold font-audiowide mb-2 text-text-primary">
                      {game.title}
                    </h3>
                    
                    <p className="text-text-secondary text-sm mb-4 font-inter">
                      {game.description}
                    </p>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="text-xs text-text-muted font-inter font-semibold mb-1">
                          Features:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {game.features.map((feature, idx) => (
                            <span key={idx} className="text-xs bg-bg-elevated px-2 py-1 rounded text-text-secondary">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-text-muted font-inter font-semibold mb-1">
                          Planned Wager Range:
                        </div>
                        <div className="text-sm text-accent-primary font-semibold">
                          {game.minWager} - {game.maxWager}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`w-full py-2 px-4 rounded-lg bg-gradient-to-r ${game.gradient} opacity-50 text-white text-center font-audiowide text-sm cursor-not-allowed`}>
                      {game.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unity Engine Features */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🎮</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">3D Graphics</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Stunning visual effects and realistic 3D environments
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Real-Time Physics</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Advanced physics simulation for realistic gameplay
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Competitive Play</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Skill-based matchmaking with anti-cheat protection
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Secure Gaming</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Same non-custodial security as our classic games
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
