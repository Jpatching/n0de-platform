'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Bitcoin, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/lib/api';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Plan {
  type: string;
  name: string;
  price: number;
}

interface PaymentMethodsProps {
  selectedPlan: Plan;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

interface StripeCardFormProps {
  selectedPlan: Plan;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function StripeCardForm({ selectedPlan, onSuccess, onError }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      onError('Stripe not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const { clientSecret } = await api.post('/payments/stripe/create-intent', {
        plan: selectedPlan.type,
        amount: selectedPlan.price * 100, // Convert to cents
      });

      // Confirm card payment
      const cardElement = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement!,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      onError(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Pay with Card</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStripePayment} className="space-y-4">
          <div className="p-4 border border-border rounded-lg bg-bg-main">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#ffffff',
                    '::placeholder': {
                      color: '#6b7280',
                    },
                  },
                  invalid: {
                    color: '#ef4444',
                  },
                },
                hidePostalCode: false,
              }}
            />
          </div>
          
          <div className="bg-bg-main rounded-lg p-3 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Plan:</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-secondary">Amount:</span>
              <span className="font-medium">${selectedPlan.price}/month</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                Pay ${selectedPlan.price}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface CryptoPaymentProps {
  selectedPlan: Plan;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function CryptoPayment({ selectedPlan, onSuccess, onError }: CryptoPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCoinbasePayment = async () => {
    setIsProcessing(true);
    
    try {
      const paymentData = await api.post('/payments/create-checkout', {
        plan: selectedPlan.type,
        provider: 'COINBASE_COMMERCE',
      });

      if (paymentData.checkoutUrl) {
        // Redirect to Coinbase Commerce hosted checkout
        window.location.href = paymentData.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Coinbase payment error:', error);
      onError(error.message || 'Failed to create crypto payment');
      setIsProcessing(false);
    }
  };

  const handleNOWPayments = async () => {
    setIsProcessing(true);
    
    try {
      const paymentData = await api.post('/payments/create-checkout', {
        plan: selectedPlan.type,
        provider: 'NOWPAYMENTS',
      });

      if (paymentData.checkoutUrl) {
        window.location.href = paymentData.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('NOWPayments error:', error);
      onError(error.message || 'Failed to create crypto payment');
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bitcoin className="w-5 h-5" />
          <span>Pay with Crypto</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-bg-main rounded-lg p-3 border border-border">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Plan:</span>
            <span className="font-medium">{selectedPlan.name}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-text-secondary">Amount:</span>
            <span className="font-medium">${selectedPlan.price} USD</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={handleCoinbasePayment}
            disabled={isProcessing}
            variant="outline"
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Bitcoin className="w-4 h-4 mr-2" />
            )}
            Coinbase Commerce
          </Button>

          <Button
            onClick={handleNOWPayments}
            disabled={isProcessing}
            variant="outline"
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Bitcoin className="w-4 h-4 mr-2" />
            )}
            NOWPayments
          </Button>
        </div>

        <div className="text-xs text-text-secondary bg-bg-main rounded p-2 border border-border">
          <div className="font-medium mb-1">Supported Cryptocurrencies:</div>
          <div>Bitcoin (BTC), Ethereum (ETH), USDC, USDT, Litecoin (LTC), Bitcoin Cash (BCH), Solana (SOL)</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentMethods({ selectedPlan, onPaymentSuccess, onPaymentError }: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'crypto'>('card');

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="flex space-x-1 bg-bg-elevated rounded-lg p-1">
        <Button
          variant={selectedMethod === 'card' ? 'default' : 'ghost'}
          onClick={() => setSelectedMethod('card')}
          className="flex-1"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Credit Card
        </Button>
        <Button
          variant={selectedMethod === 'crypto' ? 'default' : 'ghost'}
          onClick={() => setSelectedMethod('crypto')}
          className="flex-1"
        >
          <Bitcoin className="w-4 h-4 mr-2" />
          Cryptocurrency
        </Button>
      </div>

      {/* Payment Forms */}
      {selectedMethod === 'card' ? (
        <Elements stripe={stripePromise}>
          <StripeCardForm
            selectedPlan={selectedPlan}
            onSuccess={onPaymentSuccess}
            onError={onPaymentError}
          />
        </Elements>
      ) : (
        <CryptoPayment
          selectedPlan={selectedPlan}
          onSuccess={onPaymentSuccess}
          onError={onPaymentError}
        />
      )}

      {/* Security Notice */}
      <div className="flex items-start space-x-2 text-xs text-text-secondary bg-bg-main rounded p-3 border border-border">
        <CheckCircle className="w-4 h-4 text-n0de-green mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium text-text-primary mb-1">Secure Payment</div>
          <div>
            All payments are processed securely through our certified payment partners. 
            Your payment information is encrypted and never stored on our servers.
          </div>
        </div>
      </div>
    </div>
  );
}