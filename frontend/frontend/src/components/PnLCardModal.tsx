import React, { useState, useEffect } from 'react';
import { PnLCard } from './PnLCard';
import { useAuth } from '@/contexts/AuthContext';

interface PnLCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Game data for Victory Card
  game: 'RPS' | 'MINES' | 'CRASH' | 'CHESS' | 'COINFLIP';
  result: 'WIN' | 'LOSS';
  pnlAmount: number;
  pnlPercentage: number;
  wagerAmount: number;
  finalAmount: number;
  
  // Player data
  username?: string;
  walletAddress: string;
  userAvatar?: string;
  
  // Game specific data
  gameSpecific?: {
    finalScore?: string;
    totalRounds?: number;
    winRate?: number;
    minesRevealed?: number;
    gemsCollected?: number;
    multiplier?: number;
  };
  
  // Base template image
  baseImageUrl?: string;
}

export const PnLCardModal: React.FC<PnLCardModalProps> = ({
  isOpen,
  onClose,
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
  baseImageUrl
}) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleShare = () => {
    // Optional callback after sharing
          console.log('Victory Card shared!');
  };

  const handleSaveToProfile = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare PnL data for storage - SAVE ALL VISUAL CARD DATA
      const pnlData = {
        userId: user.id,
        gameType: game,
        result: result,
        wagerAmount: wagerAmount,
        pnlAmount: pnlAmount,
        pnlPercentage: pnlPercentage,
        finalAmount: finalAmount,
        feeAmount: result === 'WIN' ? (wagerAmount * 0.065) : 0, // 6.5% platform fee on winnings
        gameSpecific: gameSpecific || {},
        cardData: {
          // SAVE ALL THE VISUAL PROPS SO DASHBOARD CAN RECREATE EXACT SAME CARD
          timestamp: new Date(),
          gameType: game,
          username: username,
          walletAddress: walletAddress,
          userAvatar: userAvatar, // SAVE USER AVATAR
          baseImageUrl: baseImageUrl || "/pnl/pnlcard.png", // SAVE BASE IMAGE
          result: result,
          pnlAmount: pnlAmount,
          pnlPercentage: pnlPercentage,
          wagerAmount: wagerAmount,
          finalAmount: finalAmount,
          gameSpecific: gameSpecific || {} // SAVE GAME SPECIFIC DATA
        }
      };

      console.log('Saving PnL record:', pnlData);

      // Call the backend API to store the PnL record
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
        },
        body: JSON.stringify(pnlData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PnL record saved successfully:', result);
        setSaveSuccess(true);
        
        // Show success message briefly then close
        setTimeout(() => {
          setSaveSuccess(false);
          handleClose();
        }, 2000);
      } else {
        const error = await response.json();
        console.error('❌ Failed to save PnL record:', error);
        throw new Error(error.message || 'Failed to save PnL record');
      }

    } catch (error) {
      console.error('Error saving PnL record:', error);
      alert('Failed to save to profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`relative bg-gray-900 rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white font-audiowide">
            {result === 'WIN' ? '🏆 Victory Card' : '💔 Game Result'}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Victory Card */}
        <div className="flex justify-center mb-6">
          <PnLCard
            game={game}
            result={result}
            pnlAmount={pnlAmount}
            pnlPercentage={pnlPercentage}
            wagerAmount={wagerAmount}
            finalAmount={finalAmount}
            username={username}
            walletAddress={walletAddress}
            userAvatar={userAvatar}
            gameSpecific={gameSpecific}
            onShare={handleShare}
            baseImageUrl={baseImageUrl || "/pnl/pnlcard.png"}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-audiowide py-3 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSaveToProfile}
            disabled={isSaving || saveSuccess}
            className={`flex-1 font-audiowide py-3 px-4 rounded-lg transition-colors ${
              saveSuccess
                ? 'bg-green-600 text-white cursor-default'
                : isSaving
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saveSuccess ? '✅ Saved!' : isSaving ? '💾 Saving...' : '💾 Save to Profile'}
          </button>
        </div>

        {/* Info Text */}
        <div className="mt-4 text-center text-sm text-gray-400">
          Share your {result === 'WIN' ? 'victory' : 'game result'} with friends or save it to your profile
        </div>
      </div>
    </div>
  );
};

export default PnLCardModal; 