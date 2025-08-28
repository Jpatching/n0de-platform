'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RecentWin {
  id: string;
  playerName: string;
  gameType: string;
  gameEmoji: string;
  winAmount: number;
  timestamp: Date;
  multiplier?: number;
}

interface RecentWinsProps {
  gameFilter?: string;
  // Docking system props
  isDocked?: boolean;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onUndock?: () => void;
}

// Mock data generator for recent wins
const generateMockWin = (gameFilter?: string): RecentWin => {
  const allGameTypes = [
    { name: 'Coin Flip', symbol: 'FLIP', key: 'coinflip' },
    { name: 'Chess Blitz', symbol: 'CHESS', key: 'chess' },
    { name: 'Dice Roll', symbol: 'DICE', key: 'dice' },
    { name: 'Dice Duel', symbol: '🎲', key: 'dice_duel' },
    { name: 'Rock Paper Scissors', symbol: 'RPS', key: 'rps' },
    { name: 'Mines', symbol: 'MINES', key: 'mines' },
    { name: 'The Shipment', symbol: 'SHIP', key: 'shipment' },
    { name: 'Number Guess', symbol: 'NUM', key: 'number' },
    { name: 'Crash', symbol: 'CRASH', key: 'crash' },
    { name: 'Memory Match', symbol: 'MEM', key: 'memory' },
    { name: 'Pump Wars', symbol: '🚀', key: 'pump-wars' },
  ];

  // Filter games based on gameFilter
  const gameTypes = gameFilter 
    ? allGameTypes.filter(game => game.key === gameFilter.toLowerCase())
    : allGameTypes;

  const playerNames = gameFilter === 'mines' ? [
    'MineSweeper', 'BombDefuser', 'GemHunter', 'MineExpert', 'SafetyFirst',
    'DiamondMiner', 'TileExplorer', 'MineField', 'GemCollector', 'BombDodger',
    'MineKing', 'FieldMaster', 'GemstonePro', 'MineRush', 'TileWalker',
    'BombSquad', 'MineShark', 'GemSeeker', 'TileKing', 'MineChamp'
  ] : gameFilter === 'pump-wars' ? [
    'PumpMaster', 'DumpKing', 'CryptoProphet', 'TokenWhale', 'ChartReader',
    'PricePredictor', 'BullRun', 'BearHunter', 'MoonMission', 'DiamondHands',
    'SOLSniper', 'BONKBeast', 'WIFWarrior', 'PEPEPrince', 'JUPJumper',
    'PYTHPredator', 'CandleStick', 'TrendFollower', 'ResistanceBreaker', 'SupportFinder',
    'VolumeAnalyst', 'TechnicalTrader', 'FundamentalFox', 'RiskManager', 'ProfitTaker'
  ] : [
    'CryptoKing', 'SolanaWolf', 'GameMaster', 'SkillPlayer', 'PVPChamp',
    'DiamondHands', 'MoonShot', 'GamingLegend', 'WinStreak', 'ProGamer',
    'SolanaShark', 'CoinFlipPro', 'ChessGrandmaster', 'DiceRoller', 'RockStar',
    'NumberCruncher', 'MemoryMaster', 'ReflexKing', 'CrashSurvivor', 'BridgeBuilder'
  ];

  // Safety check: if no games match the filter, use all games
  const safeGameTypes = gameTypes.length > 0 ? gameTypes : allGameTypes;
  
  const game = safeGameTypes[Math.floor(Math.random() * safeGameTypes.length)];
  const playerName = playerNames[Math.floor(Math.random() * playerNames.length)];
  
  // Generate realistic win amounts with higher probability for smaller wins
  let winAmount: number;
  const rand = Math.random();
  if (rand < 0.5) {
    winAmount = Math.random() * 2 + 0.1; // 0.1 - 2.1 SOL (50% chance)
  } else if (rand < 0.8) {
    winAmount = Math.random() * 8 + 2; // 2 - 10 SOL (30% chance)
  } else if (rand < 0.95) {
    winAmount = Math.random() * 40 + 10; // 10 - 50 SOL (15% chance)
  } else {
    winAmount = Math.random() * 450 + 50; // 50 - 500 SOL (5% chance)
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    playerName,
    gameType: game.name,
    gameEmoji: game.symbol,
    winAmount: Math.round(winAmount * 1000) / 1000,
    timestamp: new Date(),
    multiplier: game.name === 'Crash' ? Math.random() * 20 + 1 : undefined
  };
};

