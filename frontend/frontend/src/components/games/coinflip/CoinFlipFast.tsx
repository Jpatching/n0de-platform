'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinFlipFastProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onAnimationComplete?: () => void;
}

export default function CoinFlipFast({ 
  isFlipping, 
  result, 
  onAnimationComplete 
}: CoinFlipFastProps) {
  const [currentSide, setCurrentSide] = useState<'heads' | 'tails'>('heads');
  const [isSettling, setIsSettling] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Fast flip animation - changes sides rapidly
  useEffect(() => {
    if (!isFlipping || isSettling) return;

    const flipInterval = setInterval(() => {
      setCurrentSide(prev => prev === 'heads' ? 'tails' : 'heads');
    }, 150); // Fast flipping every 150ms

    return () => clearInterval(flipInterval);
  }, [isFlipping, isSettling]);

  // Settle to result when provided
  useEffect(() => {
    if (isFlipping && result && !isSettling) {
      console.log(`🎯 Fast coin settling to: ${result}`);
      setIsSettling(true);
      
      // Settle to final result with extended timing for suspense
      setTimeout(() => {
        setCurrentSide(result);
        setAnimationComplete(true);
        
        // Complete after settling animation - extended for psychological impact
        setTimeout(() => {
          console.log('✅ Fast coin animation complete');
          onAnimationComplete?.();
        }, 2000); // Extended from 800ms to 2000ms
      }, 1000); // Extended from 500ms to 1000ms
    }
  }, [isFlipping, result, isSettling, onAnimationComplete]);

  // Reset when not flipping
  useEffect(() => {
    if (!isFlipping) {
      setIsSettling(false);
      setAnimationComplete(false);
      setCurrentSide('heads');
    }
  }, [isFlipping]);

  return (
    <div className="w-full h-[400px] relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      {/* Performance indicator */}
      <div className="absolute top-2 left-2 text-xs text-green-400 z-10 bg-black/50 px-2 py-1 rounded">
        ⚡ Fast Mode
      </div>
      
      {/* Animation status */}
      <div className="absolute top-2 right-2 text-xs text-white/50 z-10">
        {isFlipping ? 'FLIPPING' : 'READY'}
      </div>

      {/* Main coin */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSide}
          initial={{ 
            rotateY: isFlipping && !isSettling ? -90 : 0,
            scale: 0.8,
            opacity: 0.7
          }}
          animate={{ 
            rotateY: 0,
            scale: isSettling ? 1.1 : 1,
            opacity: 1
          }}
          exit={{ 
            rotateY: 90,
            scale: 0.8,
            opacity: 0.7
          }}
          transition={{ 
            duration: isFlipping && !isSettling ? 0.15 : 0.5,
            ease: "easeInOut"
          }}
          className="relative"
        >
          {/* Coin container */}
          <div className={`
            w-40 h-40 rounded-full relative overflow-hidden
            ${isFlipping && !isSettling ? 'animate-pulse' : ''}
            shadow-2xl shadow-black/50
            border-4 border-yellow-400
          `}>
            {/* Coin face */}
            <div className={`
              w-full h-full flex items-center justify-center text-white font-bold
              ${currentSide === 'heads' 
                ? 'bg-gradient-to-br from-orange-500 to-orange-700' 
                : 'bg-gradient-to-br from-blue-500 to-blue-700'
              }
            `}>
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {currentSide === 'heads' ? '👑' : '🎮'}
                </div>
                <div className="text-lg font-bold uppercase tracking-wider">
                  {currentSide}
                </div>
              </div>
            </div>

            {/* Metallic shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50 pointer-events-none" />
            
            {/* Spinning glow effect when flipping */}
            {isFlipping && !isSettling && (
              <div className="absolute inset-0 animate-spin">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            )}
          </div>

          {/* Sparkle effects when settling */}
          {isSettling && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (Math.random() - 0.5) * 200],
                    y: [0, (Math.random() - 0.5) * 200]
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Flip status text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <AnimatePresence mode="wait">
          {!isFlipping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-white/70 text-sm"
            >
              Ready to flip!
            </motion.div>
          )}
          {isFlipping && !result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-yellow-400 text-sm animate-pulse"
            >
              Flipping coin...
            </motion.div>
          )}
          {result && animationComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/20 mx-4"
            >
              <h3 className="text-lg font-bold text-white mb-1">
                {result === 'heads' ? '👑 HEADS!' : '🎮 TAILS!'}
              </h3>
              <p className="text-white/70 text-xs">
                Instant rendering • No loading delays
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 