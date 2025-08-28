'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import { useReferral } from '@/hooks/useReferral';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import AuthStatus from '@/components/AuthStatus';
import GameCard from '@/components/GameCard';
import StatsCard from '@/components/StatsCard';
import { useRouter } from 'next/navigation';
import WalletStatus from '@/components/WalletStatus';
import { BridgeButton } from '@/components/Bridge/BridgeButton';
import { BridgeModal } from '@/components/Bridge/BridgeModal';
import VaultManager from '@/components/VaultManager';
import MatrixRain from '@/components/MatrixRain';
import RecentWins from '@/components/RecentWins';
import RecentWinBanner from '@/components/RecentWinBanner';
import PlatformNews from '@/components/PlatformNews';
import SafetyBanner from '@/components/SafetyBanner';
import GameScrollSection from '@/components/GameScrollSection';

export default function HomePage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const {
    balance,
    loading,
    matches,
    gameStats,
    gameTypes,
    joinGame,
    formatSOL,
  } = usePV3();
  
  // 🎯 REFERRAL SYSTEM - Automatically detect referral codes from URLs
  const { referralCode, hasReferralCode } = useReferral();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const [showVaultManager, setShowVaultManager] = useState(false);
  const [vaultActiveTab, setVaultActiveTab] = useState<'deposit' | 'withdraw' | 'bridge' | 'fiat'>('deposit');
  const router = useRouter();

  // Game type ID mapping (numeric to string)
  const gameTypeIds = {
    COIN_FLIP: 1,
    ROCK_PAPER_SCISSORS: 2,
    DICE_DUEL: 3,
    NUMBER_GUESS: 4,
    CHESS_BLITZ: 5
  };

  const promotionalSlides = [
    {
      title: "💳 Coinbase Pay Integration",
      description: "Buy SOL instantly with your credit card. Powered by Coinbase Commerce for enterprise-grade security and instant gaming.",
      buttonText: "Buy SOL Now", 
      prizeAmount: "Instant",
      prizeLabel: "SOL Delivery",
      gradient: "from-green-500/20 to-blue-600/20"
    },
    {
      title: "🌉 Multi-Chain Bridge Live",
      description: "Deposit from any blockchain instantly. Powered by Wormhole technology for seamless cross-chain gaming.",
      buttonText: "Bridge Now", 
      prizeAmount: "Any Chain",
      prizeLabel: "Instant Access",
      gradient: "from-blue-500/20 to-purple-600/20"
    },
    {
      title: "🔒 Your Vault, Your Rules",
      description: "Funds locked to you—no middlemen, no risks. Play safe, play free.",
      buttonText: "Learn Security", 
      prizeAmount: "100%",
      prizeLabel: "Your Control",
      gradient: "from-green-500/20 to-emerald-600/20"
    },
    {
      title: "🛡️ Trustless Fair Play",
      description: "Every move, every win—provably fair. Outsmart rivals, not the system.",
      buttonText: "See Anti-Cheat",
      prizeAmount: "0%", 
      prizeLabel: "Cheat Rate",
      gradient: "from-blue-500/20 to-cyan-600/20"
    },
    {
      title: "💸 Rewards on Autopilot",
      description: "Bring friends, earn forever. Your network, your passive income.",
      buttonText: "Get Referral Code",
      prizeAmount: "Ongoing",
      prizeLabel: "Rewards", 
      gradient: "from-purple-500/20 to-pink-600/20"
    },
    {
      title: "🌐 Web2 Smooth, Web3 Strong",
      description: "Lightning-fast games, ironclad security. The future of gaming is now.",
      buttonText: "How It Works",
      prizeAmount: "Next-Gen",
      prizeLabel: "User Experience",
      gradient: "from-indigo-500/20 to-blue-600/20"
    },
    {
      title: "🛡️ Responsible Gaming",
      description: "Set limits, play smart, stay in control. Your wellbeing is our priority.",
      buttonText: "Manage Bankroll",
      prizeAmount: "Safe",
      prizeLabel: "Gaming",
      gradient: "from-emerald-500/20 to-teal-600/20"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promotionalSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [promotionalSlides.length]);

  const handleGameSelect = (gameName: string) => {
    if (!isAuthenticated) {
      alert('Please connect your wallet first!');
      return;
    }
    
    // Navigate to specific game lobbies
    switch (gameName) {
      case 'PUMP WARS':
        router.push('/games/pump-wars');
        break;
      case 'CHESS BLITZ 1v1':
      router.push('/games/chess');
        break;
      case 'COIN FLIP':
        router.push('/games/coinflip');
        break;
      case 'CRASH':
        router.push('/games/crash');
        break;
      case 'DICE ROLL':
        router.push('/games/dice-duel');
        break;
      case 'ROCK PAPER SCISSORS':
        router.push('/games/rps');
        break;
      case 'THE SHIPMENT':
        router.push('/games/realtime-html5');
        break;
      default:
        // For games not yet implemented
        alert(`${gameName} lobby coming soon! (Smart contract integration in progress)`);
        break;
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    try {
      await joinGame(matchId);
      alert('Successfully joined the match! Game starting...');
    } catch (error) {
      alert(`Failed to join match: ${error}`);
    }
  };

  const handleSlideButtonClick = (buttonText: string) => {
    switch (buttonText) {
      case 'Bridge Now':
        if (!isAuthenticated) {
          alert('Please connect your wallet first!');
          return;
        }
        setShowBridgeModal(true);
        break;
      case 'Manage Bankroll':
        router.push('/bankroll');
        break;
      case 'Get Referral Code':
        router.push('/partnership');
        break;
      case 'Learn Security':
      case 'See Anti-Cheat':
      case 'How It Works':
        // These could link to specific sections or help pages
        alert('Feature coming soon!');
        break;
      case 'Buy SOL Now':
        setVaultActiveTab('fiat');
        setShowVaultManager(true);
        break;
      default:
        break;
    }
  };

  const handleBridgeSuccess = (amount: string) => {
    setShowBridgeModal(false);
    // Could add additional success handling here
  };

  return (
    <div className="min-h-screen bg-bg-primary relative">
      <MatrixRain />
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen relative z-10">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div>
            {/* Recent Win Banner */}
            <RecentWinBanner />
            
            {/* Hero Carousel */}
            <div className="relative mb-8 overflow-hidden rounded-xl">
              {/* Enhanced carousel with progressive reveal */}
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {promotionalSlides.map((slide, index) => {
                  const isActive = index === currentSlide;
                  return (
                  <div 
                    key={index}
                      className={`w-full flex-shrink-0 glass-card p-8 bg-gradient-to-r ${slide.gradient} relative overflow-hidden`}
                    >
                      {/* Enhanced background gradient animation */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-20 transition-all duration-1000 ease-out ${
                          isActive ? 'scale-110 opacity-30' : 'scale-100 opacity-20'
                        }`}
                        style={{ 
                          filter: isActive ? 'blur(20px)' : 'blur(0px)',
                          transitionDelay: '0ms'
                        }}
                      />
                      
                      {/* Matrix Rain Layer - Between background and content */}
                      <div className="absolute inset-0 overflow-hidden">
                        <MatrixRain className={`w-full h-full transition-opacity duration-1000 ${
                          isActive ? 'opacity-20' : 'opacity-10'
                        }`} />
                      </div>
                      
                      {/* Subtle glow overlay */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-transparent transition-all duration-800 ease-out ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ transitionDelay: '100ms' }}
                      />
                      
                      {/* Content overlay to ensure readability */}
                      <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />
                      
                      <div className="flex items-center justify-between relative z-10">
                      <div className="flex-1">
                          {/* Progressive reveal: Title */}
                          <h1 className={`text-4xl font-bold text-text-primary mb-2 font-audiowide uppercase
                            transform transition-all duration-600 ease-out
                            ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}
                          `} 
                          style={{ transitionDelay: isActive ? '100ms' : '0ms' }}>
                          {slide.title}
                        </h1>
                          
                          {/* Progressive reveal: Description */}
                          <p className={`text-text-secondary text-lg mb-6 font-inter leading-relaxed
                            transform transition-all duration-600 ease-out
                            ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}
                          `} 
                          style={{ transitionDelay: isActive ? '250ms' : '0ms' }}>
                          {slide.description}
                        </p>
                          
                          {/* Progressive reveal: CTA Button with enhanced glow */}
                        <button 
                          onClick={() => handleSlideButtonClick(slide.buttonText)}
                            className={`primary-button font-audiowide uppercase relative overflow-hidden
                              transform transition-all duration-600 ease-out
                              ${isActive ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'}
                              ${isActive ? 'animate-pulse-glow shadow-lg shadow-accent-primary/30' : ''}
                            `}
                            style={{ transitionDelay: isActive ? '500ms' : '0ms' }}
                          >
                            {/* Button glow effect */}
                            <div className={`absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-lg transition-all duration-500 ${
                              isActive ? 'opacity-100' : 'opacity-0'
                            }`} 
                            style={{ transitionDelay: isActive ? '600ms' : '0ms' }} />
                            <span className="relative z-10">{slide.buttonText}</span>
                        </button>
                        </div>
                        
                        <div className="text-right ml-8">
                          {/* Progressive reveal: Prize Amount with enhanced glow */}
                          <div className={`text-6xl font-bold text-accent-primary font-audiowide relative
                            transform transition-all duration-700 ease-out
                            ${isActive ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90'}
                            ${isActive ? 'drop-shadow-lg' : ''}
                          `} 
                          style={{ 
                            transitionDelay: isActive ? '350ms' : '0ms',
                            filter: isActive ? 'drop-shadow(0 0 20px rgb(var(--accent-primary) / 0.3))' : 'none'
                          }}>
                            {/* Prize amount glow background */}
                            <div className={`absolute inset-0 bg-accent-primary/10 rounded-lg blur-xl transition-all duration-700 ${
                              isActive ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                            }`} 
                            style={{ transitionDelay: isActive ? '400ms' : '0ms' }} />
                            <span className="relative z-10">{slide.prizeAmount}</span>
                          </div>
                          
                          {/* Progressive reveal: Prize Label */}
                          <div className={`text-text-secondary font-inter mt-2
                            transform transition-all duration-500 ease-out
                            ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                          `} 
                          style={{ transitionDelay: isActive ? '450ms' : '0ms' }}>
                          {slide.prizeLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Enhanced navigation dots */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {promotionalSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 relative overflow-hidden ${
                      index === currentSlide 
                        ? 'bg-accent-primary scale-125 shadow-lg shadow-accent-primary/50' 
                        : 'bg-text-muted hover:bg-text-secondary hover:scale-110'
                    }`}
                  >
                    {/* Active dot glow effect */}
                    {index === currentSlide && (
                      <div className="absolute inset-0 bg-accent-primary rounded-full animate-pulse opacity-50" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard
                label="Active Matches"
                value={gameStats.activeMatches}
                colorIndex={0}
              />
              <StatsCard
                label="Biggest Win"
                value={`${gameStats.biggestWin} SOL`}
                colorIndex={1}
              />
              <StatsCard
                label="Active Players"
                value={gameStats.activePlayers}
                colorIndex={2}
              />
              <StatsCard
                label="Unique Games Played"
                value={gameStats.uniqueGamesPlayed}
                colorIndex={3}
              />
            </div>

            {/* Authentication Status */}
            <AuthStatus />

            {/* Multi-Chain Bridge Section */}
            {isAuthenticated && user?.authMethod === 'wallet' && (
              <div className="mb-8 glass-card p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">🌉</div>
                    <div>
                      <h2 className="text-xl font-bold text-text-primary font-audiowide mb-1">Multi-Chain Bridge</h2>
                      <p className="text-text-secondary font-inter text-sm">
                        Deposit ETH, USDC, USDT from Ethereum, Polygon, or BNB Chain using Wormhole technology
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-blue-400 font-inter">Powered by Wormhole</div>
                      <div className="text-xs text-green-400 font-inter">Instant & Secure</div>
                    </div>
                    <BridgeButton
                      variant="default"
                      size="default"
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 font-audiowide"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Featured Games Section */}
            <GameScrollSection
              title="FEATURED GAMES"
              subtitle="View All Games"
              games={[
                { name: 'PUMP WARS', emoji: '🚀', gradient: 'from-purple-500 to-pink-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/pump-wars.mp4', description: 'NEW: Bet on crypto price movements with proportional payouts and 397 verified tokens', wagerRange: '0.1 - 100 SOL' },
                { name: 'COIN FLIP', emoji: '🪙', gradient: 'from-yellow-500 to-orange-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/coinflip.mp4', description: 'Strategic binary decision making - master timing and prediction skills', wagerRange: '0.1 - 10 SOL' },
                { name: 'THE SHIPMENT', emoji: '📦', gradient: 'from-blue-500 to-cyan-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/the-shipment.mp4', description: 'Strategic cargo management with time pressure and skill-based gameplay', wagerRange: '0.5 - 30 SOL' },
                { name: 'CHESS BLITZ 1v1', emoji: '♟️', gradient: 'from-gray-700 to-gray-900', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/chess.mp4', description: 'Strategic gameplay - prove your chess mastery in fast-paced matches', wagerRange: '0.2 - 20 SOL' },
                { name: 'CRASH', emoji: '💥', gradient: 'from-orange-500 to-red-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/crash.mp4', description: 'Strategic timing game - master risk assessment and exit strategies', wagerRange: '0.1 - 20 SOL' },
                { name: 'DICE ROLL', emoji: '🎲', gradient: 'from-red-500 to-pink-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/dice.mp4', description: 'Strategic number prediction - analyze patterns and outthink opponents', wagerRange: '0.1 - 15 SOL' },
                { name: 'NUMBER GUESS', emoji: '🔢', gradient: 'from-green-500 to-teal-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/number-guess.mp4', description: 'Mathematical strategy game - use logic and pattern recognition to win', wagerRange: '0.1 - 8 SOL' },
                { name: 'ROCK PAPER SCISSORS', emoji: '✂️', gradient: 'from-blue-500 to-purple-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/rps.mp4', description: 'Psychological strategy game - read opponents and master tactical timing', wagerRange: '0.1 - 5 SOL' },
              ]}
              onPlay={handleGameSelect}
              isConnected={isAuthenticated}
              headerColor="from-accent-primary via-blue-400 to-purple-400"
              indicatorColor="#22c55e"
              indicatorText="LIVE"
            />

            {/* PV3 Originals Section */}
            <GameScrollSection
              title="PV3 ORIGINALS"
              subtitle="More Coming Soon"
              games={[
                { name: 'MEMORY MATCH', emoji: '🧠', gradient: 'from-pink-500 to-rose-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/memory-match.mp4', description: 'Cognitive skill challenge - master memory techniques and pattern recognition', wagerRange: '0.1 - 12 SOL' },
                { name: 'REFLEX TEST', emoji: '⚡', gradient: 'from-cyan-500 to-blue-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/reflex-test.mp4', description: 'Reaction time mastery - train your reflexes to outperform opponents', wagerRange: '0.1 - 8 SOL' },
                { name: 'MATH DUEL', emoji: '🧮', gradient: 'from-green-500 to-blue-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/math-duel.mp4', description: 'Mathematical skill competition - speed and accuracy determine victory', wagerRange: '0.1 - 10 SOL' },
                { name: 'MIRROR MOVE', emoji: '🪞', gradient: 'from-purple-500 to-pink-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/mirror-move.mp4', description: 'Pattern mastery challenge - perfect sequence replication through skill', wagerRange: '0.1 - 15 SOL' },
                { name: 'MIND STAB', emoji: '🧠', gradient: 'from-indigo-500 to-purple-600', coverVideo: 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/game-covers/mind-stab.mp4', description: 'Psychological strategy mastery - advanced prediction and tactical thinking', wagerRange: '0.2 - 25 SOL' },
              ]}
                    onPlay={handleGameSelect}
                    isConnected={isAuthenticated}
              headerColor="from-purple-400 via-pink-400 to-red-400"
              indicatorColor="#a855f7"
              indicatorText="EXCLUSIVE"
                  />

            {/* Live Matches */}
            {isAuthenticated && matches.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold font-audiowide mb-4">🔴 Live Matches</h2>
                <div className="space-y-3">
                  {matches.filter(match => match.status === 'waiting').map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-4 bg-bg-card rounded-lg border border-border">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {match.gameType === gameTypeIds.COIN_FLIP && '🪙'}
                          {match.gameType === gameTypeIds.ROCK_PAPER_SCISSORS && '✂️'}
                          {match.gameType === gameTypeIds.DICE_DUEL && '🎲'}
                          {match.gameType === gameTypeIds.NUMBER_GUESS && '🔢'}
                        </div>
                        <div>
                          <div className="font-audiowide text-text-primary">
                            {match.gameType === gameTypeIds.COIN_FLIP && 'Coin Flip'}
                            {match.gameType === gameTypeIds.ROCK_PAPER_SCISSORS && 'Rock Paper Scissors'}
                            {match.gameType === gameTypeIds.DICE_DUEL && 'Dice Duel'}
                            {match.gameType === gameTypeIds.NUMBER_GUESS && 'Number Guess'}
                          </div>
                          <div className="text-sm text-text-secondary font-inter">
                            Wager: {formatSOL(match.wagerAmount * 1000000000)} • Created by {match.creator.slice(0, 4)}...{match.creator.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinMatch(match.id)}
                        className="primary-button font-audiowide text-sm"
                      >
                        Join Match
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Wins Feed - Live gambling psychology section */}
            <div className="mt-8">
              <RecentWins />
            </div>

            {/* Platform News Section */}
            <PlatformNews />

            {/* Safety Banner */}
            <SafetyBanner />
        </div>
      </main>
      </div>
      
      <BridgeModal
        isOpen={showBridgeModal}
        onClose={() => setShowBridgeModal(false)}
        onSuccess={handleBridgeSuccess}
      />
      
      <VaultManager
        isOpen={showVaultManager}
        onClose={() => setShowVaultManager(false)}
        initialTab={vaultActiveTab}
      />
    </div>
  );
}
