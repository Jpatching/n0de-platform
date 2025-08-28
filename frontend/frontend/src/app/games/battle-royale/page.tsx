'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import RecentWins from '@/components/RecentWins';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import { Info, BarChart3, MessageCircle, X, Crown } from 'lucide-react';

// Types for 3-token variable betting system
type BattlePhase = 'lobby' | 'betting' | 'elimination' | 'final' | 'completed';

interface TokenPool {
  tokenAddress: string;
  tokenSymbol: string;
  totalAmount: number;
  bettorCount: number;
  isEliminated: boolean;
}

interface BattleToken {
  id: string;
  symbol: string;
  address: string;
  name: string;
  logoURI?: string;
  startPrice: number;
  currentPrice: number;
  priceHistory: Array<{ timestamp: number; price: number }>;
  pool: TokenPool;
}

interface BattleMatch {
  id: string;
  phase: BattlePhase;
  tokens: BattleToken[];
  minBet: number;
  maxBet: number;
  totalPot: number;
  winnerPot: number;
  platformFee: number;
  startTime: number;
  phaseEndTime: number;
  winnerId?: string;
}

interface BattlePlayer {
  id: string;
  wallet: string;
  selectedTokenId?: string;
  betAmount: number;
  isWinner: boolean;
  payout?: number;
}

// 3-Token leagues for fair competition
const TOKEN_LEAGUES = {
  MEME_COINS: [
    {
      address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      name: "Bonk",
      symbol: "BONK",
      decimals: 5,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png",
      daily_volume: 45000000
    },
    {
      address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      name: "dogwifhat",
      symbol: "WIF",
      decimals: 6,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm/logo.png",
      daily_volume: 35000000
    },
    {
      address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
      name: "Popcat",
      symbol: "POPCAT",
      decimals: 9,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr/logo.png",
      daily_volume: 25000000
    }
  ],
  
  DEFI_LEAGUE: [
    {
      address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      name: "Jupiter",
      symbol: "JUP",
      decimals: 6,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png",
      daily_volume: 55000000
    },
    {
      address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      name: "Pyth Network",
      symbol: "PYTH",
      decimals: 6,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3/logo.png",
      daily_volume: 42000000
    },
    {
      address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
      name: "Render Token",
      symbol: "RNDR",
      decimals: 8,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png",
      daily_volume: 38000000
    }
  ],

  BLUE_CHIP_INFRASTRUCTURE: [
    {
      address: "So11111111111111111111111111111111111111112",
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      daily_volume: 800000000
    },
    {
      address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
      name: "Ethereum",
      symbol: "ETH",
      decimals: 8,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png",
      daily_volume: 500000000
    },
    {
      address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh/logo.png",
      daily_volume: 1200000000
    }
  ]
};

