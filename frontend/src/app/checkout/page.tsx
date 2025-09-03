'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Bitcoin, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Plan {
  type: string;
  name: string;
  price: number;
  limits: {
    requests: number;
    apiKeys: number;
    rateLimit: number;
    networks: string[];
    features: string[];
  };
}

const PLANS: Record<string, Plan> = {
  STARTER: {
    type: 'STARTER',
    name: 'Starter',
    price: 49,
    limits: {
      requests: 1000000,
      apiKeys: 3,
      rateLimit: 1000,
      networks: ['mainnet', 'devnet', 'testnet'],
      features: ['Priority RPC', 'Email Support', 'Basic Analytics'],
    },
  },
  PROFESSIONAL: {
    type: 'PROFESSIONAL',
    name: 'Professional',
    price: 299,
    limits: {
      requests: 10000000,
      apiKeys: 10,
      rateLimit: 5000,
      networks: ['mainnet', 'devnet', 'testnet'],
      features: ['Priority RPC', 'Websockets', 'Priority Support', 'Advanced Analytics', 'Custom Domains'],
    },
  },
  ENTERPRISE: {
    type: 'ENTERPRISE',
    name: 'Enterprise',
    price: 999,
    limits: {
      requests: -1,
      apiKeys: -1,
      rateLimit: 25000,
      networks: ['mainnet', 'devnet', 'testnet', 'custom'],
      features: [
        'Dedicated Infrastructure',
        'Yellowstone gRPC',
        '24/7 Phone Support',
        'SLA Guarantee',
        'Custom Integration',
        'White-label Options',
      ],
    },
  },
};

function CheckoutContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planType = searchParams.get('plan') || 'STARTER';
  
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[planType] || PLANS.STARTER);
  const [selectedProvider, setSelectedProvider] = useState<'COINBASE_COMMERCE' | 'NOWPAYMENTS'>('COINBASE_COMMERCE');
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login?redirect=/checkout');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam && PLANS[planParam]) {
      setSelectedPlan(PLANS[planParam]);
    }
  }, [searchParams]);

  const handlePlanChange = (planKey: string) => {
    setSelectedPlan(PLANS[planKey]);
    // Update URL without page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('plan', planKey);
    window.history.replaceState({}, '', newUrl.toString());
  };

  const handlePayment = async () => {
    if (!user) return;

    setIsCreatingPayment(true);
    setPaymentError(null);

    try {
      const paymentData = await api.post('/payments', {
        provider: selectedProvider,
        planType: selectedPlan.type,
        amount: selectedPlan.price,
        currency: 'USD',
      });

      // Redirect to payment URL
      if (selectedProvider === 'COINBASE_COMMERCE' && paymentData.chargeUrl) {
        window.location.href = paymentData.chargeUrl;
      } else if (selectedProvider === 'NOWPAYMENTS' && paymentData.paymentUrl) {
        window.location.href = paymentData.paymentUrl;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error: any) {
      console.error('Payment creation failed:', error);
      setPaymentError(error.message || 'Failed to create payment');
      toast.error('Payment creation failed. Please try again.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center space-x-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">n</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Checkout</h1>
                <p className="text-xs text-text-secondary">Complete your subscription</p>
              </div>
            </div>
            
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="container-width py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Plan Selection */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Select Plan</h2>
              <div className="space-y-4">
                {Object.entries(PLANS).map(([key, plan]) => (
                  <div
                    key={key}
                    className={`card cursor-pointer transition-all ${
                      selectedPlan.type === plan.type
                        ? 'ring-2 ring-n0de-green bg-bg-elevated'
                        : 'hover:bg-bg-elevated'
                    }`}
                    onClick={() => handlePlanChange(key)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{plan.name}</h3>
                          {selectedPlan.type === plan.type && (
                            <CheckCircle className="w-5 h-5 text-n0de-green" />
                          )}
                        </div>
                        <p className="text-2xl font-bold mb-4">
                          ${plan.price}<span className="text-sm font-normal text-text-secondary">/month</span>
                        </p>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-text-secondary">
                            {plan.limits.requests === -1 ? 'Unlimited' : plan.limits.requests.toLocaleString()} requests/month
                          </p>
                          <p className="text-sm text-text-secondary">
                            {plan.limits.apiKeys === -1 ? 'Unlimited' : plan.limits.apiKeys} API keys
                          </p>
                          <p className="text-sm text-text-secondary">
                            {plan.limits.rateLimit.toLocaleString()} RPS rate limit
                          </p>
                        </div>
                        <div className="space-y-1">
                          {plan.limits.features.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm text-text-secondary">
                              <CheckCircle className="w-3 h-3 text-n0de-green flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                          {plan.limits.features.length > 3 && (
                            <p className="text-xs text-text-muted">+{plan.limits.features.length - 3} more features</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method & Checkout */}
            <div>
              <div className="sticky top-8">
                <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
                
                {/* Payment Provider Selection */}
                <div className="space-y-4 mb-8">
                  <div
                    className={`card cursor-pointer transition-all ${
                      selectedProvider === 'COINBASE_COMMERCE'
                        ? 'ring-2 ring-n0de-green bg-bg-elevated'
                        : 'hover:bg-bg-elevated'
                    }`}
                    onClick={() => setSelectedProvider('COINBASE_COMMERCE')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bitcoin className="w-6 h-6 text-orange-500" />
                        <div>
                          <h3 className="font-semibold">Cryptocurrency</h3>
                          <p className="text-sm text-text-secondary">BTC, ETH, USDC, USDT via Coinbase</p>
                        </div>
                      </div>
                      {selectedProvider === 'COINBASE_COMMERCE' && (
                        <CheckCircle className="w-5 h-5 text-n0de-green" />
                      )}
                    </div>
                  </div>

                  <div
                    className={`card cursor-pointer transition-all ${
                      selectedProvider === 'NOWPAYMENTS'
                        ? 'ring-2 ring-n0de-green bg-bg-elevated'
                        : 'hover:bg-bg-elevated'
                    }`}
                    onClick={() => setSelectedProvider('NOWPAYMENTS')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-6 h-6 text-blue-500" />
                        <div>
                          <h3 className="font-semibold">Crypto Payments</h3>
                          <p className="text-sm text-text-secondary">200+ cryptocurrencies via NOWPayments</p>
                        </div>
                      </div>
                      {selectedProvider === 'NOWPAYMENTS' && (
                        <CheckCircle className="w-5 h-5 text-n0de-green" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="card mb-8">
                  <h3 className="font-semibold mb-4">Order Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>{selectedPlan.name} Plan</span>
                      <span>${selectedPlan.price}</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total (Monthly)</span>
                        <span>${selectedPlan.price}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {paymentError && (
                  <div className="card border-red-500 bg-red-500/10 mb-6">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-500">Payment Error</h4>
                        <p className="text-sm text-red-400 mt-1">{paymentError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handlePayment}
                  disabled={isCreatingPayment}
                  className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingPayment ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                      <span>Creating Payment...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Secure Checkout - ${selectedPlan.price}/mo</span>
                    </div>
                  )}
                </button>

                {/* Security Note */}
                <div className="text-center mt-4">
                  <p className="text-xs text-text-secondary">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Payments are processed securely. We don't store your payment information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}