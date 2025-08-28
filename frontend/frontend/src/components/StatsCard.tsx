'use client';

import { useState, useEffect } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  colorIndex?: number;
}

export default function StatsCard({ label, value, icon, colorIndex = 0 }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Color cycling to match Matrix rain
  const colors = ['#00ff41', '#00bfff', '#ffd700', '#9370db']; // green, blue, gold, purple
  const currentColor = colors[colorIndex % colors.length];

  // Animate number counting up
  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 2000; // 2 seconds
      const increment = end / (duration / 50);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 50);

      return () => clearInterval(timer);
    }
  }, [value]);

  const formatDisplayValue = () => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && value >= 1000) {
      return displayValue.toLocaleString();
    }
    return displayValue.toString();
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg transition-all duration-300 cursor-pointer
        ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: `linear-gradient(135deg, 
          rgba(255,255,255,0.1) 0%, 
          rgba(255,255,255,0.05) 50%, 
          rgba(0,0,0,0.1) 100%)`,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${currentColor}40`,
        boxShadow: `0 0 20px ${currentColor}20, inset 0 0 20px rgba(255,255,255,0.05)`,
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
        className="absolute top-0 left-0 w-full h-0.5 opacity-30 animate-pulse"
        style={{
          background: `linear-gradient(90deg, transparent, ${currentColor}, transparent)`,
          animation: 'scanLine 4s linear infinite',
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-4 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <div className="text-text-secondary text-sm font-audiowide font-medium tracking-wide uppercase">
            {label}
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div
            className="text-2xl font-bold font-audiowide tracking-tight"
            style={{ color: currentColor }}
          >
            {formatDisplayValue()}
          </div>
          
          {/* Status indicator */}
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: currentColor }}
          />
        </div>

        {/* Subtle particle effect */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full animate-ping"
                style={{
                  backgroundColor: currentColor,
                  left: `${20 + i * 15}%`,
                  top: `${30 + i * 10}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        )}
      </div>

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