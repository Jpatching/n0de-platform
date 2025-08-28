import React from 'react';

export default function StatsPanel() {
  const mockStats = {
    gamesPlayed: 47,
    gamesWon: 32,
    winRate: 68.1,
    totalWinnings: 12.45,
    bestStreak: 8,
    averageMultiplier: 1.85,
    tilesRevealed: 342,
    roundsWon: 89,
    favoritePosition: 'Corner Start'
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-text-primary font-audiowide">📊 Game Statistics</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Overall Stats */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Overall Performance</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-secondary">Games Played</span>
              <div className="font-bold text-text-primary">{mockStats.gamesPlayed}</div>
            </div>
            <div>
              <span className="text-text-secondary">Games Won</span>
              <div className="font-bold text-green-400">{mockStats.gamesWon}</div>
            </div>
            <div>
              <span className="text-text-secondary">Win Rate</span>
              <div className="font-bold text-accent-primary">{mockStats.winRate}%</div>
            </div>
            <div>
              <span className="text-text-secondary">Best Streak</span>
              <div className="font-bold text-yellow-400">{mockStats.bestStreak}</div>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Earnings</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Winnings</span>
              <span className="font-bold text-green-400">{mockStats.totalWinnings} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Avg Multiplier</span>
              <span className="font-bold text-text-primary">{mockStats.averageMultiplier}x</span>
            </div>
          </div>
        </div>

        {/* Game Analysis */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Game Analysis</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Tiles Revealed</span>
              <span className="font-bold text-text-primary">{mockStats.tilesRevealed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Rounds Won</span>
              <span className="font-bold text-green-400">{mockStats.roundsWon}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Favorite Strategy</span>
              <span className="font-bold text-accent-primary">{mockStats.favoritePosition}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Example */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Current Session</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Session Progress</span>
                <span className="text-text-primary">7/10 games</span>
              </div>
              <div className="w-full bg-bg-main rounded-full h-2">
                <div className="bg-accent-primary h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Win Streak</span>
                <span className="text-green-400">4 wins</span>
              </div>
              <div className="w-full bg-bg-main rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 