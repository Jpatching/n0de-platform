import React, { useRef, useCallback } from 'react';
import domtoimage from 'dom-to-image';

interface PnLCardProps {
  // Game data
  game: 'RPS' | 'MINES' | 'CRASH' | 'CHESS' | 'COINFLIP';
  result: 'WIN' | 'LOSS';
  pnlAmount: number; // In SOL
  pnlPercentage: number;
  wagerAmount: number;
  finalAmount: number;
  
  // Player data
  username?: string;
  walletAddress: string;
  userAvatar?: string; // Profile image URL
  
  // Game specific data
  gameSpecific?: {
    // RPS specific
    finalScore?: string; // "3-1"
    totalRounds?: number;
    winRate?: number;
    
    // Mines specific
    minesRevealed?: number;
    gemsCollected?: number;
    multiplier?: number;
    
    // Other games...
  };
  
  // Styling
  variant?: 'default' | 'win' | 'loss';
  showShare?: boolean;
  onShare?: () => void;
  
  // Base template image
  baseImageUrl?: string; // Optional base template image
}

export const PnLCard: React.FC<PnLCardProps> = ({
  game,
  result,
  pnlAmount,
  pnlPercentage,
  wagerAmount,
  finalAmount,
  username,
  walletAddress,
  userAvatar,
  gameSpecific,
  variant = 'default',
  showShare = true,
  onShare,
  baseImageUrl
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const getGameIcon = (game: string) => {
    switch (game) {
      case 'RPS': return '✂️';
      case 'MINES': return '💎';
      case 'CRASH': return '🚀';
      case 'CHESS': return '♛';
      case 'COINFLIP': return '🪙';
      default: return '🎮';
    }
  };

  const getGameColor = (result: string) => {
    return result === 'WIN' 
      ? 'from-green-500 to-emerald-600' 
      : 'from-red-500 to-rose-600';
  };

  const generateCard = useCallback(async () => {
    if (!cardRef.current) return null;

    try {
      // Capture exactly as displayed on website
      const dataUrl = await domtoimage.toPng(cardRef.current, {
        quality: 1,
        cacheBust: true
      });
      
      return dataUrl;
    } catch (error) {
      console.error('Failed to generate card:', error);
      return null;
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const imageData = await generateCard();
    if (!imageData) return;

    // Direct download
    const link = document.createElement('a');
    link.download = `pv3-${game}-${result.toLowerCase()}-${Date.now()}.png`;
    link.href = imageData;
    link.click();

    onShare?.();
  }, [generateCard, game, result, onShare]);

  const handleShare = useCallback(async () => {
    const imageData = await generateCard();
    if (!imageData) return;

    const gameText = gameSpecific?.finalScore 
      ? `${game} ${gameSpecific.finalScore}` 
      : game;

    const shareText = `${result === 'WIN' ? '🏆' : '💔'} ${gameText} on PV3\n\n` +
      `${result === 'WIN' ? 'Profit' : 'Loss'}: ${pnlAmount >= 0 ? '+' : ''}${pnlAmount.toFixed(3)} SOL (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(1)}%)\n` +
      `Wager: ${wagerAmount.toFixed(3)} SOL\n\n` +
      `Play at PV3.GAME 🎮`;

    // Try native sharing first
    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing with image
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], 'pv3-pnl.png', { type: 'image/png' });

        const shareData = {
          title: `PV3 ${game} ${result}`,
          text: shareText,
          files: [file]
        };

        // Check if we can share this data with files
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          onShare?.();
          return;
        } else {
          // Fallback to text-only sharing if files aren't supported
          await navigator.share({
            title: `PV3 ${game} ${result}`,
            text: shareText,
            url: window.location.origin
          });
          onShare?.();
          return;
        }
      } catch (error) {
        console.log('Native sharing failed:', error);
      }
    }

    // Fallback: Just copy text to clipboard (no auto-download)
    try {
      await navigator.clipboard.writeText(shareText);
      alert('PnL details copied to clipboard! Use the download button to save the image.');
    } catch (error) {
      alert('Sharing not supported on this device. Use the download button to save the image.');
    }

    onShare?.();
  }, [generateCard, result, game, gameSpecific, pnlAmount, pnlPercentage, wagerAmount, onShare]);

  return (
    <div className="relative">
      {/* Actual PnL Card */}
      <div 
        ref={cardRef}
        className="w-[840px] h-[570px] relative overflow-hidden rounded-3xl shadow-2xl font-audiowide"
        style={{ 
          fontFamily: 'Audiowide, system-ui, sans-serif',
          ...(baseImageUrl ? {
            backgroundImage: `url(${baseImageUrl})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          } : {
            background: `linear-gradient(135deg, 
              rgba(15, 23, 42, 0.95) 0%, 
              rgba(30, 41, 59, 0.95) 25%, 
              rgba(51, 65, 85, 0.95) 50%, 
              rgba(30, 41, 59, 0.95) 75%, 
              rgba(15, 23, 42, 0.95) 100%
            ), linear-gradient(45deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)`
          })
        }}
      >
        {/* Background Elements - Only show if no base image */}
        {!baseImageUrl && (
          <div className="absolute inset-0">
            {/* Main geometric shapes - positioned to avoid content overlap */}
            <div className="absolute top-32 right-2 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl transform rotate-12 backdrop-blur-sm"></div>
            <div className="absolute bottom-24 left-2 w-24 h-12 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 rounded-xl transform -rotate-6 backdrop-blur-sm"></div>
            <div className="absolute top-1/3 right-2 w-14 h-14 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-full backdrop-blur-sm"></div>
            
            {/* Floating particles */}
            <div className="absolute top-20 left-12 w-2 h-2 bg-blue-400/40 rounded-full animate-pulse"></div>
            <div className="absolute bottom-32 right-16 w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-48 right-12 w-1 h-1 bg-cyan-400/40 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}></div>
            
            {/* Subtle watermark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-3">
              <img 
                src="/logos/PV3-Logo.webp" 
                alt="PV3 Watermark" 
                className="w-40 h-40 object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </div>
        )}

        {/* Axiom-style base template overlay system */}
          <div className="absolute inset-0 p-4">
            {/* Top Row - Game Title & PV3 Logo - Same level alignment like Axiom */}
            <div className="flex justify-between items-center mb-4">
              {/* Top Left - Game Title */}
              <div>
                <div className="text-white font-black text-4xl tracking-wide drop-shadow-lg font-audiowide">
                  {game}{game === 'MINES' ? ' 💣' : ''}
                </div>
              </div>
              
              {/* Top Right - PV3 Logo - Bigger as requested */}
              <div>
                <img 
                  src="/logos/PV3-Logo.webp" 
                  alt="PV3 Logo" 
                  className="w-64 h-64 object-contain drop-shadow-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            </div>

            {/* Green Profit Bar - Axiom width (about 65% like their design) - PUSHED HIGHER */}
            <div className="mb-4">
              <div className={`w-[33%] py-3 px-6 rounded-lg ${
                pnlAmount >= 0 
                  ? 'bg-green-400 text-black'
                  : 'bg-red-400 text-black'
              }`}>
                <div 
                  style={{ 
                    width: '100%',
                    height: '51px',
                    position: 'relative'
                  }}
                >
                  {/* Green bar is 277px wide (33% of 840px) */}
                  {/* Logo + gap + text positioned towards left side */}
                  <img 
                    src="/logos/solana.png" 
                    alt="SOL" 
                    style={{ 
                      position: 'absolute',
                      left: '30px', // Left-aligned within smaller bar
                      top: '2px', // Vertically center 48px in 51px
                      width: '48px', 
                      height: '48px', 
                      objectFit: 'contain',
                      imageRendering: 'crisp-edges'
                    }}
                  />
                  <span
                    className="font-audiowide profit-text-canvas-fix"
                    style={{ 
                      position: 'absolute',
                      left: '94px', // 30 + 48 + 16 = 94px
                      top: '26px', // Vertically center in 51px height
                      transform: 'translateY(-50%)', // Center based on text height
                      fontSize: '48px',
                      fontWeight: '900',
                      color: 'black',
                      whiteSpace: 'nowrap',
                      // Browser-specific styles for perfect website preview
                      lineHeight: '1',
                      display: 'inline-block',
                      textAlign: 'center',
                      // Additional properties to help html2canvas
                      fontFeatureSettings: 'normal',
                      fontKerning: 'normal',
                      textRendering: 'geometricPrecision',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                  >
                    {pnlAmount >= 0 ? '+' : ''}{pnlAmount.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Column - Vertical layout like Axiom (PNL, then Stake below, then Won below) - Reduced sizes to fit better */}
            <div className="space-y-2 pt-2 pb-32">
              {/* PNL Percentage */}
              <div>
                <div className={`font-black text-xl ${pnlAmount >= 0 ? 'text-green-400' : 'text-red-400'} drop-shadow-lg font-audiowide mb-1`}>
                  PNL
                </div>
                <div className={`font-black text-lg ${pnlAmount >= 0 ? 'text-green-400' : 'text-red-400'} drop-shadow-lg font-audiowide`}>
                  {pnlAmount >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                </div>
              </div>
              
              {/* Stake - Under PNL like Axiom's "Bought" */}
              <div>
                <div className="text-white font-bold text-lg drop-shadow-lg font-audiowide mb-1">
                  Stake
                </div>
                <div className="flex items-center space-x-2">
                  <img 
                    src="/logos/solana.png" 
                    alt="SOL" 
                    className="w-6 h-6 object-contain"
                  />
                  <div className="text-white font-bold text-lg drop-shadow-lg font-audiowide">{wagerAmount.toFixed(2)}</div>
                </div>
              </div>
              
              {/* Won - Under Stake like Axiom's "Position" */}
              <div>
                <div className="text-white font-bold text-lg drop-shadow-lg font-audiowide mb-1">
                  Won
                </div>
                <div className="flex items-center space-x-2">
                  <img 
                    src="/logos/solana.png" 
                    alt="SOL" 
                    className="w-6 h-6 object-contain"
                  />
                  <div className="text-white font-bold text-lg drop-shadow-lg font-audiowide">{finalAmount.toFixed(1)}</div>
                </div>
              </div>
            </div>

            {/* Bottom Footer - Axiom style with big @ username */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt="Profile"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center border-2 border-white/30">
                      <span className="text-white font-bold text-lg font-audiowide">
                        {username ? username[0].toUpperCase() : walletAddress[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    {/* Big noticeable @ username like Axiom */}
                    <div className="text-white font-black text-3xl drop-shadow-lg font-audiowide">
                      @{username || walletAddress.slice(0, 8)}
                    </div>
                    {/* Website icon and domain like Axiom has */}
                    <div className="flex items-center space-x-2 mt-1">
                      <img 
                        src="/logos/PV3-Logo.webp" 
                        alt="Website" 
                        className="w-4 h-4 object-contain"
                      />
                      <div className="text-gray-300 text-sm font-medium font-audiowide">
                        PV3.FUN
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Slogan positioned like Axiom's "Save 10% off fees" */}
                <div className="text-right">
                  <div className="text-gray-300 text-sm font-bold drop-shadow-lg font-audiowide mb-1">
                    Earn Forever Through PV3
                  </div>
                  <div className="text-gray-400 text-xs font-medium drop-shadow-lg font-audiowide">
                    The Future Of Web3 Gaming
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* Professional Download & Share Buttons - Scaled for 840px width */}
      {showShare && (
        <div className="mt-8 flex justify-center space-x-6">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="group relative px-8 py-4 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-600 text-white rounded-xl hover:from-slate-700 hover:via-slate-800 hover:to-slate-700 transition-all duration-300 font-bold text-lg uppercase tracking-wider shadow-lg hover:shadow-xl transform hover:scale-105 font-audiowide"
            style={{
              background: 'linear-gradient(135deg, #475569 0%, #334155 50%, #475569 100%)',
              backgroundSize: '200% 200%'
            }}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-400/20 to-slate-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center space-x-3">
              <span className="text-xl">💾</span>
              <span>Download</span>
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 transition-all duration-300 font-bold text-lg uppercase tracking-wider shadow-lg hover:shadow-xl transform hover:scale-105 font-audiowide"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
              backgroundSize: '200% 200%'
            }}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center space-x-3">
              <span className="text-xl">📤</span>
              <span>Share</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PnLCard; 