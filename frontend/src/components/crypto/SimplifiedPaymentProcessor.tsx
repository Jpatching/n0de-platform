'use client';

import React, { useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle, 
  Loader2,
  Shield,
  Clock,
  Zap,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from './SimplifiedWalletProvider';

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

interface SimplifiedPaymentProcessorProps {
  selectedPlan?: string;
  onPaymentSuccess?: (planId: string, method: 'stripe' | 'crypto') => void;
  onPaymentError?: (error: Error) => void;
}

export default function SimplifiedPaymentProcessor({ 
  selectedPlan = 'professional',
  onPaymentSuccess,
  onPaymentError 
}: SimplifiedPaymentProcessorProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(selectedPlan);
  const { publicKey, connect, connected, connecting } = useWallet();

  const currentPlan = PAYMENT_PLANS.find(p => p.id === selectedPlanId) || PAYMENT_PLANS[1];

  const processStripePayment = async (plan: PaymentPlan) => {
    setProcessing(true);
    try {
      // In production, this would redirect to Stripe Checkout
      toast.success('Redirecting to Stripe Checkout...');
      
      // Simulate Stripe redirect
      setTimeout(() => {
        onPaymentSuccess?.(plan.id, 'stripe');
        setProcessing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Stripe payment failed:', error);
      toast.error('Payment failed. Please try again.');
      onPaymentError?.(error as Error);
      setProcessing(false);
    }
  };

  const processCryptoPayment = async (plan: PaymentPlan) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setProcessing(true);
    try {
      toast.success('Payment processing simulated successfully!');
      toast.info('In production, this would create a real USDC transaction');
      
      // Simulate successful payment
      setTimeout(() => {
        onPaymentSuccess?.(plan.id, 'crypto');
        setProcessing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Crypto payment failed:', error);
      toast.error('Payment failed. Please try again.');
      onPaymentError?.(error as Error);
      setProcessing(false);
    }
  };

  const handleWalletConnect = async () => {
    try {
      await connect();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      toast.error('Failed to connect wallet. Please install Phantom wallet.');
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
                  <p className="text-text-secondary mb-4">Connect your Phantom wallet to continue</p>
                  <motion.button
                    className="btn-primary flex items-center justify-center space-x-2 mx-auto"
                    onClick={handleWalletConnect}
                    disabled={connecting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {connecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wallet className="w-5 h-5" />
                    )}
                    <span>{connecting ? 'Connecting...' : 'Connect Phantom Wallet'}</span>
                  </motion.button>
                  
                  <div className="mt-4 text-sm text-text-secondary">
                    Don&apos;t have Phantom? 
                    <a 
                      href="https://phantom.app/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-n0de-blue hover:underline ml-1 inline-flex items-center"
                    >
                      Install here <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
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
                  
                  <div className="mt-3 text-xs text-text-secondary text-center">
                    <strong>Demo Mode:</strong> This is a simulation. No real transaction will occur.
                  </div>
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