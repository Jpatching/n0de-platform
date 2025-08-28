'use client';

import { useState, useRef } from 'react';
import GameCard from './GameCard';

interface Game {
  name: string;
  emoji: string;
  gradient: string;
  coverVideo: string;
  description?: string;
  wagerRange?: string;
}

interface GameScrollSectionProps {
  title: string;
  subtitle: string;
  games: Game[];
  onPlay: (gameName: string) => void;
  isConnected: boolean;
  headerColor?: string;
  indicatorColor?: string;
  indicatorText?: string;
}

export default function GameScrollSection({
  title,
  subtitle,
  games,
  onPlay,
  isConnected,
  headerColor = 'from-accent-primary via-blue-400 to-purple-400',
  indicatorColor = '#22c55e',
  indicatorText = 'LIVE'
}: GameScrollSectionProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const shouldScroll = games.length > 6;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -400,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 400,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current && shouldScroll) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <h2 className="text-3xl font-bold text-text-primary font-audiowide">
              <span className={`bg-gradient-to-r ${headerColor} bg-clip-text text-transparent animate-pulse`}>
                {title.split(' ')[0]}
              </span>
              <span className="ml-2 text-text-primary">{title.split(' ').slice(1).join(' ')}</span>
            </h2>
            
            {/* Animated underline */}
            <div className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-accent-primary to-blue-400 animate-pulse" 
                 style={{ width: '60%' }}></div>
          </div>
          
          {/* Gaming indicators */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full animate-pulse" 
                   style={{ 
                     backgroundColor: indicatorColor,
                     boxShadow: `0 0 8px ${indicatorColor}60`
                   }}></div>
              <span className="font-audiowide text-xs font-bold" style={{ color: indicatorColor }}>
                {indicatorText}
              </span>
            </div>
            <div className="text-text-secondary font-audiowide text-sm">
              {games.length} Games Available
            </div>
          </div>
        </div>
        
        {/* Action button */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="text-text-muted font-audiowide text-xs">
            {subtitle}
          </div>
          <div className="w-6 h-6 border border-accent-primary/30 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-3 h-3 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Scrollable Games Container */}
      <div 
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Left Scroll Arrow */}
        {shouldScroll && showLeftArrow && (
          <button
            onClick={scrollLeft}
            className={`
              absolute left-2 top-1/2 transform -translate-y-1/2 z-20 
              w-12 h-12 bg-black/80 hover:bg-black/90 rounded-full 
              flex items-center justify-center transition-all duration-300
              ${isHovering ? 'opacity-100' : 'opacity-0'}
              hover:scale-110 border border-white/20
            `}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right Scroll Arrow */}
        {shouldScroll && showRightArrow && (
          <button
            onClick={scrollRight}
            className={`
              absolute right-2 top-1/2 transform -translate-y-1/2 z-20 
              w-12 h-12 bg-black/80 hover:bg-black/90 rounded-full 
              flex items-center justify-center transition-all duration-300
              ${isHovering ? 'opacity-100' : 'opacity-0'}
              hover:scale-110 border border-white/20
            `}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Games Container */}
        {shouldScroll ? (
          // Horizontal scroll layout for more than 6 games - SAME SIZE as grid cards
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {games.map((game) => (
              <div key={game.name} className="flex-none w-96">
                <GameCard
                  name={game.name}
                  emoji={game.emoji}
                  gradient={game.gradient}
                  coverVideo={game.coverVideo}
                  description={game.description}
                  wagerRange={game.wagerRange}
                  onPlay={onPlay}
                  isConnected={isConnected}
                />
              </div>
            ))}
          </div>
        ) : (
          // Regular responsive grid for 6 or fewer games
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {games.map((game) => (
              <GameCard
                key={game.name}
                name={game.name}
                emoji={game.emoji}
                gradient={game.gradient}
                coverVideo={game.coverVideo}
                description={game.description}
                wagerRange={game.wagerRange}
                onPlay={onPlay}
                isConnected={isConnected}
              />
            ))}
          </div>
        )}

        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-primary to-transparent pointer-events-none z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-primary to-transparent pointer-events-none z-10"></div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
} 