export default function RecentWins({ 
  gameFilter, 
  isDocked = false,
  isDraggable = false,
  onDragStart,
  onDragEnd,
  onUndock
}: RecentWinsProps = {}) {
  const [wins, setWins] = useState<RecentWin[]>([]);
  const [newWinAnimation, setNewWinAnimation] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  // Color cycling to match StatsCard pattern - adjust color based on game
  const colors = ['#00ff41', '#00bfff', '#ffd700', '#9370db']; // green, blue, gold, purple
  const currentColor = gameFilter === 'mines' ? '#ff6b35' : colors[0]; // Orange for mines, green for others

  // Initialize with some mock data
  useEffect(() => {
    const initialWins = Array.from({ length: 10 }, () => generateMockWin(gameFilter));
    // Sort by timestamp (newest first)
    initialWins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setWins(initialWins);
  }, [gameFilter]);

  // Add new wins periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newWin = generateMockWin(gameFilter);
      setNewWinAnimation(newWin.id);
      
      setWins(prevWins => {
        const updatedWins = [newWin, ...prevWins].slice(0, 15); // Keep only latest 15
        return updatedWins;
      });

      // Remove animation class after animation completes
      setTimeout(() => {
        setNewWinAnimation(null);
      }, 1500);
    }, 4000 + Math.random() * 3000); // Random interval between 4-7 seconds

    return () => clearInterval(interval);
  }, [gameFilter]);

  const formatWinAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(3);
  };

  const getWinAmountColor = (amount: number) => {
    if (amount >= 100) return 'text-yellow-400'; // Big wins
    if (amount >= 10) return 'text-green-400';   // Good wins
    if (amount >= 1) return 'text-blue-400';     // Medium wins
    return 'text-text-secondary';                // Small wins
  };

  const getWinAmountGlow = (amount: number) => {
    if (amount >= 100) return 'drop-shadow-lg'; // Big wins glow
    if (amount >= 10) return 'drop-shadow-md';  // Good wins glow
    return '';
  };

  return (
    <div 
      draggable={isDraggable && !isDocked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        relative overflow-hidden rounded-lg transition-all duration-300 p-6 cursor-pointer
        ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}
        ${isDocked ? 'bg-bg-card border border-border' : ''}
        ${isDraggable && !isDocked ? 'cursor-grab active:cursor-grabbing hover:shadow-xl' : ''}
        ${isDraggedOver ? 'ring-2 ring-accent-primary' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isDocked ? undefined : `linear-gradient(135deg, 
          rgba(255,255,255,0.01) 0%, 
          rgba(255,255,255,0.01) 50%, 
          rgba(0,0,0,0.03) 100%)`,
        backdropFilter: isDocked ? undefined : 'blur(3px)',
        border: isDocked ? undefined : `1px solid ${currentColor}40`,
        boxShadow: isDocked ? undefined : `0 0 20px ${currentColor}20, inset 0 0 20px rgba(255,255,255,0.01)`,
      }}
    >
      {/* Animated border glow */}
      <div
        className="absolute inset-0 rounded-lg opacity-50"
        style={{
          background: `linear-gradient(45deg, transparent, ${currentColor}30, transparent)`,
          animation: 'borderGlow 3s ease-in-out infinite',
        }}
      />

      {/* Gaming HUD corner brackets */}
      <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 opacity-60" style={{ borderColor: currentColor }} />
      <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 opacity-60" style={{ borderColor: currentColor }} />
      <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 opacity-60" style={{ borderColor: currentColor }} />
      <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 opacity-60" style={{ borderColor: currentColor }} />

      {/* Scan line animation */}
      <div
        className="absolute top-0 left-0 w-full h-0.5 opacity-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${currentColor}, transparent)`,
          animation: 'scanLine 4s linear infinite',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-audiowide font-bold" style={{ color: currentColor }}>
              {gameFilter === 'mines' ? '💣' : 'WINS'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary font-audiowide">
                {gameFilter ? `Recent ${gameFilter.charAt(0).toUpperCase() + gameFilter.slice(1)} Wins` : 'Recent Big Wins'}
              </h2>
              <p className="text-text-secondary font-inter text-sm">
                {gameFilter ? `Live feed of ${gameFilter} victories` : 'Live feed of player victories'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentColor }}></div>
            <span className="font-audiowide text-sm font-bold" style={{ color: currentColor }}>LIVE</span>
            {isDocked && onUndock && (
              <button
                onClick={onUndock}
                className="ml-2 p-1 hover:bg-bg-elevated rounded text-text-secondary hover:text-text-primary transition-colors"
                title="Undock Recent Wins"
              >
                📤
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-hidden">
          {wins.map((win, index) => (
            <div
              key={win.id}
              className={`
                flex items-center justify-between p-4 rounded-lg border transition-all duration-1000 ease-out
                ${newWinAnimation === win.id 
                  ? 'bg-gradient-to-r from-green-500/20 to-yellow-500/20 border-green-400/50 transform scale-105 animate-pulse' 
                  : 'bg-bg-card/50 border-border/50 hover:bg-bg-card/80 hover:border-border'
                }
                ${index === 0 && newWinAnimation === win.id ? 'ring-2 ring-green-400/50' : ''}
              `}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="flex items-center space-x-4">
                <div className="text-xs font-audiowide text-accent-primary font-bold bg-accent-primary/10 px-2 py-1 rounded border border-accent-primary/20">
                  {win.gameEmoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-audiowide text-text-primary font-medium">
                      {win.playerName}
                    </span>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-secondary font-inter text-sm">
                      {win.gameType}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted font-inter">
                    {formatDistanceToNow(win.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-audiowide font-bold text-lg ${getWinAmountColor(win.winAmount)} ${getWinAmountGlow(win.winAmount)}`}>
                  +{formatWinAmount(win.winAmount)} SOL
                </div>
                {win.multiplier && (
                  <div className="text-xs text-orange-400 font-audiowide font-bold">
                    {win.multiplier.toFixed(2)}X MULT
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-primary/90 to-transparent pointer-events-none"></div>
      </div>

      {/* Subtle particle effect on hover */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-ping"
              style={{
                backgroundColor: currentColor,
                left: `${15 + i * 10}%`,
                top: `${20 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: '1.5s',
              }}
            />
          ))}
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes borderGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        @keyframes scanLine {
          0% { transform: translateY(0); }
          100% { transform: translateY(100px); }
        }
      `}</style>
    </div>
  );
} 