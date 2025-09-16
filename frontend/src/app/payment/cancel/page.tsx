'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import Link from 'next/link';

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams?.get('paymentId');

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
                <h1 className="text-xl font-bold gradient-text">Payment Cancelled</h1>
                <p className="text-xs text-text-secondary">n0de Enterprise RPC</p>
              </div>
            </div>
            
            <Link href="/dashboard" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-width py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Cancel Status */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <XCircle className="w-12 h-12 text-yellow-500" />
            </motion.div>
            
            <h1 className="text-4xl font-bold mb-4">Payment Cancelled</h1>
            <p className="text-xl text-text-secondary mb-2">Your payment was cancelled.</p>
            <p className="text-text-muted">No charges have been made to your account.</p>
            
            {paymentId && (
              <p className="text-sm text-text-muted mt-4">
                Reference: <code className="bg-bg-elevated px-2 py-1 rounded">{paymentId}</code>
              </p>
            )}
          </motion.div>

          {/* Why was payment cancelled? */}
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Common reasons for cancellation:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-text-muted rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Changed your mind</div>
                    <div className="text-sm text-text-secondary">That&apos;s okay! Feel free to explore our plans when you&apos;re ready.</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-text-muted rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Payment method issues</div>
                    <div className="text-sm text-text-secondary">Try a different payment method or contact your bank.</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-text-muted rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Session timeout</div>
                    <div className="text-sm text-text-secondary">Payment sessions expire after 30 minutes for security.</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* What to do next */}
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Ready to try again?</h3>
              <p className="text-text-secondary mb-6">
                Our RPC infrastructure powers thousands of applications on Solana.
                Join the n0de network today!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-bg-main rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-n0de-green mb-1">99.99%</div>
                  <div className="text-sm text-text-secondary">Uptime SLA</div>
                </div>
                <div className="bg-bg-main rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-n0de-blue mb-1">50ms</div>
                  <div className="text-sm text-text-secondary">Avg Response</div>
                </div>
                <div className="bg-bg-main rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-n0de-purple mb-1">24/7</div>
                  <div className="text-sm text-text-secondary">Support</div>
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
            <Link href="/checkout" className="btn-primary flex items-center justify-center space-x-2 flex-1">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Link>
            
            <Link href="/pricing" className="btn-secondary flex items-center justify-center space-x-2 flex-1">
              <ArrowLeft className="w-4 h-4" />
              <span>View Plans</span>
            </Link>
          </motion.div>

          {/* Contact Support */}
          <motion.div 
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="inline-flex items-center space-x-2 text-text-secondary text-sm">
              <HelpCircle className="w-4 h-4" />
              <span>
                Having trouble?{' '}
                <a href="mailto:support@n0de.pro" className="text-n0de-blue hover:underline">
                  Contact support
                </a>
                {' '}or{' '}
                <Link href="/docs/payments" className="text-n0de-blue hover:underline">
                  view payment FAQ
                </Link>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-n0de-green"></div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}