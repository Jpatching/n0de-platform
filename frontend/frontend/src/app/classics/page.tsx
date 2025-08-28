'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import WalletStatus from '@/components/WalletStatus';
import { usePV3 } from '@/hooks/usePV3';
import GameCard from '@/components/GameCard';

export default function ClassicsPage() {
  const router = useRouter();
  const { 
    connected, 
    balance,
    vaultBalance, 
    loading, 
    quickPlay, 
    gameTypes, 
    formatSOL 
  } = usePV3();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wagerAmount, setWagerAmount] = useState('0.1');

  // Game type ID mapping
  const gameTypeIds = {
    'coin-flip': 1,
    'rock-paper-scissors': 2,
    'dice-duel': 3,
    'number-guess': 4,
    'chess-blitz': 5
  };

  // Game definitions
  const games = [
    {
      id: gameTypes.COIN_FLIP,
      numericId: gameTypeIds[gameTypes.COIN_FLIP],
      title: 'Coin Flip',
      description: 'Call heads or tails - 50/50 odds',
      icon: '🪙',
      minWager: 0.1,
      maxWager: 10,
    },
    {
      id: gameTypes.ROCK_PAPER_SCISSORS,
      numericId: gameTypeIds[gameTypes.ROCK_PAPER_SCISSORS],
      title: 'Rock Paper Scissors',
      description: 'Beat your opponent in the timeless strategy game',
      icon: '✂️',
      minWager: 0.1,
      maxWager: 5,
    },
    {
      id: gameTypes.DICE_DUEL,
      numericId: gameTypeIds[gameTypes.DICE_DUEL],
      title: 'Dice Duel',
      description: 'Best of 3 rounds - roll higher to win each round',
      icon: '🎲',
      minWager: 0.1,
      maxWager: 15,
    },
  ];

  const handleQuickPlay = async (gameId: string) => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    // Navigate to the specific game page
    switch (gameId) {
      case gameTypes.COIN_FLIP:
        router.push('/games/coinflip');
        break;
      case gameTypes.ROCK_PAPER_SCISSORS:
        router.push('/games/rps');
        break;
      case gameTypes.DICE_DUEL:
        router.push('/games/dice-duel');
        break;
      default:
        alert(`${gameId} game page coming soon!`);
    }
  };

  // How Games Work as a slider/banner
  const howItWorksSlides = [
    {
      title: 'How Games Work',
      description: 'Play instantly, win instantly',
      icon: '⚡',
      gradient: 'from-green-500/20 to-emerald-600/20',
    },
    {
      title: 'How Games Work',
      description: 'Real opponents, real rewards',
      icon: '🏆',
      gradient: 'from-blue-500/20 to-cyan-600/20',
    },
    {
      title: 'How Games Work',
      description: 'Secure vaults, instant payouts',
      icon: '🔒',
      gradient: 'from-purple-500/20 to-pink-600/20',
    },
    {
      title: 'How Games Work',
      description: 'Full control—your funds never leave your vault',
      icon: '🏠',
      gradient: 'from-indigo-500/20 to-blue-600/20',
    },
    {
      title: 'Responsible Gaming',
      description: 'Play within your limits—gaming should always be fun',
      icon: '🛡️',
      gradient: 'from-emerald-500/20 to-teal-600/20',
    },
  ];
  const [howSlide, setHowSlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setHowSlide((prev) => (prev + 1) % howItWorksSlides.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="w-full">
            {/* Classic Games Header */}
            <div className="mb-2">
              <h1 className="text-3xl font-bold font-audiowide mb-1">🎯 Classic Games</h1>
              <p className="text-text-secondary font-inter mb-2">
                Pure skill meets pure chance - choose your battlefield
              </p>
            </div>

            {/* How Games Work as a slider/banner */}
            <div className="relative mb-6 overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${howSlide * 100}%)` }}
              >
                {howItWorksSlides.map((slide, idx) => (
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
                {howItWorksSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHowSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === howSlide
                        ? 'bg-accent-primary'
                        : 'bg-text-muted hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Classic Games Grid - matching home page layout exactly with 5 columns */}
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    name={game.title}
                    emoji={game.icon}
                    gradient={
                      game.title === 'Coin Flip' ? 'from-yellow-500 to-orange-600' :
                      game.title === 'Rock Paper Scissors' ? 'from-blue-500 to-purple-600' :
                      game.title === 'Dice Roll' ? 'from-red-500 to-pink-600' :
                      'from-gray-700 to-gray-900'
                    }
                    coverVideo={
                      game.title === 'Coin Flip' ? '/game-covers/coinflip.mp4' :
                      game.title === 'Rock Paper Scissors' ? '/game-covers/rps.mp4' :
                      game.title === 'Dice Roll' ? '/game-covers/dice.mp4' :
                      undefined
                    }
                    coverImage={
                      undefined
                    }
                    minWager={`Min: ${game.minWager} SOL`}
                    description={game.description}
                    wagerRange={`Wager: ${game.minWager} - ${game.maxWager} SOL`}
                    onPlay={() => handleQuickPlay(game.id)}
                    isConnected={connected}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 