'use client';

interface GameDetailsCardProps {
  name: string;
  emoji: string;
  gradient: string;
  description: string;
  minWager: string;
  avgDuration: string;
}

export default function GameDetailsCard({ 
  name, 
  emoji, 
  gradient, 
  description, 
  minWager, 
  avgDuration 
}: GameDetailsCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start space-x-4">
        {/* Game Icon */}
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl`}>
          {emoji}
        </div>
        
        {/* Game Info */}
        <div className="flex-1">
          <h4 className="text-lg font-bold text-text-primary mb-2 font-audiowide">{name}</h4>
          <p className="text-text-secondary mb-3 font-inter text-sm">{description}</p>
          
          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-text-muted font-inter">
              <span className="text-text-secondary">Min Wager: </span>
              <span className="text-accent-primary font-bold">{minWager}</span>
            </div>
            <div className="text-text-muted font-inter">
              <span className="text-text-secondary">Avg Duration: </span>
              <span className="text-text-primary">{avgDuration}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 