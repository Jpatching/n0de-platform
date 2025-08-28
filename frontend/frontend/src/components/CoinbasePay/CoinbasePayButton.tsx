'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface CoinbasePayButtonProps {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onPaymentComplete?: (amount: string) => void;
  defaultAmount?: number | null;
}

export function CoinbasePayButton({ 
  variant = 'default', 
  size = 'default', 
  className = '',
  onPaymentComplete,
  defaultAmount = null
}: CoinbasePayButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePaymentSuccess = (amount: string) => {
    setIsModalOpen(false);
    onPaymentComplete?.(amount);
  };

  const baseClasses = "relative overflow-hidden group transition-all duration-200 font-audiowide";
  const variantClasses = {
    default: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white",
    outline: "border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
  };
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    default: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <>
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center gap-2">
          <OptimizedImage src="/logos/Coinbase.png" alt="Coinbase" width={20} height={20} />
          <span>Buy SOL with Coinbase</span>
        </div>
        
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </button>

      {isModalOpen && (
        <CoinbasePayModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          defaultAmount={defaultAmount}
        />
      )}
    </>
  );
}

interface CoinbasePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: string) => void;
  defaultAmount?: number | null;
}

function CoinbasePayModal({ isOpen, onClose, onSuccess, defaultAmount = null }: CoinbasePayModalProps) {
  const { publicKey } = useWallet();
  const [usdAmount, setUsdAmount] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch estimate when USD amount changes
  const fetchEstimate = async (amount: string) => {
    if (!amount || isNaN(Number(amount))) {
      setEstimate(null);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1'}/payments/estimate?usd=${amount}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEstimate(data);
      }
    } catch (error) {
      console.error('Failed to fetch estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial estimate if defaultAmount is provided
  useEffect(() => {
    if (defaultAmount) {
      fetchEstimate(defaultAmount.toString());
    }
  }, [defaultAmount]);

  const handleAmountChange = (value: string) => {
    setUsdAmount(value);
    fetchEstimate(value);
  };

  const createPayment = async () => {
    if (!usdAmount || !estimate) return;

    try {
      setCreating(true);
      const token = localStorage.getItem('pv3_session_token');
      if (!token) {
        throw new Error('Please authenticate first');
      }

      // Get user wallet from Solana wallet adapter
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }
      const userWallet = publicKey.toString();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1'}/payments/coinbase/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userWallet,
            usdAmount: Number(usdAmount),
            description: `PV3 SOL Deposit - $${usdAmount}`,
            metadata: JSON.stringify({
              source: 'vault_manager',
              timestamp: new Date().toISOString()
            })
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment');
      }

      const result = await response.json();
      
      // Redirect to Coinbase Commerce hosted page
      window.open(result.payment.hostedUrl, '_blank');
      
      // Close modal and notify parent
      onSuccess(estimate.solAmount.toString());
      
    } catch (error) {
      console.error('Payment creation failed:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-elevated border border-border rounded-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-border sticky top-0 bg-bg-elevated rounded-t-xl">
          <div className="flex items-center space-x-3">
            <OptimizedImage src="/logos/Coinbase.png" alt="Coinbase" width={24} height={24} />
            <h2 className="text-lg lg:text-xl font-bold font-audiowide">Buy SOL with Coinbase</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-2 -m-2 touch-manipulation"
          >
            ✕
          </button>
        </div>

        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* USD Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">USD Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="number"
                value={usdAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="100"
                min="1"
                max="10000"
                className="w-full pl-10 pr-4 py-3 lg:py-4 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none text-base touch-manipulation"
                inputMode="decimal"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Minimum: $1 • Maximum: $10,000
            </p>
          </div>

          {/* Estimate Display */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">Calculating...</span>
            </div>
          )}

          {estimate && !loading && (
            <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Payment Amount:</span>
                <span className="font-medium">${estimate.usdAmount}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Coinbase Processing:</span>
                <span>-${estimate.breakdown.coinbaseFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-bold">
                  <span>SOL You&apos;ll Receive:</span>
                  <span className="text-green-400">{estimate.solAmount} SOL</span>
                </div>
              </div>
              <div className="text-xs text-text-secondary">
                SOL Price: ${estimate.solPrice.toFixed(2)}
              </div>
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={createPayment}
            disabled={!estimate || creating || Number(usdAmount) < 1}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all font-audiowide touch-manipulation text-base"
          >
            {creating ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Payment...
              </div>
            ) : (
              `Pay $${usdAmount || '0'} with Coinbase`
            )}
          </button>

          {/* Info */}
          <div className="text-xs text-text-secondary space-y-2 bg-bg-card/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3 h-3 text-green-400" />
              <span>Powered by Coinbase Commerce</span>
            </div>
            <div className="space-y-1 ml-5">
              <p>• Supports credit/debit cards and crypto</p>
              <p>• SOL deposited to your vault automatically</p>
              <p>• Payment window opens in new tab</p>
              <p>• Mobile-optimized checkout experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 