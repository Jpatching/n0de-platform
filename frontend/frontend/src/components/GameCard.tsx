'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import OptimizedVideo from '@/components/ui/OptimizedVideo';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface GameCardProps {
  name: string;
  emoji?: string;
  gradient?: string;
  coverImage?: string;
  coverVideo?: string;
  minWager?: string;
  description?: string;
  wagerRange?: string;
  onPlay: (gameName: string) => void;
  isConnected: boolean;
  className?: string;
  status?: string;
}

export default function GameCard({ 
  name, 
  emoji, 
  gradient, 
  coverImage,
  coverVideo,
  minWager, 
  description,
  wagerRange,
  onPlay, 
  isConnected,
  className = "",
  status
}: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Debug video loading
  useEffect(() => {
    if (coverVideo) {
      console.log(`🎬 GameCard ${name} trying to load video: ${coverVideo}`);
      setVideoLoaded(false);
      setVideoError(false);
    }
  }, [coverVideo, name]);
  
  const hasCustomVideo = !!coverVideo && !videoError;
  const hasCustomImage = !!coverImage && !imageError && !hasCustomVideo;
  const hasCustomCover = hasCustomVideo || hasCustomImage;
  
  return (
    <div className={`game-card ${className} animate-glow-test`}>
      <div 
        className={`group aspect-[5/8] ${!hasCustomCover ? `bg-gradient-to-br ${gradient}` : 'bg-gray-900'} rounded-lg relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:ring-4 hover:ring-yellow-400/60 overflow-hidden`}
        onClick={() => isConnected && onPlay(name)}
        onMouseEnter={() => {
          // 🚀 PHASE 2: Smart preloading trigger
          window.dispatchEvent(new CustomEvent('game-hover', { detail: { gameName: name } }));
        }}
        onMouseLeave={() => {
          window.dispatchEvent(new CustomEvent('game-leave'));
        }}
      >
        
        {/* Immediate video loading for maximum personality and visual impact */}
        {hasCustomVideo ? (
          <div className="absolute inset-0 bg-black">
            <OptimizedVideo
              src={coverVideo}
              autoPlay
              loop
              muted
              preload="metadata"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => {
                console.log(`❌ Video failed to load: ${coverVideo}`);
                setVideoError(true);
              }}
              onCanPlay={() => {
                console.log(`✅ Video loaded successfully: ${coverVideo}`);
                setVideoLoaded(true);
              }}
              style={{ 
                objectPosition: 'center center'
              }}
            />
            
            {/* Loading placeholder with gradient background */}
            {!videoLoaded && (
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <div className="text-8xl opacity-30 transform rotate-12">
                  {emoji}
                </div>
                {/* Debug info */}
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 p-1 rounded">
                  {coverVideo ? 'Loading...' : 'No video'}
                </div>
              </div>
            )}
            
            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>
        ) : hasCustomImage ? (
          <div className="absolute inset-0">
            <Image
              src={coverImage}
              alt={`${name} game cover`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              priority={true} // Load images immediately too
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>
        ) : (
          <>
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-8xl opacity-30 transform rotate-12">
            {emoji}
          </div>
        </div>
          </>
        )}
        
        {/* Unity Logo Badge - Top Left (for Unity games like THE SHIPMENT) */}
        {name === 'THE SHIPMENT' && (
          <div className="absolute top-3 left-3 z-30">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
              <OptimizedImage src="/logos/unity.png" alt="Unity" width={20} height={20} />
            </div>
          </div>
        )}
        
        {status && (
          <div className="absolute top-3 right-3 z-30">
            <div className={`text-xs px-2 py-1 rounded font-semibold backdrop-blur-sm ${
              status === 'Coming Soon' ? 'bg-green-500/20 text-green-400' :
              status === 'In Development' ? 'bg-yellow-500/20 text-yellow-400' :
              status === 'Planning' ? 'bg-blue-500/20 text-blue-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {status}
            </div>
          </div>
        )}
        
        {/* Enhanced hover overlay - always show when description exists */}
        {(description || wagerRange) && (
          <div className="absolute inset-0 flex flex-col justify-between bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-4 backdrop-blur-sm">
            <div className="flex-1 flex flex-col justify-center text-center space-y-3">
              {/* Game Title */}
              <h3 className="text-white font-audiowide text-lg font-bold mb-2">
                {name}
              </h3>
              
              {/* Game Description */}
              {description && (
                <div className="text-gray-200 font-inter text-sm leading-relaxed px-2">
                  {description}
                </div>
              )}
              
              {/* Wager Range */}
              {wagerRange && (
                <div className="flex flex-col items-center space-y-1">
                  <div className="text-accent-primary font-bold font-audiowide text-base">
                  {wagerRange}
                  </div>
                  <div className="text-gray-400 font-inter text-xs">
                    Wager Range
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced Play Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onPlay(name);
              }}
              className={`${
                isConnected 
                  ? 'bg-gradient-to-r from-accent-primary to-yellow-400 hover:from-yellow-400 hover:to-accent-primary text-black font-bold shadow-lg hover:shadow-xl transform hover:scale-105' 
                  : 'bg-gray-600 hover:bg-gray-500 text-white cursor-not-allowed'
              } px-4 py-3 rounded-lg font-audiowide font-bold w-full transition-all duration-300 text-sm relative overflow-hidden`}
              disabled={!isConnected}
            >
              {/* Button glow effect */}
              {isConnected && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
              <span className="relative z-10">
                {isConnected ? 'ENTER LOBBY' : 'CONNECT WALLET'}
              </span>
            </button>
          </div>
        )}

        {hasCustomCover && (
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-accent-primary/20 to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  );
} 