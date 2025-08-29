'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Plus, 
  MoreVertical,
  CheckCircle,
  Trash2,
  Edit3,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: string;
}

const PaymentMethodsPage = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await api.get<PaymentMethod[]>('/users/payment-methods');
      setPaymentMethods(methods || []);
    } catch (error: any) {
      console.error('Failed to load payment methods:', error);
      // Don't show error for API endpoints that don't exist yet
      if (error.response?.status !== 404) {
        toast.error('Failed to load payment methods');
      }
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      setDeleting(methodId);
      await api.delete(`/users/payment-methods/${methodId}`);
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
      toast.success('Payment method deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete payment method:', error);
      toast.error(error.response?.data?.message || 'Failed to delete payment method');
    } finally {
      setDeleting(null);
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      setSettingDefault(methodId);
      await api.put(`/users/payment-methods/${methodId}/default`);
      
      // Update local state
      setPaymentMethods(prev => prev.map(method => ({
        ...method,
        isDefault: method.id === methodId
      })));
      
      toast.success('Default payment method updated');
    } catch (error: any) {
      console.error('Failed to set default payment method:', error);
      toast.error(error.response?.data?.message || 'Failed to update default payment method');
    } finally {
      setSettingDefault(null);
    }
  };

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') return '💳';
    if (brandLower === 'mastercard') return '💳';
    if (brandLower === 'amex') return '💳';
    if (brandLower === 'discover') return '💳';
    return '💳';
  };

  const isExpired = (month: number, year: number) => {
    const now = new Date();
    const expiryDate = new Date(year, month - 1);
    return expiryDate < now;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="text-white">Loading payment methods...</div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          {/* Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard/billing"
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-zinc-400" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">Payment Methods</h1>
                  <p className="text-zinc-400">
                    Manage your saved payment methods for automatic billing.
                  </p>
                </div>
              </div>
              <Link 
                href="/dashboard/payment-methods/add"
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Add Payment Method</span>
              </Link>
            </motion.div>
          </div>

          {/* Payment Methods List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Saved Payment Methods</h3>
            </div>
            
            <div className="p-6">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-white mb-2">No payment methods</h4>
                  <p className="text-zinc-400 mb-6">
                    Add a payment method to enable automatic billing for your subscription.
                  </p>
                  <Link 
                    href="/dashboard/payment-methods/add"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Your First Payment Method</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <motion.div
                      key={method.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border rounded-lg ${
                        method.isDefault 
                          ? 'border-cyan-500/30 bg-cyan-500/5' 
                          : 'border-zinc-700 bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{getBrandIcon(method.brand)}</div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-medium text-white">
                                {method.brand} •••• {method.last4}
                              </h4>
                              {method.isDefault && (
                                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Default</span>
                                </span>
                              )}
                              {isExpired(method.expiryMonth, method.expiryYear) && (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium flex items-center space-x-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Expired</span>
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-400 text-sm">
                              Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear} • 
                              Added {new Date(method.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => setDefaultPaymentMethod(method.id)}
                              disabled={settingDefault === method.id}
                              className="px-3 py-1 text-sm border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                              {settingDefault === method.id ? 'Setting...' : 'Set Default'}
                            </button>
                          )}
                          <button
                            onClick={() => deletePaymentMethod(method.id)}
                            disabled={deleting === method.id}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                            title="Delete payment method"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-1">Secure Payment Processing</h4>
                <p className="text-sm text-amber-200/80">
                  All payment information is securely processed and stored by our PCI-compliant payment processor. 
                  We never store your complete card numbers on our servers.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default PaymentMethodsPage;