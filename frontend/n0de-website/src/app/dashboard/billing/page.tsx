'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Download, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ArrowUp,
  Zap
} from 'lucide-react';

interface SubscriptionData {
  subscription: {
    id: string;
    planName: string;
    planType: string;
    status: string;
    currentPeriodEnd: string;
    plan: {
      name: string;
      price: number;
      limits: {
        requests: number;
        apiKeys: number;
        rateLimit: number;
        networks: string[];
        features: string[];
      };
    };
  };
  usage: {
    requests: {
      used: number;
      limit: number;
      percentage: number;
    };
    apiKeys: {
      used: number;
      limit: number;
    };
  };
  billing: {
    nextBillingDate: string;
    amount: number;
    status: string;
  };
}

interface PaymentStats {
  totalPayments: number;
  completedPayments: number;
  successRate: number;
  totalRevenue: number;
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

interface PlanOption {
  name: string;
  type: string;
  price: number;
  limits: {
    requests: number;
    apiKeys: number;
    rateLimit: number;
    networks: string[];
    features: string[];
  };
}

const BillingPage = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [usage, payments, plans] = await Promise.all([
        api.get<SubscriptionData>('/subscriptions/usage'),
        api.get<PaymentStats>('/payments/stats'),
        api.get<PlanOption[]>('/subscriptions/plans')
      ]);
      
      setSubscriptionData(usage);
      setPaymentStats(payments);
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType: string) => {
    try {
      setUpgrading(true);
      const result = await api.post('/subscriptions/upgrade', {
        planType,
        paymentInfo: {} // This would integrate with payment provider
      });
      
      toast.success(`Successfully upgraded to ${planType} plan!`);
      setShowUpgrade(false);
      await loadBillingData();
    } catch (error: any) {
      console.error('Upgrade failed:', error);
      toast.error(error.message || 'Failed to upgrade plan');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="text-white">Loading billing information...</div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!subscriptionData) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="text-white">Unable to load billing information</div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Billing</h1>
                <p className="text-zinc-400">
                  Manage your subscription and billing information.
                </p>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors">
                <Download className="h-4 w-4" />
                <span>Download Invoices</span>
              </button>
            </motion.div>
          </div>

          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">{subscriptionData.subscription.plan.name} Plan</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscriptionData.subscription.status === 'ACTIVE' 
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : subscriptionData.subscription.status === 'CANCELED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {subscriptionData.subscription.status.toLowerCase()}
                  </span>
                </div>
                <p className="text-zinc-300">
                  ${subscriptionData.subscription.plan.price}/month • Billed monthly
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Next billing date: {new Date(subscriptionData.billing.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex space-x-2 mb-2">
                  <button 
                    onClick={() => setShowUpgrade(!showUpgrade)}
                    className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium flex items-center space-x-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span>Upgrade Plan</span>
                  </button>
                </div>
                <p className="text-sm text-zinc-400">
                  {subscriptionData.usage.requests.used.toLocaleString()} / {subscriptionData.usage.requests.limit === -1 ? '∞' : subscriptionData.usage.requests.limit.toLocaleString()} requests used
                </p>
                <div className="w-32 h-2 bg-zinc-700 rounded-full mt-1">
                  <div 
                    className="h-2 bg-cyan-400 rounded-full transition-all duration-300"
                    style={{
                      width: subscriptionData.usage.requests.limit === -1 
                        ? '100%' 
                        : `${Math.min(subscriptionData.usage.requests.percentage, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Usage Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Usage This Month</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-white">API Requests</span>
                  </div>
                  <p className="text-xl font-bold text-white">{subscriptionData.usage.requests.used.toLocaleString()}</p>
                  <p className="text-xs text-zinc-400">
                    of {subscriptionData.usage.requests.limit === -1 ? '∞' : subscriptionData.usage.requests.limit.toLocaleString()} included
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">API Keys</span>
                  </div>
                  <p className="text-xl font-bold text-white">{subscriptionData.usage.apiKeys.used}</p>
                  <p className="text-xs text-zinc-400">
                    of {subscriptionData.usage.apiKeys.limit === -1 ? '∞' : subscriptionData.usage.apiKeys.limit} included
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Rate Limit</span>
                  </div>
                  <p className="text-xl font-bold text-white">{subscriptionData.subscription.plan.limits.rateLimit.toLocaleString()}</p>
                  <p className="text-xs text-zinc-400">requests/minute</p>
                </div>
              </div>

              <div className="h-48 bg-zinc-900/50 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">Usage chart</p>
                  <p className="text-zinc-500 text-sm">Monthly usage trends</p>
                </div>
              </div>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
                
                <div className="flex items-center space-x-3 p-3 bg-zinc-800/30 rounded-lg mb-4">
                  <div className="w-8 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">•••• •••• •••• 4242</p>
                    <p className="text-xs text-zinc-400">Expires 12/25</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                
                <button className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors">
                  Update Payment Method
                </button>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
                <div className="text-sm text-zinc-300 space-y-1">
                  <p>Acme Corporation</p>
                  <p>123 Business Ave</p>
                  <p>San Francisco, CA 94105</p>
                  <p>United States</p>
                </div>
                <button className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  Update Address
                </button>
              </div>
            </motion.div>
          </div>

          {/* Recent Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recent Invoices</h3>
                <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  View All
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {paymentStats && paymentStats.recentPayments.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-zinc-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Payment ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {paymentStats.recentPayments.map((payment, index) => (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{payment.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-zinc-300">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">${payment.amount}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${
                            payment.status === 'COMPLETED' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : payment.status === 'PENDING'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {payment.status.toLowerCase()}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-400">No payment history available</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Upgrade Plan Modal */}
          {showUpgrade && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Upgrade Your Plan</h2>
                  <button 
                    onClick={() => setShowUpgrade(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availablePlans
                    .filter(plan => plan.type !== subscriptionData.subscription.planType)
                    .map((plan) => (
                    <div
                      key={plan.type}
                      className="border border-zinc-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                        <p className="text-3xl font-bold text-cyan-400">
                          ${plan.price}
                          <span className="text-sm text-zinc-400">/month</span>
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Requests</span>
                          <span className="text-white font-medium">
                            {plan.limits.requests === -1 ? 'Unlimited' : plan.limits.requests.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">API Keys</span>
                          <span className="text-white font-medium">
                            {plan.limits.apiKeys === -1 ? 'Unlimited' : plan.limits.apiKeys}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Rate Limit</span>
                          <span className="text-white font-medium">
                            {plan.limits.rateLimit.toLocaleString()}/min
                          </span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-white mb-2">Features:</h4>
                        <ul className="space-y-1">
                          {plan.limits.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx} className="text-xs text-zinc-400 flex items-center">
                              <CheckCircle className="h-3 w-3 text-cyan-400 mr-2" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => handleUpgrade(plan.type)}
                        disabled={upgrading}
                        className="w-full px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {upgrading ? 'Upgrading...' : `Upgrade to ${plan.name}`}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default BillingPage;