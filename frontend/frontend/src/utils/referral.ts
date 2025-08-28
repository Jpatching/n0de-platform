/**
 * Referral utility functions for PV3 platform
 */

/**
 * Extract referral code from URL parameters
 */
export function getReferralCodeFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref');
}

/**
 * Generate referral link for sharing
 */
export function generateReferralLink(referralCode: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://pv3.gg';
  
  return `${baseUrl}?ref=${referralCode}`;
}

/**
 * Clear referral code from URL after processing
 */
export function clearReferralFromURL(): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete('ref');
  
  // Update URL without page reload
  window.history.replaceState({}, document.title, url.toString());
}

/**
 * Check if current URL has a referral code
 */
export function hasReferralCode(): boolean {
  return getReferralCodeFromURL() !== null;
}

/**
 * Get referral code and clear it from URL
 */
export function consumeReferralCode(): string | null {
  const code = getReferralCodeFromURL();
  if (code) {
    clearReferralFromURL();
  }
  return code;
} 