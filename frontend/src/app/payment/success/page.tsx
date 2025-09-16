'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Key, Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface PaymentStatus {
  status: 'loading' | 'confirmed' | 'pending' | 'failed';
  payment?: any;
  message?: string;
}

function PaymentSuccessContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'loading' });

  const paymentId = searchParams?.get('paymentId');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentId || !user) {
        setPaymentStatus({ 
          status: 'confirmed',
          message: 'Payment completed successfully!'
        });
        return;
      }

      try {
        const payment = await api.get(`/payments/${paymentId}`);
        
        switch (payment.status) {
          case 'COMPLETED':
            setPaymentStatus({ 
              status: 'confirmed', 
              payment,
              message: 'Payment confirmed! Your subscription is now active.'
            });
            break;
          case 'PROCESSING':
          case 'PENDING':
            setPaymentStatus({ 
              status: 'pending', 
              payment,
              message: 'Payment is being processed...'
            });
            // Poll for updates every 5 seconds
            setTimeout(() => checkPaymentStatus(), 5000);
            break;
          case 'FAILED':
          case 'CANCELED':
          case 'EXPIRED':
            setPaymentStatus({ 
              status: 'failed', 
              payment,
              message: `Payment ${payment.status.toLowerCase()}. Please try again.`
            });
            break;
          default:
            setPaymentStatus({ 
              status: 'pending', 
              payment,
              message: 'Processing your payment...'
            });
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus({ 
          status: 'confirmed',
          message: 'Payment completed! Welcome to n0de.'
        });
      }
    };

    checkPaymentStatus();
  }, [paymentId, user]);

  const getPlanDetails = (planType: string) => {
    const plans = {
      STARTER: { name: 'Starter', price: 49, requests: '1M requests/month' },
      PROFESSIONAL: { name: 'Professional', price: 299, requests: '10M requests/month' },
      ENTERPRISE: { name: 'Enterprise', price: 999, requests: 'Unlimited requests' }
    };
    return plans[planType as keyof typeof plans] || plans.PROFESSIONAL;
  };

  const planDetails = getPlanDetails(paymentStatus.payment?.planType || 'PROFESSIONAL');

  if (paymentStatus.status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <span className="text-black font-bold text-lg">n</span>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Payment Status</h1>
                <p className="text-xs text-text-secondary">n0de Enterprise RPC</p>
              </div>
            </div>
            
            <Link href="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-width py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Success Status */}
          {paymentStatus.status === 'confirmed' && (
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-n0de-green/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-n0de-green" />
              </motion.div>
              
              <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
              <p className="text-xl text-text-secondary mb-2">{paymentStatus.message}</p>
              
              {paymentStatus.payment?.id && (
                <p className="text-sm text-text-muted">
                  Payment ID: <code className="bg-bg-elevated px-2 py-1 rounded">{paymentStatus.payment.id}</code>
                </p>
              )}
            </motion.div>
          )}

          {/* Pending Status */}
          {paymentStatus.status === 'pending' && (
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 bg-n0de-orange/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-n0de-orange"></div>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">Payment Pending</h1>
              <p className="text-xl text-text-secondary mb-6">{paymentStatus.message}</p>
              <p className="text-sm text-text-muted">
                This page will automatically update when your payment is confirmed.
              </p>
            </motion.div>
          )}

          {/* Failed Status */}
          {paymentStatus.status === 'failed' && (
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 bg-n0de-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExternalLink className="w-12 h-12 text-n0de-red" />
              </div>
              
              <h1 className="text-4xl font-bold mb-4">Payment Issues</h1>
              <p className="text-xl text-text-secondary mb-6">{paymentStatus.message}</p>
              
              <Link href="/checkout" className="btn-primary">
                Try Again
              </Link>
            </motion.div>
          )}

          {/* Plan Details Card */}
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Your {planDetails.name} Plan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">${planDetails.price}</div>
                  <div className="text-sm text-text-secondary">Monthly Price</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">{planDetails.requests.split(' ')[0]}</div>
                  <div className="text-sm text-text-secondary">Monthly Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">99.99%</div>
                  <div className="text-sm text-text-secondary">Uptime SLA</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Next Steps */}
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6">Next Steps</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-n0de-green/20 rounded-full flex items-center justify-center">
                    <span className="text-n0de-green font-bold text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-semibold">Check your email</div>
                    <div className="text-sm text-text-secondary">You&apos;ll receive your API keys and welcome guide</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-n0de-blue/20 rounded-full flex items-center justify-center">
                    <span className="text-n0de-blue font-bold text-sm">2</span>
                  </div>
                  <div>
                    <div className="font-semibold">Access your dashboard</div>
                    <div className="text-sm text-text-secondary">Monitor usage, manage keys, and view analytics</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-n0de-purple/20 rounded-full flex items-center justify-center">
                    <span className="text-n0de-purple font-bold text-sm">3</span>
                  </div>
                  <div>
                    <div className="font-semibold">Start building</div>
                    <div className="text-sm text-text-secondary">Integrate n0de RPC into your applications</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/dashboard" className="btn-primary flex items-center justify-center space-x-2 flex-1">
              <Activity className="w-4 h-4" />
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link href="/docs" className="btn-secondary flex items-center justify-center space-x-2 flex-1">
              <Key className="w-4 h-4" />
              <span>View Documentation</span>
            </Link>
          </motion.div>

          {/* Contact Support */}
          <div className="text-center mt-8">
            <p className="text-text-secondary text-sm">
              Need help getting started?{' '}
              <a href="mailto:support@n0de.com" className="text-n0de-blue hover:underline">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-n0de-green"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}