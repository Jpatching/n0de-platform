'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Dynamic import with SSR disabled for payment components
const CoinbasePaymentProcessor = dynamic(
  () => import('@/components/crypto/CoinbasePaymentProcessor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-n0de-green"></div>
      </div>
    )
  }
);

export default function PaymentPage() {
  const handlePaymentSuccess = (planId: string, chargeId: string) => {
    console.log(`Payment successful: ${planId} via Coinbase Commerce (${chargeId})`);
    // Redirect to success page or dashboard
    window.location.href = '/dashboard?payment=success&plan=' + planId + '&charge=' + chargeId;
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
    // Handle error (show notification, redirect, etc.)
  };

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
                <h1 className="text-xl font-bold gradient-text">Subscribe to n0de</h1>
                <p className="text-xs text-text-secondary">Choose your enterprise plan</p>
              </div>
            </div>
            
            <div className="w-16"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-width py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Choose Your <span className="gradient-text">Enterprise Plan</span>
            </h1>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Get access to the fastest Solana RPC infrastructure with enterprise-grade security and support
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[600px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
                <p className="text-text-secondary">Loading payment options...</p>
              </div>
            </div>
          }>
            <CoinbasePaymentProcessor
              selectedPlan="professional"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          </Suspense>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <h3 className="text-lg font-semibold mb-8 text-text-secondary">Trusted by Enterprise Customers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50">
              <div className="flex items-center justify-center">
                <div className="w-24 h-8 bg-text-muted rounded"></div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-24 h-8 bg-text-muted rounded"></div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-24 h-8 bg-text-muted rounded"></div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-24 h-8 bg-text-muted rounded"></div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept cryptocurrency payments including Bitcoin (BTC), Ethereum (ETH), USD Coin (USDC), Tether (USDT), Litecoin (LTC), and Bitcoin Cash (BCH) via Coinbase Commerce."
                },
                {
                  question: "Can I change my plan later?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle."
                },
                {
                  question: "Is there a setup fee?",
                  answer: "No setup fees. You only pay the monthly subscription fee for your chosen plan."
                },
                {
                  question: "What happens if I exceed my limits?",
                  answer: "We'll notify you before you reach your limits. You can upgrade your plan or purchase additional capacity as needed."
                }
              ].map((faq, index) => (
                <div key={index} className="card">
                  <h4 className="font-semibold mb-2">{faq.question}</h4>
                  <p className="text-text-secondary text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}