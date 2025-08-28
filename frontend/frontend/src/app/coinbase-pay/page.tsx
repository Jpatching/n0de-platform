'use client';

import { useState } from 'react';
import Layout from '../../components/Layout';
import { CoinbasePayButton } from '../../components/CoinbasePay/CoinbasePayButton';
import { 
  CreditCard, 
  Shield, 
  Zap, 
  Globe, 
  CheckCircle,
  ArrowRight,
  Wallet,
  Star
} from 'lucide-react';

export default function CoinbasePayPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-orange-400" />,
      title: "Instant SOL Delivery",
      description: "Funds appear in your vault immediately after payment confirmation"
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      title: "Enterprise Security",
      description: "Powered by Coinbase Commerce infrastructure with bank-level protection"
    },
    {
      icon: <Globe className="w-6 h-6 text-green-400" />,
      title: "Global Coverage",
      description: "Available in 100+ countries with multiple payment methods"
    },
    {
      icon: <Wallet className="w-6 h-6 text-purple-400" />,
      title: "Direct Vault Deposit",
      description: "SOL automatically deposited to your secure session vault for gaming"
    }
  ];

  const paymentMethods = [
    { name: "Credit Cards", icon: "💳", supported: ["Visa", "Mastercard", "American Express"] },
    { name: "Debit Cards", icon: "💳", supported: ["Visa Debit", "Mastercard Debit"] },
    { name: "Bank Transfer", icon: "🏦", supported: ["ACH", "Wire Transfer"] },
    { name: "Digital Wallets", icon: "📱", supported: ["Apple Pay", "Google Pay"] }
  ];

  const handlePaymentComplete = (amount: string) => {
    // Handle successful payment
    console.log(`Payment completed: ${amount} SOL`);
  };

  return (
    <Layout currentPage="coinbase-pay" title="" subtitle="" showWalletStatus={false}>
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {/* Hero Section */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
            <CreditCard className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
          </div>
          <h1 className="text-2xl lg:text-4xl font-audiowide text-text-primary mb-3 lg:mb-4">
            💳 COINBASE PAY INTEGRATION
          </h1>
          <p className="text-text-secondary text-base lg:text-lg max-w-3xl mx-auto mb-4 lg:mb-6 px-4">
            The fastest way to buy SOL and start gaming. Powered by Coinbase Commerce for 
            enterprise-grade security and instant delivery to your PV3 vault.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4 text-sm px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">Coinbase Partner</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Instant Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-medium">Global Access</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8 lg:mb-12">
          
          {/* Purchase Panel */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <CreditCard className="w-6 h-6 text-green-400" />
              <h2 className="text-xl lg:text-2xl font-audiowide text-text-primary">Buy SOL Instantly</h2>
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold">
                LIVE
              </span>
            </div>

            {/* Quick Amount Selection */}
            <div className="mb-6">
              <label className="block text-text-secondary text-sm font-audiowide mb-3">
                QUICK SELECT (USD)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`p-3 rounded-lg border transition-all font-audiowide touch-manipulation ${
                      selectedAmount === amount
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-bg-card border-border text-text-secondary hover:border-green-500/50 hover:text-text-primary'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase Button */}
            <CoinbasePayButton
              variant="default"
              size="default"
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 font-audiowide text-base lg:text-lg py-4 touch-manipulation"
              onPaymentComplete={handlePaymentComplete}
              defaultAmount={selectedAmount}
            />

            <div className="mt-4 text-center">
              <p className="text-xs text-text-muted">
                Minimum $1 • Maximum $10,000 • Powered by 
                <span className="text-blue-400 font-medium"> Coinbase Commerce</span>
              </p>
            </div>
          </div>

          {/* Features Panel */}
          <div className="space-y-6">
            <div className="bg-bg-elevated border border-border rounded-2xl p-6 lg:p-8">
              <h2 className="text-xl lg:text-2xl font-audiowide text-text-primary mb-6">Why Choose Coinbase Pay?</h2>
              <div className="space-y-4 lg:space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-bg-card rounded-lg flex items-center justify-center flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-audiowide text-text-primary mb-1 text-sm lg:text-base">{feature.title}</h3>
                      <p className="text-xs lg:text-sm text-text-secondary">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-bg-elevated border border-border rounded-2xl p-6 lg:p-8">
              <h2 className="text-lg lg:text-xl font-audiowide text-text-primary mb-4 lg:mb-6">Supported Payment Methods</h2>
              <div className="grid grid-cols-1 gap-3 lg:gap-4">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="bg-bg-card rounded-lg p-3 lg:p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl lg:text-2xl">{method.icon}</span>
                      <span className="font-audiowide text-text-primary text-sm lg:text-base">{method.name}</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {method.supported.join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-bg-elevated border border-border rounded-2xl p-6 lg:p-8 mb-8 lg:mb-12">
          <h2 className="text-xl lg:text-2xl font-audiowide text-text-primary text-center mb-6 lg:mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Select Amount",
                description: "Choose how much SOL you want to buy",
                icon: <CreditCard className="w-6 h-6 text-green-400" />
              },
              {
                step: "2", 
                title: "Pay with Card",
                description: "Complete payment via Coinbase Commerce",
                icon: <Shield className="w-6 h-6 text-blue-400" />
              },
              {
                step: "3",
                title: "Instant Delivery",
                description: "SOL appears in your vault immediately",
                icon: <Zap className="w-6 h-6 text-orange-400" />
              },
              {
                step: "4",
                title: "Start Gaming",
                description: "Play any game with your SOL balance",
                icon: <Star className="w-6 h-6 text-purple-400" />
              }
            ].map((step, index) => (
              <div key={index} className="text-center relative">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-bg-card rounded-full flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="text-sm font-audiowide text-accent-primary mb-2">STEP {step.step}</div>
                <h3 className="font-audiowide text-text-primary mb-2 text-sm lg:text-base">{step.title}</h3>
                <p className="text-xs lg:text-sm text-text-secondary">{step.description}</p>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-6 lg:top-8 left-full w-full">
                    <ArrowRight className="w-4 h-4 lg:w-6 lg:h-6 text-text-muted mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-2xl p-6 lg:p-8 text-center">
          <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-lg lg:text-xl font-audiowide text-text-primary mb-4">Enterprise-Grade Security</h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-sm lg:text-base">
            Your payments are processed through Coinbase Commerce, the same infrastructure trusted by 
            thousands of businesses worldwide. All transactions are secured with bank-level encryption 
            and fraud protection.
          </p>
        </div>
      </div>
    </Layout>
  );
} 