// Variable Betting Interface Component
const BettingInterface = ({ 
  currentMatch, 
  onPlaceBet, 
  userBalance 
}: {
  currentMatch: BattleMatch | null;
  onPlaceBet: (tokenAddress: string, amount: number) => void;
  userBalance: number;
}) => {
  const [betAmount, setBetAmount] = useState(0.1);
  const [selectedTokenForBet, setSelectedTokenForBet] = useState<string>('');

  if (!currentMatch || currentMatch.phase !== 'betting') {
    return (
      <Card className="p-6 border-yellow-500/30 bg-yellow-900/10">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">Waiting for Next Battle</h3>
          <p className="text-gray-400">A new 3-token battle will start soon!</p>
        </div>
      </Card>
    );
  }

  const selectedToken = currentMatch.tokens.find(t => t.address === selectedTokenForBet);
  const canPlaceBet = selectedTokenForBet && betAmount >= currentMatch.minBet && betAmount <= currentMatch.maxBet && betAmount <= userBalance;

  return (
    <Card className="p-6 border-accent/30 bg-gradient-to-br from-yellow-900/20 to-orange-900/20">
      <h3 className="text-xl font-bold text-accent mb-4 flex items-center">
        <span className="text-2xl mr-2">🎯</span>
        Place Your Bet
      </h3>

      {/* Token Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3 text-gray-300">Choose Token</label>
        <div className="grid grid-cols-3 gap-3">
          {currentMatch.tokens.map((token) => (
            <button
              key={token.address}
              onClick={() => setSelectedTokenForBet(token.address)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTokenForBet === token.address
                  ? 'border-accent bg-accent/20 scale-105'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{token.symbol === 'SOL' ? '◎' : '🪙'}</div>
                <div className="font-bold text-sm">{token.symbol}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Pool: {token.pool.totalAmount.toFixed(2)} SOL
                </div>
                <div className="text-xs text-gray-500">
                  {token.pool.bettorCount} bettors
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bet Amount */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3 text-gray-300">
          Bet Amount
        </label>
        
        <Input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          min={currentMatch.minBet}
          max={Math.min(currentMatch.maxBet, userBalance)}
          step={0.001}
          placeholder="Enter bet amount"
          className="bg-gray-800 border-gray-600 mb-3"
        />
        
        <div className="flex justify-between text-xs text-gray-500 mb-3">
          <span>Min: {currentMatch.minBet} SOL</span>
          <span>Max: {Math.min(currentMatch.maxBet, userBalance).toFixed(2)} SOL</span>
        </div>

        {/* Quick Bet Buttons */}
        <div className="flex gap-2">
          {[0.1, 0.5, 1.0, 2.5].map((amount) => (
            <button
              key={amount}
              onClick={() => setBetAmount(amount)}
              disabled={amount > userBalance}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm transition-colors"
            >
              {amount} SOL
            </button>
          ))}
        </div>
      </div>

      {/* Potential Payout Preview */}
      {selectedToken && betAmount > 0 && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <h4 className="font-bold text-green-400 mb-2">Potential Payout Preview</h4>
          <div className="text-sm text-gray-300 space-y-1">
            <div>Your bet: {betAmount.toFixed(3)} SOL on {selectedToken.symbol}</div>
            <div>Current pool: {selectedToken.pool.totalAmount.toFixed(3)} SOL</div>
            <div>Your share: {selectedToken.pool.totalAmount > 0 ? ((betAmount / (selectedToken.pool.totalAmount + betAmount)) * 100).toFixed(1) : '100'}%</div>
            <div className="font-bold text-green-400">
              If {selectedToken.symbol} wins: ~{((currentMatch.winnerPot + betAmount * 0.9) * (betAmount / (selectedToken.pool.totalAmount + betAmount))).toFixed(3)} SOL
            </div>
          </div>
        </div>
      )}

      {/* Place Bet Button */}
      <Button
        onClick={() => selectedTokenForBet && onPlaceBet(selectedTokenForBet, betAmount)}
        disabled={!canPlaceBet}
        className="w-full py-3 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700"
      >
        {!selectedTokenForBet ? '🎯 Select Token First' :
         betAmount < currentMatch.minBet ? `💰 Min Bet ${currentMatch.minBet} SOL` :
         betAmount > userBalance ? '💸 Insufficient Balance' :
         `🚀 Bet ${betAmount.toFixed(3)} SOL on ${selectedToken?.symbol}`}
      </Button>

      {/* Balance Info */}
      <div className="mt-4 text-center text-sm text-gray-400">
        Your Balance: {userBalance.toFixed(3)} SOL
      </div>
    </Card>
  );
};

