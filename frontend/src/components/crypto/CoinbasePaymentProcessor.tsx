'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard,
  CheckCircle,
  Loader2,
  Shield,
  Zap,
  ExternalLink,
  Bitcoin,
  Coins,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: 'USD';
  requests: string;
  features: string[];
  popular?: boolean;
}

// Map to match backend SubscriptionType enum
const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 99,
    currency: 'USD',
    requests: '1M requests/month',
    features: ['5,000 RPS', '99.9% Uptime', 'Standard Support', 'All Networks']
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional', 
    price: 299,
    currency: 'USD',
    requests: '5M requests/month',
    features: ['25,000 RPS', '99.95% Uptime', 'Priority Support', 'WebSocket Streaming'],
    popular: true
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 899,
    currency: 'USD', 
    requests: '50M requests/month',
    features: ['Unlimited RPS', '99.99% Uptime', '24/7 Support', 'Custom Infrastructure']
  }
];

interface CoinbasePaymentProcessorProps {
  selectedPlan?: string;
  customerEmail?: string;
  customerName?: string;
  onPaymentSuccess?: (planId: string, chargeId: string) => void;
  onPaymentError?: (error: Error) => void;
}

export default function CoinbasePaymentProcessor({ 
  selectedPlan = 'PROFESSIONAL',
  customerEmail = '',
  customerName = '',
  onPaymentSuccess,
  onPaymentError 
}: CoinbasePaymentProcessorProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(selectedPlan);
  const [email, setEmail] = useState(customerEmail);
  const [name, setName] = useState(customerName);
  const [processing, setProcessing] = useState(false);

  const currentPlan = PAYMENT_PLANS.find(p => p.id === selectedPlanId) || PAYMENT_PLANS[1];

  // Supported cryptocurrencies by Coinbase Commerce
  const supportedCryptos = [
    { symbol: 'BTC', name: 'Bitcoin', icon: Bitcoin },
    { symbol: 'ETH', name: 'Ethereum', icon: Coins },
    { symbol: 'USDC', name: 'USD Coin', icon: DollarSign },
    { symbol: 'USDT', name: 'Tether', icon: DollarSign },
    { symbol: 'LTC', name: 'Litecoin', icon: Coins },
    { symbol: 'BCH', name: 'Bitcoin Cash', icon: Bitcoin }
  ];

  const handleCoinbasePayment = async (plan: PaymentPlan) => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setProcessing(true);
    
    try {
      // Create Coinbase Commerce charge via backend
      const response = await api.post<any>('/payments', {
        provider: 'COINBASE_COMMERCE',
        planType: plan.id, // This maps to SubscriptionType enum (STARTER, PROFESSIONAL, ENTERPRISE)
        amount: plan.price,
        currency: plan.currency || 'USD'
      });

      if (response && (response.chargeUrl || response.paymentUrl)) {
        const paymentUrl = response.chargeUrl || response.paymentUrl;
        toast.success('Redirecting to Coinbase Commerce...');
        
        // Redirect to Coinbase Commerce hosted checkout
        window.location.href = paymentUrl;
        
        // Call success callback
        onPaymentSuccess?.(plan.id, response.id);
      } else {
        throw new Error('Invalid response from payment service');
      }
      
    } catch (error) {
      console.error('Coinbase payment error:', error);
      toast.error('Payment failed. Please try again.');
      onPaymentError?.(error as Error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="coinbase-payment-processor">
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
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-lg text-text-secondary ml-1">/month</span>
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

      {/* Customer Information */}
      <div className="card mb-6">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-bg-main border border-border rounded-lg focus:ring-2 focus:ring-n0de-green/20 focus:border-n0de-green transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 bg-bg-main border border-border rounded-lg focus:ring-2 focus:ring-n0de-green/20 focus:border-n0de-green transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Coinbase Commerce Payment Section */}
      <div className="card mb-6">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Pay with Cryptocurrency</h3>
          
          {/* Coinbase Commerce Features */}
          <div className="bg-bg-main p-4 rounded-lg mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="w-5 h-5 text-n0de-green" />
              <span className="font-semibold">Powered by Coinbase Commerce</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-text-secondary">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-n0de-blue" />
                <span>1% transaction fee</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-n0de-purple" />
                <span>Enterprise security</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Instant settlement</span>
              </div>
            </div>
          </div>

          {/* Supported Cryptocurrencies */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Supported Cryptocurrencies</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {supportedCryptos.map((crypto) => (
                <div key={crypto.symbol} className="flex items-center space-x-2 p-3 bg-bg-hover rounded-lg">
                  <crypto.icon className="w-5 h-5 text-n0de-orange" />
                  <span className="font-medium">{crypto.symbol}</span>
                  <span className="text-sm text-text-secondary">({crypto.name})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Amount Summary */}
          <div className="bg-gradient-to-r from-n0de-green/10 to-n0de-blue/10 border border-n0de-green/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-lg">{currentPlan.name}</h4>
                <p className="text-text-secondary">{currentPlan.requests}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold gradient-text">${currentPlan.price}</div>
                <div className="text-sm text-text-secondary">USD equivalent</div>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <motion.button
            className="btn-primary w-full flex items-center justify-center space-x-2"
            onClick={() => handleCoinbasePayment(currentPlan)}
            disabled={processing || !email}
            whileHover={{ scale: processing ? 1 : 1.02 }}
            whileTap={{ scale: processing ? 1 : 0.98 }}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating payment...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay ${currentPlan.price} with Crypto</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </motion.button>

          <div className="mt-4 text-xs text-text-secondary text-center">
            You will be redirected to Coinbase Commerce to complete your payment securely
          </div>
        </div>
      </div>

      {/* Security & Trust Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
          <Shield className="w-4 h-4" />
          <span>Bank-level Security</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
          <CheckCircle className="w-4 h-4" />
          <span>Instant Confirmation</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
          <Zap className="w-4 h-4" />
          <span>Low 1% Fee</span>
        </div>
      </div>
    </div>
  );
}