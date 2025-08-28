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
      overage: number;
      overageCost: string;
    };
    computeUnits: {
      used: number;
      cost: string;
    };
    apiKeys: {
      used: number;
      limit: number;
    };
    rateLimit: {
      limit: number;
      window: string;
    };
  };
  billing: {
    nextBillingDate: string;
    amount: number;
    estimatedOverage: number;
    status: string;
  };
}

interface RealTimeUsageData {
  requests: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number | string;
  };
  computeUnits: {
    used: number;
    cost: string;
  };
  rateLimit: {
    used: number;
    limit: number;
    remaining: number;
    resetTime: number;
  };
  period: {
    start: string;
    end: string;
    daysRemaining: number;
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

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
  const [realTimeUsage, setRealTimeUsage] = useState<RealTimeUsageData | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [payingOverage, setPayingOverage] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);
  const [loadingPaymentData, setLoadingPaymentData] = useState(false);

  useEffect(() => {
    loadBillingData();
    loadRealTimeUsage();
    
    // Set up real-time data refresh every 30 seconds
    const interval = setInterval(() => {
      loadRealTimeUsage();
    }, 30000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
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
      
      // Load payment methods and billing address
      loadPaymentData();
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPaymentData = async () => {
    try {
      setLoadingPaymentData(true);
      
      // Try to load real payment methods and billing address
      try {
        const [methods, address] = await Promise.all([
          api.get<PaymentMethod[]>('/users/payment-methods'),
          api.get<BillingAddress>('/users/billing-address')
        ]);
        
        if (methods && Array.isArray(methods)) {
          setPaymentMethods(methods);
        }
        
        if (address && address.name) {
          setBillingAddress(address);
        }
      } catch (apiError) {
        // If APIs don't exist yet, show empty state instead of placeholder
        console.log('Payment data APIs not available yet');
        setPaymentMethods([]);
        setBillingAddress(null);
      }
    } finally {
      setLoadingPaymentData(false);
    }
  };
  
  const loadRealTimeUsage = async () => {
    try {
      const realtimeData = await api.get<RealTimeUsageData>('/subscriptions/usage/realtime');
      setRealTimeUsage(realtimeData);
    } catch (error) {
      console.error('Failed to load real-time usage:', error);
    }
  };

  const handleUpgrade = async (planType: string) => {
    try {
      setUpgrading(true);
      
      // Use secure checkout flow - create payment session first
      const result = await api.post('/subscriptions/upgrade/checkout', {
        planType,
        paymentProvider: 'STRIPE'
      });
      
      if (result.checkoutUrl) {
        toast.success(`Redirecting to secure checkout for ${result.planName} plan...`);
        
        // Redirect to Stripe checkout page
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Upgrade failed:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create checkout session');
    } finally {
      setUpgrading(false);
    }
  };

  const handleOveragePayment = async () => {
    if (!subscriptionData || subscriptionData.usage.requests.overage <= 0) {
      toast.error('No overage to pay for');
      return;
    }
    
    try {
      setPayingOverage(true);
      const result = await api.post('/payments/overage');
      
      toast.success('Overage payment created! Redirecting to payment...');
      
      // Redirect to payment URL
      if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank');
      }
      
      // Refresh data after payment creation
      setTimeout(async () => {
        await Promise.all([loadBillingData(), loadRealTimeUsage()]);
      }, 1000);
      
    } catch (error: any) {
      console.error('Overage payment failed:', error);
      toast.error(error.response?.data?.message || 'Failed to create overage payment');
    } finally {
      setPayingOverage(false);
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
                {subscriptionData.billing.estimatedOverage > 0 && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                    <AlertCircle className="h-3 w-3 text-yellow-400 inline mr-1" />
                    <span className="text-yellow-400">Estimated overage: ${subscriptionData.billing.estimatedOverage.toFixed(2)}</span>
                  </div>
                )}
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
                  {realTimeUsage ? realTimeUsage.requests.used.toLocaleString() : subscriptionData.usage.requests.used.toLocaleString()} / {subscriptionData.usage.requests.limit === -1 ? '∞' : subscriptionData.usage.requests.limit.toLocaleString()} requests used
                  {realTimeUsage && realTimeUsage.requests.remaining !== 'unlimited' && (
                    <span className="block text-xs">{realTimeUsage.requests.remaining.toLocaleString()} remaining</span>
                  )}
                </p>
                <div className="w-32 h-2 bg-zinc-700 rounded-full mt-1">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      realTimeUsage && realTimeUsage.requests.percentage >= 90 
                        ? 'bg-red-400' 
                        : realTimeUsage && realTimeUsage.requests.percentage >= 75 
                        ? 'bg-yellow-400' 
                        : 'bg-cyan-400'
                    }`}
                    style={{
                      width: subscriptionData.usage.requests.limit === -1 
                        ? '100%' 
                        : `${Math.min(realTimeUsage?.requests.percentage || subscriptionData.usage.requests.percentage, 100)}%`
                    }}
                  ></div>
                </div>
                {subscriptionData.usage.requests.overage > 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    Overage: {subscriptionData.usage.requests.overage.toLocaleString()} requests (+${subscriptionData.usage.requests.overageCost})
                  </p>
                )}
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-white">API Requests</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {realTimeUsage ? realTimeUsage.requests.used.toLocaleString() : subscriptionData.usage.requests.used.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400">
                    of {subscriptionData.usage.requests.limit === -1 ? '∞' : subscriptionData.usage.requests.limit.toLocaleString()} included
                  </p>
                  {realTimeUsage && realTimeUsage.requests.percentage > 0 && (
                    <div className="w-full h-1 bg-zinc-700 rounded-full mt-2">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          realTimeUsage.requests.percentage >= 90 ? 'bg-red-400' 
                          : realTimeUsage.requests.percentage >= 75 ? 'bg-yellow-400' 
                          : 'bg-green-400'
                        }`}
                        style={{ width: `${Math.min(realTimeUsage.requests.percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">Compute Units</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {realTimeUsage ? realTimeUsage.computeUnits.used.toLocaleString() : subscriptionData.usage.computeUnits.used.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Cost: ${realTimeUsage ? realTimeUsage.computeUnits.cost : subscriptionData.usage.computeUnits.cost}
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">API Keys</span>
                  </div>
                  <p className="text-xl font-bold text-white">{subscriptionData.usage.apiKeys.used}</p>
                  <p className="text-xs text-zinc-400">
                    of {subscriptionData.usage.apiKeys.limit === -1 ? '∞' : subscriptionData.usage.apiKeys.limit} included
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-medium text-white">Rate Limit</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {realTimeUsage ? `${realTimeUsage.rateLimit.remaining}/${realTimeUsage.rateLimit.limit}` : subscriptionData.subscription.plan.limits.rateLimit.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {realTimeUsage ? `Resets in ${Math.ceil((realTimeUsage.rateLimit.resetTime - Date.now()) / 1000)}s` : 'requests/minute'}
                  </p>
                  {realTimeUsage && (
                    <div className="w-full h-1 bg-zinc-700 rounded-full mt-2">
                      <div 
                        className="h-1 bg-orange-400 rounded-full transition-all duration-300"
                        style={{ width: `${(realTimeUsage.rateLimit.used / realTimeUsage.rateLimit.limit) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Usage Summary */}
              <div className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/10 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">Current Billing Period</h4>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live updates every 30s</span>
                  </div>
                </div>
                {realTimeUsage && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-400">Period: </span>
                      <span className="text-white">
                        {new Date(realTimeUsage.period.start).toLocaleDateString()} - {new Date(realTimeUsage.period.end).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Days remaining: </span>
                      <span className="text-white">{realTimeUsage.period.daysRemaining}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Overage Warning */}
              {subscriptionData.usage.requests.overage > 0 && (
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">Plan Limit Exceeded</h4>
                      <p className="text-xs text-zinc-300">
                        You've used {subscriptionData.usage.requests.overage.toLocaleString()} requests beyond your plan limit. 
                        Additional usage will be charged at $0.01 per request.
                      </p>
                      <p className="text-xs text-red-400 mt-1 font-medium">
                        Estimated overage charge: ${subscriptionData.usage.requests.overageCost}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={handleOveragePayment}
                        disabled={payingOverage}
                        className="px-3 py-1 bg-cyan-500 text-black rounded text-xs hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {payingOverage ? 'Processing...' : 'Pay Overage'}
                      </button>
                      <button 
                        onClick={() => setShowUpgrade(true)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-400 transition-colors"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                
                {loadingPaymentData ? (
                  <div className="text-center py-4">
                    <p className="text-zinc-400 text-sm">Loading payment methods...</p>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <>
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-3 p-3 bg-zinc-800/30 rounded-lg mb-4">
                        <div className="w-8 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{method.brand?.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {method.brand} •••• {method.last4}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </p>
                        </div>
                        {method.isDefault && <CheckCircle className="h-4 w-4 text-green-400" />}
                      </div>
                    ))}
                    <button 
                      onClick={() => window.location.href = '/dashboard/payment-methods'}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors"
                    >
                      Manage Payment Methods
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-zinc-800/30 rounded-lg mb-4 text-center">
                      <p className="text-sm text-zinc-400 mb-2">No payment method on file</p>
                      <p className="text-xs text-zinc-500">Add a payment method to enable automatic billing</p>
                    </div>
                    <button 
                      onClick={() => window.location.href = '/dashboard/payment-methods/add'}
                      className="w-full px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium"
                    >
                      Add Payment Method
                    </button>
                  </>
                )}
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
                {loadingPaymentData ? (
                  <div className="text-center py-4">
                    <p className="text-zinc-400 text-sm">Loading billing address...</p>
                  </div>
                ) : billingAddress ? (
                  <>
                    <div className="text-sm text-zinc-300 space-y-1">
                      <p>{billingAddress.name}</p>
                      <p>{billingAddress.line1}</p>
                      {billingAddress.line2 && <p>{billingAddress.line2}</p>}
                      <p>{billingAddress.city}, {billingAddress.state} {billingAddress.postalCode}</p>
                      <p>{billingAddress.country}</p>
                    </div>
                    <button 
                      onClick={() => window.location.href = '/dashboard/billing-address/edit'}
                      className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Update Address
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-zinc-800/30 rounded-lg text-center">
                      <p className="text-sm text-zinc-400 mb-2">No billing address on file</p>
                      <p className="text-xs text-zinc-500">Add your billing address for invoices</p>
                    </div>
                    <button 
                      onClick={() => window.location.href = '/dashboard/billing-address/add'}
                      className="mt-3 w-full px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors text-sm font-medium"
                    >
                      Add Billing Address
                    </button>
                  </>
                )}
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