// 3-Token Battle Arena Component
const BattleArena = ({ currentMatch }: { currentMatch: BattleMatch | null }) => {
  if (!currentMatch) return null;

  return (
    <Card className="p-6 border-accent/30 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-accent flex items-center">
            <Crown className="h-8 w-8 mr-2" />
            3-TOKEN ARENA
          </h3>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-4 py-2">
            {currentMatch.phase.toUpperCase()}
          </Badge>
        </div>

        {/* Prize Pool Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-400">Total Prize Pool</div>
            <div className="text-2xl font-bold text-yellow-400">{currentMatch.totalPot.toFixed(2)} SOL</div>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-400">Winner Takes (90%)</div>
            <div className="text-2xl font-bold text-green-400">{currentMatch.winnerPot.toFixed(2)} SOL</div>
          </div>
        </div>
      </div>

      {/* 3-Token Grid Layout */}
      <div className="grid grid-cols-3 gap-4">
        {currentMatch.tokens.map((token, index) => (
          <div key={token.id} className="relative">
            {/* Token Chart */}
            <div className="aspect-video bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
              <iframe
                src={`https://dexscreener.com/solana/${token.address}?embed=1&theme=dark&trades=0&info=0`}
                className="w-full h-full"
                frameBorder="0"
                title={`${token.symbol} Chart`}
              />
              
              {/* Token Pool Overlay */}
              <div className="absolute top-2 left-2 bg-black/80 rounded px-2 py-1 text-xs">
                <div className="font-bold text-white">{token.symbol}</div>
                <div className="text-gray-300">{token.pool.totalAmount.toFixed(2)} SOL</div>
                <div className="text-gray-400">{token.pool.bettorCount} bettors</div>
              </div>

              {/* Elimination Overlay */}
              {token.pool.isEliminated && (
                <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💀</div>
                    <div className="text-xl font-bold text-red-400">ELIMINATED</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Battle Status */}
      <div className="mt-6 text-center">
        {currentMatch.phase === 'betting' && (
          <div className="text-yellow-400">
            <div className="text-lg font-bold">🎯 Betting Phase Active</div>
            <div className="text-sm text-gray-400">Place your bets on any of the 3 tokens!</div>
          </div>
        )}
        {currentMatch.phase === 'elimination' && (
          <div className="text-orange-400">
            <div className="text-lg font-bold">⚔️ Elimination Phase</div>
            <div className="text-sm text-gray-400">Worst token will be eliminated...</div>
          </div>
        )}
        {currentMatch.phase === 'final' && (
          <div className="text-red-400">
            <div className="text-lg font-bold">🏆 Final Battle</div>
            <div className="text-sm text-gray-400">Last 2 tokens fighting for victory!</div>
          </div>
        )}
        {currentMatch.phase === 'completed' && (
          <div className="text-green-400">
            <div className="text-lg font-bold">🎉 Battle Complete</div>
            <div className="text-sm text-gray-400">Winner takes all the pot!</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default function BattleRoyalePage() {
  const { vaultBalance, formatSOL } = usePV3();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<BattleMatch | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasEnteredGame, setHasEnteredGame] = useState(false);
  const [gameStateLoading, setGameStateLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state
  useEffect(() => {
    setIsAuthenticated(!!user);
    setGameStateLoading(false);
  }, [user]);
  const hasVaultFunds = vaultBalance > 0;

  // Create mock battle for demonstration
  const enterGame = async () => {
    if (!isAuthenticated) return;

    setHasEnteredGame(true);
    
    try {
      // Select tokens from meme league for demo
      const tokens = TOKEN_LEAGUES.MEME_COINS.slice(0, 3);
      
      const battleTokens: BattleToken[] = await Promise.all(
        tokens.map(async (token, index) => {
          // Fetch real price or use fallback
          let realPrice: number | null = null;
          try {
            const response = await fetch(`https://lite-api.jup.ag/price/v3?ids=${token.address}`);
            const data = await response.json();
            realPrice = data[token.address]?.usdPrice || null;
          } catch (error) {
            console.warn(`Failed to fetch price for ${token.symbol}:`, error);
          }

          const basePrice = realPrice || (
            token.symbol === 'BONK' ? 0.000028 :
            token.symbol === 'WIF' ? 2.15 :
            token.symbol === 'POPCAT' ? 1.35 :
            0.001
          );
          
          const priceVariation = (Math.random() - 0.5) * 0.06;
          const startPrice = basePrice;
          const currentPrice = startPrice * (1 + priceVariation);
          
          return {
            id: token.symbol.toLowerCase(),
            symbol: token.symbol,
            address: token.address,
            name: token.name,
            logoURI: token.logoURI,
            startPrice,
            currentPrice,
            priceHistory: [],
            pool: {
              tokenAddress: token.address,
              tokenSymbol: token.symbol,
              totalAmount: Math.random() * 2 + 0.5, // 0.5-2.5 SOL pools
              bettorCount: Math.floor(Math.random() * 8) + 1, // 1-8 bettors
              isEliminated: false,
            }
          };
        })
      );
      
      const totalPot = battleTokens.reduce((sum, token) => sum + token.pool.totalAmount, 0);
      const platformFee = totalPot * 0.1;
      const winnerPot = totalPot - platformFee;
      
      const mockBattle: BattleMatch = {
        id: 'demo-battle-1',
        phase: 'betting',
        tokens: battleTokens,
        minBet: 0.01,
        maxBet: 10.0,
        totalPot,
        winnerPot,
        platformFee,
        startTime: Date.now(),
        phaseEndTime: Date.now() + 300000, // 5 minutes
      };
      
      setCurrentMatch(mockBattle);
      console.log(`🎮 3-Token Battle Arena Created with ${battleTokens.length} tokens: ${battleTokens.map(t => t.symbol).join(', ')}`);
    } catch (error) {
      console.error('Error creating battle:', error);
      setError('Failed to create battle arena');
    }
  };

  const placeBet = async (tokenAddress: string, amount: number) => {
    if (!currentMatch || !user) {
      setError('Cannot place bet at this time');
      return;
    }

    try {
      // TODO: Call real API endpoint
      const response = await fetch('/api/battle-royale/bets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: currentMatch.id,
          userId: user.id,
          tokenAddress,
          betAmount: amount
        })
      });

      if (response.ok) {
        // Update local state (in real app, this would come from WebSocket)
        const updatedMatch = { ...currentMatch };
        const tokenIndex = updatedMatch.tokens.findIndex(t => t.address === tokenAddress);
        if (tokenIndex !== -1) {
          updatedMatch.tokens[tokenIndex].pool.totalAmount += amount;
          updatedMatch.tokens[tokenIndex].pool.bettorCount += 1;
          updatedMatch.totalPot += amount;
          updatedMatch.winnerPot = updatedMatch.totalPot * 0.9;
          updatedMatch.platformFee = updatedMatch.totalPot * 0.1;
        }
        setCurrentMatch(updatedMatch);
        
        console.log(`🎯 Placed bet: ${amount} SOL on ${tokenAddress}`);
      } else {
        setError('Failed to place bet');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      setError('Failed to place bet');
    }
  };

  // Lobby page - show before entering game
  if (!isAuthenticated || !hasEnteredGame) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="p-6">
            <div className="max-w-6xl mx-auto">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <div className="text-8xl mb-6 animate-bounce">⚔️</div>
                <h1 className="text-6xl font-bold font-audiowide mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  BATTLE ROYALE
                </h1>
                <p className="text-xl text-text-secondary font-inter max-w-2xl mx-auto leading-relaxed">
                  3 tokens enter, variable betting amounts. Last token standing takes the entire pot!
                </p>
              </div>

              {/* Game Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="p-6 bg-gradient-to-br from-yellow-900/20 to-orange-700/20 border-yellow-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">Last Token Standing</h3>
                    <p className="text-sm text-gray-300">
                      Winner takes 90% of the entire pot. Proportional payouts to all bettors on winning token.
                    </p>
                  </div>
                </Card>
                
                <Card className="p-6 bg-gradient-to-br from-orange-900/20 to-red-700/20 border-orange-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">💰</div>
                    <h3 className="text-xl font-bold text-orange-400 mb-2">Variable Betting</h3>
                    <p className="text-sm text-gray-300">
                      Bet any amount from 0.01 to 10 SOL. Bigger bets = bigger share of the winning pot.
                    </p>
                  </div>
                </Card>
                
                <Card className="p-6 bg-gradient-to-br from-red-900/20 to-pink-700/20 border-red-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">3-Token Battles</h3>
                    <p className="text-sm text-gray-300">
                      Perfect competition size. One elimination round, then final battle between last 2 tokens.
                    </p>
                  </div>
                </Card>
              </div>

              {/* Authentication Check */}
              {!isAuthenticated && (
                <Card className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">⚠️</div>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-500 font-audiowide">Connect Wallet Required</h3>
                      <p className="text-text-secondary font-inter">
                        Sign in with your Solana wallet to start playing Battle Royale
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Vault Balance */}
              {isAuthenticated && (
                <Card className="mb-8 p-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-accent">🏦 Vault Balance</h3>
                      <p className="text-3xl font-bold">{formatSOL(vaultBalance)} SOL</p>
                      <p className="text-sm text-gray-400">Ready for battle royale betting</p>
                    </div>
                    {!hasVaultFunds && (
                      <div className="text-center">
                        <Badge variant="destructive" className="mb-2">Deposit Required</Badge>
                        <p className="text-xs text-gray-400">Add SOL to start playing</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Enter Game Button */}
              <div className="text-center">
                <Button
                  onClick={enterGame}
                  disabled={!isAuthenticated || !hasVaultFunds || gameStateLoading}
                  className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-yellow-500/25"
                >
                  {gameStateLoading ? (
                    <>⏳ Loading Game State...</>
                  ) : !isAuthenticated ? (
                    <>🔐 Connect Wallet to Play</>
                  ) : !hasVaultFunds ? (
                    <>💰 Deposit SOL to Play</>
                  ) : (
                    <>🚀 ENTER 3-TOKEN ARENA</>
                  )}
                </Button>
              </div>

              {/* Recent Activity */}
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-center mb-8 text-accent">Recent Battle Royale Winners</h2>
                <RecentWins gameFilter="battle-royale" />
              </div>
            </div>
          </main>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-red-500/50 z-50">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Game Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl animate-pulse">⚔️</div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                      Battle Royale Arena
                    </h1>
                  </div>
                  {currentMatch && (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      {currentMatch.phase.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Main Game Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Battle Arena - Takes 2 columns */}
              <div className="xl:col-span-2">
                <BattleArena currentMatch={currentMatch} />
              </div>

              {/* Betting Interface - Takes 1 column */}
              <div>
                <BettingInterface 
                  currentMatch={currentMatch}
                  onPlaceBet={placeBet}
                  userBalance={vaultBalance}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-red-500/50 z-50">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}