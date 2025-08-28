'use client';

import { useState } from 'react';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  date: string;
  tag: string;
  colorIndex: number;
}

export default function PlatformNews() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Color cycling to match StatsCard pattern
  const colors = ['#00ff41', '#00bfff', '#ffd700', '#9370db']; // green, blue, gold, purple

  // Mock news data - you'll replace the videoUrl with your actual MP4 paths
  const newsItems: NewsItem[] = [
    {
      id: '1',
      title: 'Unity 3D Games Launch',
      description: 'Experience next-gen gaming with our new Unity 3D integration featuring immersive PVP battles.',
      videoUrl: '/platform-news/unity-launch.mp4', // You'll replace with your MP4
      date: '2 days ago',
      tag: 'NEW GAMES',
      colorIndex: 0
    },
    {
      id: '2', 
      title: 'Tournament Mode Live',
      description: 'Join massive tournaments with prize pools up to 1000 SOL. Weekly championships now available.',
      videoUrl: '/platform-news/tournament-mode.mp4', // You'll replace with your MP4
      date: '1 week ago',
      tag: 'TOURNAMENTS',
      colorIndex: 1
    },
    {
      id: '3',
      title: 'Enhanced Security',
      description: 'New 2FA system and advanced verification ensure your funds are safer than ever before.',
      videoUrl: '/platform-news/security-update.mp4', // You'll replace with your MP4
      date: '2 weeks ago',
      tag: 'SECURITY',
      colorIndex: 2
    },
    {
      id: '4',
      title: 'PV3 Beta Access',
      description: 'Get early access to our beta features. Experience the future of Web3 gaming first.',
      videoUrl: '/platform-news/pv3-beta.mp4',
      date: '3 weeks ago',
      tag: 'BETA',
      colorIndex: 3
    }
  ];

  return (
    <div className="mt-8">
      <div 
        className="relative overflow-hidden rounded-lg p-6"
        style={{
          background: `linear-gradient(135deg, 
            rgba(255,255,255,0.01) 0%, 
            rgba(255,255,255,0.01) 50%, 
            rgba(0,0,0,0.03) 100%)`,
          backdropFilter: 'blur(3px)',
          border: `1px solid #00bfff40`,
          boxShadow: `0 0 20px #00bfff20, inset 0 0 20px rgba(255,255,255,0.01)`,
        }}
      >
        {/* Animated border glow */}
        <div
          className="absolute inset-0 rounded-lg opacity-50"
          style={{
            background: `linear-gradient(45deg, transparent, #00bfff30, transparent)`,
            animation: 'borderGlow 3s ease-in-out infinite',
          }}
        />

        {/* Gaming HUD corner brackets */}
        <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400 opacity-60" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400 opacity-60" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400 opacity-60" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400 opacity-60" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-audiowide text-blue-400 font-bold">NEWS</div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary font-audiowide">Platform Updates</h2>
                <p className="text-text-secondary font-audiowide text-sm">Latest features and announcements</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400 font-audiowide text-sm font-bold">LIVE</span>
            </div>
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {newsItems.map((item) => {
              const currentColor = colors[item.colorIndex];
              const isHovered = hoveredItem === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`
                    relative overflow-hidden rounded-lg transition-all duration-300 cursor-pointer
                    ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}
                  `}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(255,255,255,0.01) 0%, 
                      rgba(255,255,255,0.01) 50%, 
                      rgba(0,0,0,0.03) 100%)`,
                    backdropFilter: 'blur(3px)',
                    border: `1px solid ${currentColor}40`,
                    boxShadow: `0 0 15px ${currentColor}20, inset 0 0 15px rgba(255,255,255,0.01)`,
                  }}
                >
                  {/* Video Container - Optimized for 960x960 square MP4s */}
                  <div className="relative aspect-square overflow-hidden">
                    <video
                      src={item.videoUrl}
                      className="w-full h-full object-cover transition-all duration-300"
                      style={{ 
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        filter: `drop-shadow(0 0 8px ${currentColor}40)`
                      }}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    />
                    
                    {/* Tag Overlay */}
                    <div 
                      className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-audiowide font-bold"
                      style={{ 
                        backgroundColor: `${currentColor}20`,
                        border: `1px solid ${currentColor}60`,
                        color: currentColor,
                        textShadow: `0 0 4px ${currentColor}`
                      }}
                    >
                      {item.tag}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 
                      className="font-audiowide font-bold text-sm mb-2 transition-colors duration-300"
                      style={{ color: isHovered ? currentColor : '#ffffff' }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-text-secondary font-audiowide text-xs mb-3 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-audiowide text-xs">
                        {item.date}
                      </span>
                      {isHovered && (
                        <div 
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: currentColor }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  {isHovered && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 rounded-full animate-ping"
                          style={{
                            backgroundColor: currentColor,
                            left: `${20 + i * 20}%`,
                            top: `${30 + i * 15}%`,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: '1s',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes borderGlow {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    </div>
  );
} 