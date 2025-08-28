'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import AuthStatus from '@/components/AuthStatus';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import GameCard from '@/components/GameCard';

// 🚀 PHASE 2: Dynamic imports for code splitting
// Heavy components are loaded only when needed
const OptimizedVideo = dynamic(() => import('@/components/ui/OptimizedVideo'), {
  loading: () => <div className="w-full h-full bg-gray-800 animate-pulse" />,
  ssr: false
});

// 🚀 PHASE 3: Instant game loading system
const InstantGameLoader = dynamic(() => import('@/components/InstantGameLoader'), {
  ssr: false
});

// Smart preloading system
const SmartPreloader = dynamic(() => import('@/components/SmartPreloader'), {
  ssr: false
});

// Game-specific loading component for better UX
const GameLoadingFallback = ({ gameName }: { gameName?: string }) => (
  <div className="aspect-[5/8] bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="text-4xl mb-2">🎮</div>
      {gameName && <div className="text-xs text-gray-400">Loading {gameName}...</div>}
    </div>
  </div>
);

export default function GamesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { 
    balance,
    vaultBalance, 
    loading, 
    quickPlay, 
    gameTypes, 
    formatSOL 
  } = usePV3();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Trending/Featured games
  const trendingGames = [
    {
      id: gameTypes.COIN_FLIP,
      title: 'Coin Flip',
      description: 'Most popular - 50/50 odds with instant payouts',
      icon: '🪙',
      minWager: 0.1,
      maxWager: 10,
      gradient: 'from-yellow-500 to-orange-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/coinflip.mp4',
      route: '/games/coinflip'
    },
    {
      id: gameTypes.CHESS_BLITZ,
      title: 'Chess Blitz',
      description: 'Strategic gameplay - prove your chess mastery',
      icon: '♟️',
      minWager: 0.2,
      maxWager: 20,
      gradient: 'from-purple-500 to-indigo-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/chess.mp4',
      route: '/games/chess'
    },
    {
      id: 'crash',
      title: 'Crash',
      description: 'Multiplier crash game - cash out before the crash!',
      icon: '💥',
      minWager: 0.1,
      maxWager: 20,
      gradient: 'from-orange-500 to-red-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/crash.mp4',
      route: '/games/crash'
    },
  ];

  // Classic games
  const classicGames = [
    {
      id: 'coinflip',
      title: 'Coin Flip',
      description: 'Classic heads or tails - pure 50/50 chance with instant results',
      icon: '🪙',
      minWager: 0.1,
      maxWager: 10,
      gradient: 'from-yellow-500 to-orange-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/coinflip.mp4',
      route: '/games/coinflip'
    },
    {
      id: gameTypes.ROCK_PAPER_SCISSORS,
      title: 'Rock Paper Scissors',
      description: 'Beat your opponent in the timeless strategy game',
      icon: '✂️',
      minWager: 0.1,
      maxWager: 5,
      gradient: 'from-blue-500 to-purple-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/rps.mp4',
      route: '/games/rps'
    },
    {
      id: gameTypes.DICE_DUEL,
      title: 'Dice Duel',
      description: 'Advanced 3D dice rolling - first to 3 wins in best of 5',
      icon: '🎲',
      minWager: 0.1,
      maxWager: 15,
      gradient: 'from-red-500 to-pink-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/dice.mp4',
      route: '/games/dice-duel'
    },
    {
      id: gameTypes.CHESS_BLITZ,
      title: 'Chess Blitz',
      description: 'Strategic gameplay - prove your chess mastery',
      icon: '♟️',
      minWager: 0.2,
      maxWager: 20,
      gradient: 'from-purple-500 to-indigo-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/chess.mp4',
      route: '/games/chess'
    },
    {
      id: 'crash',
      title: 'Crash',
      description: 'Multiplier crash game - cash out before the crash!',
      icon: '💥',
      minWager: 0.1,
      maxWager: 20,
      gradient: 'from-orange-500 to-red-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/crash.mp4',
      route: '/games/crash'
    },
    {
      id: 'mines',
      title: 'Mines',
      description: 'Find safe tiles while avoiding hidden mines - first to 3 wins!',
      icon: '💣',
      minWager: 0.1,
      maxWager: 15,
      gradient: 'from-gray-500 to-slate-600',
      // coverVideo: '/game-covers/mines.mp4', // Temporarily disabled - video not created yet
      route: '/games/mines'
    },
    {
      id: 'math-duel',
      title: 'Math Duel',
      description: 'Fast-paced mathematical battles against opponents',
      icon: '🧮',
      minWager: 0.1,
      maxWager: 10,
      gradient: 'from-green-500 to-blue-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/math-duel.mp4',
      route: '/games/math-duel'
    },
    {
      id: 'mirror-move',
      title: 'Mirror Move',
      description: 'Copy the pattern sequence perfectly to win',
      icon: '🪞',
      minWager: 0.1,
      maxWager: 15,
      gradient: 'from-purple-500 to-pink-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/mirror-move.mp4',
      route: '/games/mirror-move'
    },
    {
      id: 'reaction-ring',
      title: 'Reaction Ring',
      description: 'Lightning-fast reflexes determine the winner',
      icon: '⚡',
      minWager: 0.1,
      maxWager: 8,
      gradient: 'from-yellow-500 to-orange-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/reaction-ring.gif',
      route: '/games/reaction-ring'
    },
    {
      id: 'mind-stab',
      title: 'Mind Stab',
      description: 'Psychological strategy game of prediction and deception',
      icon: '🧠',
      minWager: 0.2,
      maxWager: 25,
      gradient: 'from-indigo-500 to-purple-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/mind-stab.mp4',
      route: '/games/mind-stab'
    },
    {
      id: 'the-shipment',
      title: 'The Shipment',
      description: 'Strategic cargo management with time pressure',
      icon: '📦',
      minWager: 0.5,
      maxWager: 30,
      gradient: 'from-blue-500 to-cyan-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/the-shipment.mp4',
      route: '/games/the-shipment'
    },
  ];

  // Degen Arena - High-risk crypto trading games
  const degenArenaGames = [
    {
      id: 'pump-wars',
      title: 'Pump Wars',
      description: 'Bet on crypto price movements with real-time Jupiter API data',
      icon: '🚀',
      minWager: 0.1,
      maxWager: 100,
      gradient: 'from-purple-500 to-pink-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/pump-wars.mp4',
      route: '/games/pump-wars'
    },
    {
      id: 'battle-royale',
      title: 'Battle Royale',
      description: '4 tokens, 100 players, 1 winner - ultimate memecoin battle arena',
      icon: '👑',
      minWager: 1.0,
      maxWager: 10,
      gradient: 'from-yellow-500 to-orange-600',
      coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/battle-royale.mp4',
      route: '/games/battle-royale'
    },
    // Future Degen Arena games will be added here
  ];



  const handleGamePlay = (gameTitle: string) => {
    if (!isAuthenticated) {
      alert('Please sign in first');
      return;
    }

    // Navigate to the specific game page
    const game = [...classicGames, ...trendingGames, ...degenArenaGames].find(g => g.title === gameTitle);
    if (game && game.route) {
      router.push(game.route);
    } else {
      alert(`${gameTitle} coming soon!`);
    }
  };



  // Tournaments & High Stakes banner slides
  const competitiveSlides = [
    {
      title: 'Tournaments',
      description: 'Compete in brackets with ELO ratings and automated prize distribution',
      icon: '🏆',
      gradient: 'from-yellow-500/20 to-orange-600/20',
      buttonText: 'Join Tournaments',
      route: '/tournaments'
    },
    {
      title: 'High Stakes',
      description: 'Premium games for serious players with higher limits and exclusive features',
      icon: '💎',
      gradient: 'from-emerald-500/20 to-teal-600/20',
      buttonText: 'Enter High Stakes',
      route: '/high-stakes'
    },
  ];

  const [competitiveSlide, setCompetitiveSlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCompetitiveSlide((prev) => (prev + 1) % competitiveSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Add debug logging
  console.log('🎮 Games page loaded, video paths:');
  const games = [...classicGames, ...trendingGames, ...degenArenaGames].forEach(game => {
    if (game.coverVideo) {
      console.log(`${game.title}: ${game.coverVideo}`);
    }
  });

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* 🚀 PHASE 3: Instant Game Loading System */}
      <InstantGameLoader currentGame="games-page">
        
        {/* 🚀 PHASE 2: Smart Preloading System */}
        <SmartPreloader 
          currentGame="games-page"
          userBehavior={{
            recentGames: ['coinflip', 'crash', 'chess'],
            favoriteGames: ['coinflip', 'chess'],
            sessionTime: Date.now()
          }}
        />
        
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="w-full">
            {/* Games Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold font-audiowide mb-1">🎮 All Games</h1>
              <p className="text-text-secondary font-inter mb-2">
                Discover your perfect gaming experience - from classics to cutting-edge
              </p>
            </div>

            {/* Auth Status */}
            <AuthStatus />

            {/* Not Connected Warning */}
            {!isAuthenticated && (
              <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-500 font-audiowide">Sign In Required</h3>
                    <p className="text-text-secondary font-inter">
                      Sign in to start playing games and earning SOL rewards
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trending Games Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold font-audiowide mb-4 text-accent-primary">🔥 Trending Games</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {trendingGames.map((game) => (
                  <Suspense key={game.id} fallback={<GameLoadingFallback gameName={game.title} />}>
                    <GameCard
                      name={game.title}
                      emoji={game.icon}
                      gradient={game.gradient}
                      coverVideo={game.coverVideo}
                      minWager={`Min: ${game.minWager} SOL`}
                      description={game.description}
                      wagerRange={`Wager: ${game.minWager} - ${game.maxWager} SOL`}
                      onPlay={() => handleGamePlay(game.title)}
                      isConnected={isAuthenticated}
                    />
                  </Suspense>
                ))}
              </div>
            </div>

            {/* Classic Games Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold font-audiowide mb-4">🎯 Classic Games</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {classicGames.map((game) => (
                  <GameCard
                    key={game.id}
                    name={game.title}
                    emoji={game.icon}
                    gradient={game.gradient}
                    coverVideo={game.coverVideo}
                    minWager={`Min: ${game.minWager} SOL`}
                    description={game.description}
                    wagerRange={`Wager: ${game.minWager} - ${game.maxWager} SOL`}
                    onPlay={() => handleGamePlay(game.title)}
                    isConnected={isAuthenticated}
                  />
                ))}
              </div>
            </div>

            {/* Degen Arena Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold font-audiowide text-purple-400">🏟️ DEGEN ARENA</h2>
                <span className="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-semibold">
                  High Risk • High Reward
                </span>
              </div>
              <p className="text-text-secondary text-sm mb-4 font-inter">
                Extreme market-based gambling with real crypto data - for the fearless traders only
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {degenArenaGames.map((game) => (
                  <GameCard
                    key={game.id}
                    name={game.title}
                    emoji={game.icon}
                    gradient={game.gradient}
                    coverVideo={game.coverVideo}
                    minWager={`Min: ${game.minWager} SOL`}
                    description={game.description}
                    wagerRange={`Wager: ${game.minWager} - ${game.maxWager} SOL`}
                    onPlay={() => handleGamePlay(game.title)}
                    isConnected={isAuthenticated}
                  />
                ))}
              </div>
            </div>



            {/* Tournaments & High Stakes Banner */}
            <div className="relative mb-8 overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${competitiveSlide * 100}%)` }}
              >
                {competitiveSlides.map((slide, idx) => (
                  <div
                    key={idx}
                    className={`w-full flex-shrink-0 glass-card p-8 bg-gradient-to-r ${slide.gradient}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center">
                        <span className="text-6xl mr-6">{slide.icon}</span>
                        <div>
                          <h2 className="text-3xl font-bold text-text-primary mb-2 font-audiowide uppercase">
                            {slide.title}
                          </h2>
                          <p className="text-text-secondary text-xl font-inter mb-4">
                            {slide.description}
                          </p>
                        </div>
                      </div>
                      <div className="ml-6">
                        <button
                          onClick={() => router.push(slide.route)}
                          className="bg-accent-primary hover:bg-accent-secondary text-black px-8 py-3 rounded-lg font-audiowide font-bold text-lg transition-all duration-300 hover:scale-105"
                        >
                          {slide.buttonText}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {competitiveSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCompetitiveSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === competitiveSlide
                        ? 'bg-accent-primary'
                        : 'bg-text-muted hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Instant Payouts</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Win and get paid immediately with cryptographic verification
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Non-Custodial</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Your funds stay in your vault - we never hold your money
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🛡️</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Anti-Cheat</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Advanced detection systems ensure fair play for everyone
                </p>
              </div>
            </div>
          </div>
        </main>
        </div>
        
      </InstantGameLoader>
    </div>
  );
} 