'use client';

import React, { useState, useEffect } from 'react';
import { Flame, TrendingUp, Trophy, Star, Zap, Target, Award, Move, Settings, Eye, Maximize2, RotateCcw } from 'lucide-react';

interface StreakData {
  current: {
    type: 'win' | 'loss';
    count: number;
    value: number;
    startDate: Date;
  };
  best: {
    wins: { count: number; value: number; date: Date };
    losses: { count: number; value: number; date: Date };
  };
  history: Array<{
    type: 'win' | 'loss';
    count: number;
    value: number;
    startDate: Date;
    endDate: Date;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    description: string;
    threshold: number;
    achieved: boolean;
    reward?: string;
    achievedAt?: Date;
  }>;
}

interface StreakTrackerProps {
  streakData: StreakData;
  isDraggable?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
  className?: string;
}

const defaultMilestones = [
  { id: 'streak-5', name: 'Hot Streak', description: '5 wins in a row', threshold: 5, achieved: false, reward: '🔥 Hot Streak Badge' },
  { id: 'streak-10', name: 'On Fire', description: '10 wins in a row', threshold: 10, achieved: false, reward: '💯 On Fire Badge' },
  { id: 'streak-15', name: 'Unstoppable', description: '15 wins in a row', threshold: 15, achieved: false, reward: '⚡ Unstoppable Badge' },
  { id: 'streak-20', name: 'Legendary', description: '20 wins in a row', threshold: 20, achieved: false, reward: '🏆 Legendary Badge' },
  { id: 'streak-25', name: 'Mythical', description: '25 wins in a row', threshold: 25, achieved: false, reward: '🌟 Mythical Badge' },
];

