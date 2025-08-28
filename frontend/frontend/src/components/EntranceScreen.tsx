'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface EntranceScreenProps {
  onComplete: () => void;
}

export default function EntranceScreen({ onComplete }: EntranceScreenProps) {
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    // Show logo after matrix effect starts
    const logoTimer = setTimeout(() => setLogoVisible(true), 800);
    
    // Complete after 3 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Generate matrix characters
  const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Matrix Rain Background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-green-400 font-mono text-sm opacity-70 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          >
            <div className="animate-bounce" style={{ animationDelay: `${Math.random() * 1}s` }}>
              {Array.from({ length: 20 }).map((_, j) => (
                <div
                  key={j}
                  className="leading-4"
                  style={{
                    opacity: Math.max(0.1, 1 - (j * 0.05)),
                    animationDelay: `${j * 0.1}s`
                  }}
                >
                  {matrixChars[Math.floor(Math.random() * matrixChars.length)]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scanning Lines Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute w-full h-1 bg-green-400 opacity-30"
          style={{
            animation: 'scan 2s linear infinite',
            boxShadow: '0 0 20px #00ff00'
          }}
        />
      </div>

      {/* PV3 Logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`transition-all duration-1000 ease-out ${
          logoVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}>
          <div className="relative">
            {/* Glitch Effect Background */}
            <div 
              className="absolute inset-0 -m-8"
              style={{
                background: 'radial-gradient(circle, rgba(255, 0, 0, 0.3) 0%, rgba(0, 255, 0, 0.1) 50%, transparent 100%)',
                filter: 'blur(20px)',
                animation: 'glitch 0.5s ease-in-out infinite alternate'
              }}
            />
            
            {/* Main Logo */}
            <OptimizedImage
              src="/logos/PV3-Logo.png"
              alt="PV3"
              width={400}
              height={160}
              className="drop-shadow-2xl relative z-10"
              style={{
                filter: 'brightness(1.2) contrast(1.1) drop-shadow(0 0 30px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 60px rgba(0, 255, 0, 0.4))',
                animation: 'logoGlow 2s ease-in-out infinite alternate'
              }}
              priority
            />
            
            {/* Digital Overlay Effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-20"
              style={{
                animation: 'digitalSweep 3s ease-in-out infinite'
              }}
            />
          </div>
        </div>
      </div>

      {/* Matrix-style text overlay */}
      <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center transition-all duration-1000 delay-1000 ${
        logoVisible ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="text-green-400 font-mono text-lg tracking-wider animate-pulse">
          <span className="animate-bounce" style={{ animationDelay: '0s' }}>I</span>
          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>N</span>
          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>I</span>
          <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>T</span>
          <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>I</span>
          <span className="animate-bounce" style={{ animationDelay: '0.5s' }}>A</span>
          <span className="animate-bounce" style={{ animationDelay: '0.6s' }}>L</span>
          <span className="animate-bounce" style={{ animationDelay: '0.7s' }}>I</span>
          <span className="animate-bounce" style={{ animationDelay: '0.8s' }}>Z</span>
          <span className="animate-bounce" style={{ animationDelay: '0.9s' }}>I</span>
          <span className="animate-bounce" style={{ animationDelay: '1.0s' }}>N</span>
          <span className="animate-bounce" style={{ animationDelay: '1.1s' }}>G</span>
          <span className="animate-bounce" style={{ animationDelay: '1.2s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '1.3s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '1.4s' }}>.</span>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        
        @keyframes glitch {
          0% { 
            opacity: 0.8; 
            transform: translateX(0) scale(1); 
          }
          100% { 
            opacity: 1.0; 
            transform: translateX(2px) scale(1.02); 
          }
        }
        
        @keyframes logoGlow {
          0% { 
            filter: brightness(1.2) contrast(1.1) drop-shadow(0 0 30px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 60px rgba(0, 255, 0, 0.4)); 
          }
          100% { 
            filter: brightness(1.4) contrast(1.2) drop-shadow(0 0 40px rgba(255, 0, 0, 1.0)) drop-shadow(0 0 80px rgba(0, 255, 0, 0.6)); 
          }
        }
        
        @keyframes digitalSweep {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
} 