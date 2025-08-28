import { useEffect, useState } from 'react';
import { getReferralCodeFromURL, clearReferralFromURL } from '@/utils/referral';

/**
 * Custom hook to handle referral codes from URL parameters
 * Automatically detects referral codes and stores them for signup
 */
export function useReferral() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [hasProcessedURL, setHasProcessedURL] = useState(false);

  useEffect(() => {
    if (hasProcessedURL) return;

    // Check for referral code in URL
    const urlReferralCode = getReferralCodeFromURL();
    
    if (urlReferralCode) {
      console.log(`🎯 REFERRAL DETECTED: ${urlReferralCode}`);
      setReferralCode(urlReferralCode);
      
      // Store in sessionStorage for signup process
      sessionStorage.setItem('pv3_referral_code', urlReferralCode);
      
      // Clear from URL to keep it clean
      clearReferralFromURL();
      
      // Show user-friendly notification
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
          ">
            🎯 Referral Code Applied: ${urlReferralCode}
            <br>
            <small style="opacity: 0.9; font-weight: 400;">Sign up to claim your bonus!</small>
          </div>
          <style>
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          </style>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      }
    }
    
    setHasProcessedURL(true);
  }, [hasProcessedURL]);

  // Get stored referral code for signup
  const getStoredReferralCode = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('pv3_referral_code');
  };

  // Clear stored referral code after successful signup
  const clearStoredReferralCode = (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('pv3_referral_code');
    setReferralCode(null);
  };

  return {
    referralCode,
    hasReferralCode: !!referralCode,
    getStoredReferralCode,
    clearStoredReferralCode,
  };
} 