import React from 'react';

export default function GameOverviewPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-text-primary font-audiowide">🎮 Mines Game Overview</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Game Rules */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-2">Game Rules</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>• 5×5 grid with 5 hidden mines</li>
            <li>• First to win 3 rounds wins the match</li>
            <li>• Reveal tiles to build multiplier</li>
            <li>• Hit a mine = round loss</li>
            <li>• Cash out before hitting mines</li>
          </ul>
        </div>

        {/* Strategy Tips */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-2">Strategy Tips</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>• Start with corners for safety</li>
            <li>• Build multiplier gradually</li>
            <li>• Know when to cash out</li>
            <li>• Watch opponent patterns</li>
          </ul>
        </div>

        {/* Multiplier Info */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-2">Multiplier System</h4>
          <div className="text-sm text-text-secondary space-y-1">
            <div className="flex justify-between"><span>1 tile:</span><span className="text-green-400">1.20x</span></div>
            <div className="flex justify-between"><span>2 tiles:</span><span className="text-green-400">1.44x</span></div>
            <div className="flex justify-between"><span>3 tiles:</span><span className="text-green-400">1.73x</span></div>
            <div className="flex justify-between"><span>4 tiles:</span><span className="text-yellow-400">2.07x</span></div>
            <div className="flex justify-between"><span>5+ tiles:</span><span className="text-orange-400">2.50x+</span></div>
          </div>
        </div>
      </div>
    </div>
  );
} 