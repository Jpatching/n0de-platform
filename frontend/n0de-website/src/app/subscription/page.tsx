'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Bell, 
  Shield, 
  Zap, 
  TrendingUp, 
  User, 
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Crown,
  Building,
  Globe,
  Database,
  Server,
  Lock,
  Mail,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  X,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

// Types
interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  interval: string;
  created: string;
  autoRenew: boolean;
  trialEnd?: string;
}

interface UsageMetrics {
  currentRequests: number;
  requestLimit: number;
  currentKeys: number;
  keyLimit: number;
  requestsThisMonth: number;
  lastRequestDate: string;
  resetDate: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
  features: string[];
  limits: {
    requests: number;
    apiKeys: number;
    rateLimit: number;
    networks: string[];
  };
  popular?: boolean;
  enterprise?: boolean;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  invoiceUrl?: string;
  description: string;
  method: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'crypto';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  name: string;
}

const SubscriptionManagementPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Load data
  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      
      // Load subscription plans (this endpoint works)
      const plansData = await api.get<Plan[]>('/subscriptions/plans');
      setPlans(plansData);

      // Try to load other data, but handle failures gracefully
      try {
        const subscriptionData = await api.get<Subscription>('/subscriptions/current');
        setSubscription(subscriptionData);
      } catch (error) {
        console.log('No active subscription found');
        setSubscription(null);
      }

      try {
        const usageData = await api.get<UsageMetrics>('/subscriptions/usage');
        // Map the usage data to our expected format
        setUsage({
          currentRequests: usageData.requestsToday || 0,
          requestLimit: 100000, // Default for free tier
          currentKeys: usageData.activeKeys || 0,
          keyLimit: 1,
          requestsThisMonth: usageData.totalRequests || 0,
          lastRequestDate: new Date().toISOString(),
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
        });
      } catch (error) {
        console.log('Failed to load usage data');
        // Set default usage data
        setUsage({
          currentRequests: 0,
          requestLimit: 100000,
          currentKeys: 0,
          keyLimit: 1,
          requestsThisMonth: 0,
          lastRequestDate: new Date().toISOString(),
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
        });
      }

      try {
        const historyData = await api.get<PaymentHistory[]>('/payments');
        setPaymentHistory(historyData.payments || []);
      } catch (error) {
        console.log('No payment history found');
        setPaymentHistory([]);
      }

    } catch (error: any) {
      console.error('Failed to load subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      toast.error('Selected plan not found');
      return;
    }

    setIsUpdating(true);
    try {
      // Get checkout URL from backend
      const response = await api.post('/subscriptions/upgrade/checkout', {
        planType: plan.id,
        paymentProvider: 'STRIPE'
      });
      
      // Redirect to frontend checkout page
      router.push(response.checkoutUrl);
      setShowUpgradeDialog(false);
    } catch (error: any) {
      console.error('Failed to initiate upgrade:', error);
      toast.error(error.message || 'Failed to start upgrade process');
      
      // Fallback to direct navigation
      router.push(`/checkout?plan=${plan.id}`);
      setShowUpgradeDialog(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setIsUpdating(true);
    try {
      await api.put(`/subscriptions/cancel`, {
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: true
      });

      toast.success('Subscription cancelled. Access will continue until the end of the billing period.');
      setShowCancelDialog(false);
      await loadSubscriptionData();

    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/payments/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('n0de_token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'past_due': return 'text-yellow-500 bg-yellow-500/10';
      case 'cancelled': return 'text-red-500 bg-red-500/10';
      case 'incomplete': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('enterprise')) return Building;
    if (name.includes('professional') || name.includes('pro')) return Crown;
    return Zap;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-N0DE-cyan mx-auto mb-4" />
          <p className="text-text-secondary">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg-main">
        {/* Header */}
        <div className="border-b border-border bg-bg-elevated/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container-width section-padding !py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-1">
                  Subscription Management
                </h1>
                <p className="text-text-secondary">
                  Manage your N0DE subscription, billing, and usage
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowDownRight className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        <div className="container-width section-padding">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-bg-elevated border border-border p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Plans
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Current Plan Overview */}
              {subscription ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="bg-bg-elevated border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl text-text-primary flex items-center gap-2">
                            {(() => {
                              const IconComponent = getPlanIcon(subscription.plan);
                              return <IconComponent className="w-5 h-5 text-N0DE-cyan" />;
                            })()}
                            {subscription.plan} Plan
                          </CardTitle>
                          <CardDescription>
                            Active since {formatDate(subscription.created)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-text-primary">
                            {formatCurrency(subscription.amount, subscription.currency)}
                          </div>
                          <div className="text-sm text-text-secondary">
                            per {subscription.interval}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <Badge className={getStatusColor(subscription.status)}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                        {subscription.autoRenew && (
                          <Badge variant="outline">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Auto-renewal enabled
                          </Badge>
                        )}
                        {subscription.cancelAtPeriodEnd && (
                          <Badge variant="destructive">
                            <Clock className="w-3 h-3 mr-1" />
                            Cancels on {formatDate(subscription.currentPeriodEnd)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-sm text-text-secondary mb-1">Current Period</p>
                          <p className="text-text-primary font-medium">
                            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary mb-1">Next Billing Date</p>
                          <p className="text-text-primary font-medium">
                            {subscription.cancelAtPeriodEnd ? 'Cancelled' : formatDate(subscription.currentPeriodEnd)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="bg-bg-elevated border-border">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                      <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Subscription</h3>
                      <p className="text-text-secondary text-center mb-6">
                        You don't have an active subscription. Choose a plan to get started with N0DE's premium features.
                      </p>
                      <Button
                        onClick={() => router.push('/checkout')}
                      >
                        Choose a Plan
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Usage Metrics */}
              {usage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="bg-bg-elevated border-border">
                    <CardHeader>
                      <CardTitle className="text-xl text-text-primary flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-N0DE-cyan" />
                        Usage This Month
                      </CardTitle>
                      <CardDescription>
                        Resets on {formatDate(usage.resetDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* API Requests */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-text-secondary">API Requests</span>
                            <span className="text-sm text-text-primary">
                              {usage.currentRequests.toLocaleString()} 
                              {usage.requestLimit === -1 ? ' / Unlimited' : ` / ${usage.requestLimit.toLocaleString()}`}
                            </span>
                          </div>
                          <div className="w-full bg-bg-hover rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-N0DE-cyan to-N0DE-navy h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getUsagePercentage(usage.currentRequests, usage.requestLimit)}%` }}
                            />
                          </div>
                        </div>

                        {/* API Keys */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-text-secondary">API Keys</span>
                            <span className="text-sm text-text-primary">
                              {usage.currentKeys} 
                              {usage.keyLimit === -1 ? ' / Unlimited' : ` / ${usage.keyLimit}`}
                            </span>
                          </div>
                          <div className="w-full bg-bg-hover rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-N0DE-sky to-N0DE-purple h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getUsagePercentage(usage.currentKeys, usage.keyLimit)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-N0DE-cyan">
                            {usage.requestsThisMonth.toLocaleString()}
                          </div>
                          <div className="text-sm text-text-secondary">Requests This Month</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-N0DE-sky">
                            {usage.currentKeys}
                          </div>
                          <div className="text-sm text-text-secondary">Active Keys</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-N0DE-purple">
                            {usage.lastRequestDate ? formatDate(usage.lastRequestDate) : 'Never'}
                          </div>
                          <div className="text-sm text-text-secondary">Last Request</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-text-primary mb-4">Choose Your Plan</h2>
                  <p className="text-text-secondary max-w-2xl mx-auto">
                    Upgrade or downgrade your plan anytime. Changes take effect immediately with prorated billing.
                  </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const IconComponent = getPlanIcon(plan.name);
                    const isCurrentPlan = subscription?.plan === plan.name || subscription?.planType === plan.id;
                    
                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <Card className={`relative bg-bg-elevated border-border transition-all hover:border-N0DE-cyan/50 ${
                          plan.popular ? 'ring-2 ring-N0DE-cyan/20' : ''
                        } ${isCurrentPlan ? 'ring-2 ring-green-500/50' : ''}`}>
                          {plan.popular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-N0DE-cyan text-black font-semibold px-3 py-1">
                                Most Popular
                              </Badge>
                            </div>
                          )}
                          {isCurrentPlan && (
                            <div className="absolute -top-3 right-4">
                              <Badge className="bg-green-500 text-white font-semibold px-3 py-1">
                                Current Plan
                              </Badge>
                            </div>
                          )}
                          
                          <CardHeader className="text-center pb-6">
                            <div className="mx-auto mb-4 p-3 bg-bg-hover rounded-full w-fit">
                              <IconComponent className="w-8 h-8 text-N0DE-cyan" />
                            </div>
                            <CardTitle className="text-2xl text-text-primary">{plan.name}</CardTitle>
                            <div className="mt-4">
                              <span className="text-4xl font-bold text-text-primary">
                                {formatCurrency(plan.price, plan.currency)}
                              </span>
                              <span className="text-text-secondary ml-1">/{plan.interval}</span>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-6">
                            <div className="space-y-3">
                              <div className="text-sm text-text-secondary font-semibold uppercase tracking-wide">
                                Plan Limits
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">API Requests</span>
                                  <span className="text-text-primary font-medium">
                                    {plan.limits.requests === -1 ? 'Unlimited' : plan.limits.requests.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">API Keys</span>
                                  <span className="text-text-primary font-medium">
                                    {plan.limits.apiKeys === -1 ? 'Unlimited' : plan.limits.apiKeys}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Rate Limit</span>
                                  <span className="text-text-primary font-medium">
                                    {plan.limits.rateLimit.toLocaleString()} req/s
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="text-sm text-text-secondary font-semibold uppercase tracking-wide">
                                Features
                              </div>
                              <ul className="space-y-2">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="pt-4">
                              {isCurrentPlan ? (
                                <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed">
                                  Current Plan
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedPlan(plan);
                                    setShowUpgradeDialog(true);
                                  }}
                                  className={plan.popular ? 'w-full btn-primary' : 'w-full btn-secondary'}
                                >
                                  {subscription ? 'Switch to this Plan' : 'Choose Plan'}
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              {/* Payment Methods */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-bg-elevated border-border">
                  <CardHeader>
                    <CardTitle className="text-xl text-text-primary flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-N0DE-cyan" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>
                      Manage your payment methods for subscription billing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentMethods.length > 0 ? (
                      <div className="space-y-3">
                        {paymentMethods.map((method) => (
                          <div key={method.id} className="flex items-center justify-between p-4 bg-bg-hover rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-bg-elevated rounded">
                                <CreditCard className="w-4 h-4 text-N0DE-cyan" />
                              </div>
                              <div>
                                <div className="text-text-primary font-medium">
                                  {method.brand?.toUpperCase()} ending in {method.last4}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  Expires {method.expiryMonth}/{method.expiryYear}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {method.isDefault && (
                                <Badge variant="outline">Default</Badge>
                              )}
                              <button className="text-text-secondary hover:text-N0DE-cyan text-sm">
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CreditCard className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <p className="text-text-secondary mb-4">No payment methods on file</p>
                        <button className="btn-primary">
                          Add Payment Method
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Payment History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="bg-bg-elevated border-border">
                  <CardHeader>
                    <CardTitle className="text-xl text-text-primary flex items-center gap-2">
                      <Clock className="w-5 h-5 text-N0DE-cyan" />
                      Payment History
                    </CardTitle>
                    <CardDescription>
                      View and download your invoices and payment history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentHistory.length > 0 ? (
                      <div className="space-y-3">
                        {paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-4 bg-bg-hover rounded-lg border border-border">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded ${
                                payment.status === 'paid' ? 'bg-green-500/10' : 
                                payment.status === 'pending' ? 'bg-yellow-500/10' : 
                                'bg-red-500/10'
                              }`}>
                                {payment.status === 'paid' ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : payment.status === 'pending' ? (
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <div>
                                <div className="text-text-primary font-medium">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  {payment.description} • {formatDate(payment.date)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(payment.status)}>
                                {payment.status}
                              </Badge>
                              {payment.invoiceUrl && (
                                <button
                                  onClick={() => handleDownloadInvoice(payment.id)}
                                  className="p-2 text-text-secondary hover:text-N0DE-cyan transition-colors"
                                  title="Download Invoice"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <p className="text-text-secondary">No payment history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {subscription && (
                <>
                  {/* Subscription Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-bg-elevated border-border">
                      <CardHeader>
                        <CardTitle className="text-xl text-text-primary flex items-center gap-2">
                          <Settings className="w-5 h-5 text-N0DE-cyan" />
                          Subscription Settings
                        </CardTitle>
                        <CardDescription>
                          Configure your subscription preferences and notifications
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Auto-renewal */}
                        <div className="flex items-center justify-between p-4 bg-bg-hover rounded-lg border border-border">
                          <div>
                            <div className="text-text-primary font-medium">Auto-renewal</div>
                            <div className="text-sm text-text-secondary">
                              Automatically renew your subscription each billing period
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={subscription.autoRenew ? 'text-green-500' : 'text-text-secondary'}>
                              {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                            </span>
                            <button className="btn-secondary text-sm">
                              {subscription.autoRenew ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>

                        {/* Billing notifications */}
                        <div className="flex items-center justify-between p-4 bg-bg-hover rounded-lg border border-border">
                          <div>
                            <div className="text-text-primary font-medium">Billing Notifications</div>
                            <div className="text-sm text-text-secondary">
                              Receive email notifications for billing events
                            </div>
                          </div>
                          <button className="btn-secondary text-sm">
                            Configure
                          </button>
                        </div>

                        {/* Usage alerts */}
                        <div className="flex items-center justify-between p-4 bg-bg-hover rounded-lg border border-border">
                          <div>
                            <div className="text-text-primary font-medium">Usage Alerts</div>
                            <div className="text-sm text-text-secondary">
                              Get notified when approaching usage limits
                            </div>
                          </div>
                          <button className="btn-secondary text-sm">
                            Configure
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Danger Zone */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card className="bg-bg-elevated border-red-500/20">
                      <CardHeader>
                        <CardTitle className="text-xl text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Danger Zone
                        </CardTitle>
                        <CardDescription>
                          Irreversible and destructive actions for your subscription
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                          <div>
                            <div className="text-text-primary font-medium">Cancel Subscription</div>
                            <div className="text-sm text-text-secondary">
                              Cancel your subscription. You'll retain access until the end of your billing period.
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowCancelDialog(true)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Cancel Subscription
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Upgrade Dialog */}
        {showUpgradeDialog && selectedPlan && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-bg-elevated border border-border rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text-primary">Confirm Plan Change</h3>
                <button
                  onClick={() => setShowUpgradeDialog(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <p className="text-text-secondary">
                  You're about to switch to the <span className="text-text-primary font-medium">{selectedPlan.name}</span> plan.
                </p>
                
                <div className="bg-bg-hover p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>New monthly cost:</span>
                    <span className="text-xl font-bold text-text-primary">
                      {formatCurrency(selectedPlan.price, selectedPlan.currency)}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary mt-2">
                    Changes take effect immediately with prorated billing.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeDialog(false)}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpgradePlan(selectedPlan.id)}
                  className="flex-1 btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Confirm Change'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Cancel Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-bg-elevated border border-red-500/20 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary">Cancel Subscription</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <p className="text-text-secondary">
                  Are you sure you want to cancel your subscription? You'll retain access to all features until the end of your current billing period.
                </p>
                
                {subscription && (
                  <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
                    <div className="text-sm text-text-secondary">
                      Access until: <span className="text-text-primary font-medium">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default SubscriptionManagementPage;