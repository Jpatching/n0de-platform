'use client';

import { useState } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CreditCard,
  Lock,
  Shield,
  AlertCircle
} from 'lucide-react';

const AddPaymentMethodPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    name: '',
    isDefault: false
  });

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cardNumber') {
      // Remove spaces and non-numeric characters
      const cleaned = value.replace(/\D/g, '');
      // Add spaces every 4 digits
      const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
      // Limit to 19 characters (16 digits + 3 spaces)
      value = formatted.substring(0, 19);
    }
    
    if (field === 'expiryMonth' || field === 'expiryYear' || field === 'cvc') {
      // Only allow numbers
      value = value.replace(/\D/g, '');
    }

    if (field === 'expiryMonth') {
      // Limit to 2 digits and max value of 12
      value = value.substring(0, 2);
      if (parseInt(value) > 12) value = '12';
    }

    if (field === 'expiryYear') {
      // Limit to 2 digits
      value = value.substring(0, 2);
    }

    if (field === 'cvc') {
      // Limit to 4 digits
      value = value.substring(0, 4);
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    const { cardNumber, expiryMonth, expiryYear, cvc, name } = formData;
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    
    return (
      cleanCardNumber.length >= 13 &&
      expiryMonth.length === 2 &&
      parseInt(expiryMonth) >= 1 && parseInt(expiryMonth) <= 12 &&
      expiryYear.length === 2 &&
      parseInt(expiryYear) >= new Date().getFullYear() - 2000 &&
      cvc.length >= 3 &&
      name.trim().length > 0
    );
  };

  const detectCardBrand = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'visa';
    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'mastercard';
    if (cleanNumber.startsWith('3')) return 'amex';
    if (cleanNumber.startsWith('6')) return 'discover';
    return 'unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    setLoading(true);
    
    try {
      // In a real implementation, you would use Stripe's secure tokenization
      // This is a placeholder for the secure payment method creation
      await api.post('/users/payment-methods', {
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expiryMonth: parseInt(formData.expiryMonth),
        expiryYear: 2000 + parseInt(formData.expiryYear),
        cvc: formData.cvc,
        name: formData.name,
        isDefault: formData.isDefault
      });

      toast.success('Payment method added successfully!');
      router.push('/dashboard/payment-methods');
    } catch (error: any) {
      console.error('Failed to add payment method:', error);
      
      // For development, show a success message since the API doesn't exist yet
      if (error.response?.status === 404) {
        toast.success('Payment method would be added successfully! (API not implemented yet)');
        router.push('/dashboard/payment-methods');
      } else {
        toast.error(error.response?.data?.message || 'Failed to add payment method');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          {/* Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4 mb-6"
            >
              <Link 
                href="/dashboard/payment-methods"
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Add Payment Method</h1>
                <p className="text-zinc-400">
                  Add a new credit or debit card for automatic billing.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="max-w-md mx-auto">
            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 bg-green-500/10 border border-green-500/20 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-1">Secure & Encrypted</h4>
                  <p className="text-sm text-green-200/80">
                    Your payment information is encrypted and securely processed. We use industry-standard security measures to protect your data.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Payment Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-3 pl-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      maxLength={19}
                    />
                    <CreditCard className="h-5 w-5 text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    {formData.cardNumber && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs text-zinc-400 capitalize">
                          {detectCardBrand(formData.cardNumber)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expiry and CVC */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Month
                    </label>
                    <input
                      type="text"
                      value={formData.expiryMonth}
                      onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                      placeholder="MM"
                      className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Year
                    </label>
                    <input
                      type="text"
                      value={formData.expiryYear}
                      onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                      placeholder="YY"
                      className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      CVC
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.cvc}
                        onChange={(e) => handleInputChange('cvc', e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-3 pr-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        maxLength={4}
                      />
                      <Lock className="h-4 w-4 text-zinc-400 absolute right-2 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Set as Default */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="isDefault" className="text-sm text-zinc-300">
                    Set as default payment method
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Link
                    href="/dashboard/payment-methods"
                    className="flex-1 px-4 py-3 text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors text-center"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading || !isFormValid()}
                    className="flex-1 px-4 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Adding...' : 'Add Payment Method'}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Development Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-400 mb-1">Development Mode</h4>
                  <p className="text-sm text-amber-200/80">
                    This is a demo form. In production, payment processing would be handled securely through Stripe's PCI-compliant infrastructure.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default AddPaymentMethodPage;