export default function StreakTracker({ 
  streakData, 
  isDraggable = false, 
  onPositionChange,
  className = '' 
}: StreakTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [settings, setSettings] = useState({
    showMilestones: true,
    showHistory: true,
    compactMode: false,
    notifications: true,
    theme: 'default' as 'default' | 'minimal' | 'gaming'
  });

  const currentStreak = streakData.current;
  const isWinStreak = currentStreak.type === 'win';
  
  const getStreakColor = () => {
    if (!isWinStreak) return 'text-red-400';
    if (currentStreak.count >= 20) return 'text-purple-400';
    if (currentStreak.count >= 15) return 'text-yellow-400';
    if (currentStreak.count >= 10) return 'text-orange-400';
    if (currentStreak.count >= 5) return 'text-cyan-400';
    return 'text-green-400';
  };

  const getStreakIcon = () => {
    if (!isWinStreak) return '💔';
    if (currentStreak.count >= 20) return '🌟';
    if (currentStreak.count >= 15) return '⚡';
    if (currentStreak.count >= 10) return '🔥';
    if (currentStreak.count >= 5) return '💫';
    return '✨';
  };

  const getNextMilestone = () => {
    if (!isWinStreak) return null;
    return defaultMilestones.find(m => m.threshold > currentStreak.count && !m.achieved);
  };

  const getProgressToNext = () => {
    const next = getNextMilestone();
    if (!next) return 100;
    return (currentStreak.count / next.threshold) * 100;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isDraggable) return;
    const newPos = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    setPosition(newPos);
    onPositionChange?.(newPos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    onPositionChange?.({ x: 0, y: 0 });
  };

  if (settings.compactMode && !isExpanded) {
    return (
      <div 
        className={`relative bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 cursor-pointer ${className}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStreakIcon()}</span>
          <div className="flex-1">
            <div className={`text-sm font-bold ${getStreakColor()}`}>
              {currentStreak.count} {isWinStreak ? 'Win' : 'Loss'} Streak
            </div>
            <div className="text-xs text-slate-400">
              ${currentStreak.value.toFixed(2)}
            </div>
          </div>
          <button className="text-slate-400 hover:text-white">
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden ${className}`}
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : isDraggable ? 'grab' : 'default'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-slate-700/50"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Flame className={`w-5 h-5 ${getStreakColor()}`} />
            {currentStreak.count >= 5 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Streak Tracker</h3>
            <p className="text-xs text-slate-400">Track your winning momentum</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isDraggable && (
            <button
              onClick={resetPosition}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset Position"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          {isDraggable && (
            <div className="text-slate-400">
              <Move className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Current Streak Display */}
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">{getStreakIcon()}</div>
          <div className={`text-4xl font-bold mb-2 ${getStreakColor()}`}>
            {currentStreak.count}
          </div>
          <div className="text-lg text-white mb-1">
            {isWinStreak ? 'Win Streak' : 'Loss Streak'}
          </div>
          <div className="text-sm text-slate-400">
            {isWinStreak ? '+' : ''}{currentStreak.value >= 0 ? '+' : ''}${currentStreak.value.toFixed(2)} total
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Started {new Date(currentStreak.startDate).toLocaleDateString()}
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {isWinStreak && getNextMilestone() && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Next Milestone</span>
              <span className="text-sm font-medium text-cyan-400">
                {getNextMilestone()?.name}
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getProgressToNext()}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 text-center">
              {currentStreak.count} / {getNextMilestone()?.threshold} wins
            </div>
          </div>
        )}

        {/* Best Streaks */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-lg font-bold text-green-400">
              {streakData.best.wins.count}
            </div>
            <div className="text-xs text-slate-400">Best Win Streak</div>
            <div className="text-xs text-slate-500">
              +${streakData.best.wins.value.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">💔</div>
            <div className="text-lg font-bold text-red-400">
              {streakData.best.losses.count}
            </div>
            <div className="text-xs text-slate-400">Worst Loss Streak</div>
            <div className="text-xs text-slate-500">
              -${Math.abs(streakData.best.losses.value).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Milestones */}
        {settings.showMilestones && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Milestones</h4>
            <div className="space-y-2">
              {defaultMilestones.slice(0, 3).map((milestone) => {
                const isAchieved = streakData.milestones.some(m => m.id === milestone.id && m.achieved);
                const isCurrent = currentStreak.count >= milestone.threshold && isWinStreak;
                
                return (
                  <div 
                    key={milestone.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                      isAchieved 
                        ? 'bg-yellow-500/20 border border-yellow-400/30' 
                        : isCurrent
                        ? 'bg-cyan-500/20 border border-cyan-400/30'
                        : 'bg-slate-700/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">
                        {isAchieved ? '🏆' : isCurrent ? '⭐' : '🎯'}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${
                          isAchieved ? 'text-yellow-400' : isCurrent ? 'text-cyan-400' : 'text-slate-300'
                        }`}>
                          {milestone.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {milestone.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {milestone.threshold}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Streak History */}
        {settings.showHistory && streakData.history.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Recent Streaks</h4>
            <div className="space-y-2">
              {streakData.history.slice(0, 3).map((streak, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      {streak.type === 'win' ? '✅' : '❌'}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${
                        streak.type === 'win' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {streak.count} {streak.type} streak
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(streak.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${
                    streak.value >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {streak.value >= 0 ? '+' : ''}${streak.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-slate-800/95 backdrop-blur-sm p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-white">Widget Settings</h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Show Milestones</span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, showMilestones: !prev.showMilestones }))}
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.showMilestones ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.showMilestones ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Show History</span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, showHistory: !prev.showHistory }))}
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.showHistory ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.showHistory ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Compact Mode</span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.compactMode ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.compactMode ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Notifications</span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.notifications ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.notifications ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div>
              <span className="text-sm text-slate-300 block mb-2">Theme</span>
              <div className="grid grid-cols-3 gap-2">
                {(['default', 'minimal', 'gaming'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSettings(prev => ({ ...prev, theme }))}
                    className={`p-2 rounded-lg text-xs capitalize transition-colors ${
                      settings.theme === theme
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 