'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: 'USD' | 'USDC';
  requests: string;
  features: string[];
  popular?: boolean;
}

const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    currency: 'USDC',
    requests: '1M requests/month',
    features: ['5,000 RPS', '99.9% Uptime', 'Standard Support', 'All Networks']
  },
  {
    id: 'professional',
    name: 'Professional', 
    price: 299,
    currency: 'USDC',
    requests: '5M requests/month',
    features: ['25,000 RPS', '99.95% Uptime', 'Priority Support', 'WebSocket Streaming'],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 899,
    currency: 'USDC', 
    requests: '50M requests/month',
    features: ['Unlimited RPS', '99.99% Uptime', '24/7 Support', 'Custom Infrastructure']
  }
];

interface EnterprisePaymentProcessorProps {
  selectedPlan?: string;
  onPaymentSuccess?: (planId: string, method: 'stripe' | 'crypto') => void;
  onPaymentError?: (error: Error) => void;
}

export default function EnterprisePaymentProcessor({ 
  selectedPlan = 'professional',
  onPaymentSuccess,
  onPaymentError 
}: EnterprisePaymentProcessorProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(selectedPlan);
  const { publicKey, signTransaction, connected } = useWallet();
  const [connection] = useState(() => new Connection(
    process.env.NEXT_PUBLIC_N0DE_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
  ));

  const currentPlan = PAYMENT_PLANS.find(p => p.id === selectedPlanId) || PAYMENT_PLANS[1];

  const processStripePayment = async (plan: PaymentPlan) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/payments/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          priceId: `price_n0de_${plan.id}`,
          customerId: 'current_user_id', // Replace with actual user ID
          paymentMethodTypes: ['card', 'us_bank_account']
        })
      });

      if (!response.ok) throw new Error('Failed to create subscription');
      
      const { sessionUrl } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
      
      onPaymentSuccess?.(plan.id, 'stripe');
    } catch (error) {
      console.error('Stripe payment failed:', error);
      toast.error('Payment failed. Please try again.');
      onPaymentError?.(error as Error);
    } finally {
      setProcessing(false);
    }
  };

  const processCryptoPayment = async (plan: PaymentPlan) => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    setProcessing(true);
    try {
      // Create payment transaction for USDC (simplified - in production use SPL Token transfer)
      const treasuryWallet = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports: plan.price * LAMPORTS_PER_SOL / 1000 // Convert USDC amount to SOL for demo
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signed = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'processed'
      });

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Record payment in backend
      await fetch('/api/payments/crypto/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          signature,
          amount: plan.price,
          currency: 'USDC',
          wallet: publicKey.toBase58(),
          network: 'mainnet'
        })
      });

      toast.success(`Payment successful! Welcome to ${plan.name} plan.`);
      onPaymentSuccess?.(plan.id, 'crypto');
      
    } catch (error) {
      console.error('Crypto payment failed:', error);
      toast.error('Payment failed. Please try again.');
      onPaymentError?.(error as Error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="enterprise-payment-processor">
      {/* Plan Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PAYMENT_PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            className={`card cursor-pointer transition-all ${
              selectedPlanId === plan.id 
                ? 'ring-2 ring-n0de-green border-n0de-green/50' 
                : 'hover:border-n0de-green/30'
            } ${plan.popular ? 'relative' : ''}`}
            whileHover={{ y: -2 }}
            onClick={() => setSelectedPlanId(plan.id)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-n0de-green to-n0de-blue text-black text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-lg text-text-secondary ml-1">{plan.currency}/month</span>
              </div>
              <p className="text-text-secondary mb-4">{plan.requests}</p>
              
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-n0de-green" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Payment Method Selection */}
      <div className="card mb-6">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <motion.button
              className={`p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                paymentMethod === 'stripe'
                  ? 'border-n0de-green bg-n0de-green/10'
                  : 'border-border hover:border-n0de-green/50'
              }`}
              onClick={() => setPaymentMethod('stripe')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CreditCard className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Credit Card / Bank Transfer</div>
                <div className="text-sm text-text-secondary">Powered by Stripe • Most popular</div>
              </div>
            </motion.button>

            <motion.button
              className={`p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                paymentMethod === 'crypto'
                  ? 'border-n0de-green bg-n0de-green/10'
                  : 'border-border hover:border-n0de-green/50'
              }`}
              onClick={() => setPaymentMethod('crypto')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Wallet className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Crypto Wallet (USDC)</div>
                <div className="text-sm text-text-secondary">Direct payment • Lower fees</div>
              </div>
            </motion.button>
          </div>

          {/* Payment Processing */}
          {paymentMethod === 'stripe' && (
            <div className="stripe-payment-section">
              <div className="bg-bg-main p-4 rounded-lg mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-4 h-4 text-n0de-green" />
                  <span className="text-sm font-semibold">Enterprise Security</span>
                </div>
                <p className="text-sm text-text-secondary">
                  Secure payment processing with PCI compliance and fraud protection
                </p>
              </div>
              
              <motion.button
                className="btn-primary w-full flex items-center justify-center space-x-2"
                onClick={() => processStripePayment(currentPlan)}
                disabled={processing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                <span>
                  {processing ? 'Processing...' : `Subscribe for ${currentPlan.price} ${currentPlan.currency}/month`}
                </span>
              </motion.button>
            </div>
          )}

          {paymentMethod === 'crypto' && (
            <div className="crypto-payment-section">
              <div className="bg-bg-main p-4 rounded-lg mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-4 h-4 text-n0de-green" />
                  <span className="text-sm font-semibold">Instant Settlement</span>
                </div>
                <p className="text-sm text-text-secondary">
                  Direct wallet payment with instant confirmation and lower fees
                </p>
              </div>

              {!connected ? (
                <div className="text-center">
                  <p className="text-text-secondary mb-4">Connect your wallet to continue</p>
                  <WalletMultiButton className="!bg-gradient-to-r !from-n0de-green !to-n0de-blue !text-black !font-semibold !rounded-lg !px-6 !py-3" />
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-n0de-green" />
                    <span className="text-sm">
                      Connected: {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                    </span>
                  </div>
                  
                  <motion.button
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                    onClick={() => processCryptoPayment(currentPlan)}
                    disabled={processing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wallet className="w-5 h-5" />
                    )}
                    <span>
                      {processing ? 'Processing...' : `Pay ${currentPlan.price} USDC`}
                    </span>
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Security & Support Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
          <Shield className="w-4 h-4" />
          <span>Enterprise Security</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
          <Clock className="w-4 h-4" />
          <span>24/7 Support</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
          <Zap className="w-4 h-4" />
          <span>Instant Activation</span>
        </div>
      </div>
    </div>
  );
}