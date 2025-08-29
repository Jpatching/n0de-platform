'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MapPin,
  User,
  Globe,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const EditBillingAddressPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });

  useEffect(() => {
    loadBillingAddress();
  }, []);

  const loadBillingAddress = async () => {
    try {
      setLoadingAddress(true);
      const address = await api.get<BillingAddress>('/users/billing-address');
      if (address) {
        setFormData({
          name: address.name || '',
          line1: address.line1 || '',
          line2: address.line2 || '',
          city: address.city || '',
          state: address.state || '',
          postalCode: address.postalCode || '',
          country: address.country || 'US'
        });
      }
    } catch (error: any) {
      console.error('Failed to load billing address:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load billing address');
      }
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'postalCode') {
      // Format postal code based on country
      if (formData.country === 'US') {
        // US ZIP code format: 12345 or 12345-1234
        value = value.replace(/\D/g, '');
        if (value.length > 5) {
          value = value.substring(0, 5) + '-' + value.substring(5, 9);
        }
        value = value.substring(0, 10);
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    const { name, line1, city, state, postalCode, country } = formData;
    
    return (
      name.trim().length > 0 &&
      line1.trim().length > 0 &&
      city.trim().length > 0 &&
      state.trim().length > 0 &&
      postalCode.trim().length > 0 &&
      country.trim().length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      await api.put('/users/billing-address', formData);
      toast.success('Billing address updated successfully!');
      router.push('/dashboard/billing');
    } catch (error: any) {
      console.error('Failed to update billing address:', error);
      
      // For development, show a success message since the API doesn't exist yet
      if (error.response?.status === 404) {
        toast.success('Billing address would be updated successfully! (API not implemented yet)');
        router.push('/dashboard/billing');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update billing address');
      }
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' },
    { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' }
  ];

  if (loadingAddress) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-zinc-400">Loading billing address...</p>
            </div>
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
              className="flex items-center space-x-4 mb-6"
            >
              <Link 
                href="/dashboard/billing"
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Edit Billing Address</h1>
                <p className="text-zinc-400">
                  Update your billing address for invoices and tax purposes.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="max-w-lg mx-auto">
            {/* Billing Address Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-3 pl-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <User className="h-5 w-5 text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                {/* Address Line 1 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Address Line 1 *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) => handleInputChange('line1', e.target.value)}
                      placeholder="123 Main Street"
                      className="w-full px-3 py-3 pl-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <MapPin className="h-5 w-5 text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.line2}
                    onChange={(e) => handleInputChange('line2', e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* City and State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="San Francisco"
                      className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      State/Province *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="CA"
                      className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Postal Code and Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="94102"
                      className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Country *
                    </label>
                    <div className="relative">
                      <select
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-3 py-3 pl-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none"
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      <Globe className="h-5 w-5 text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Link
                    href="/dashboard/billing"
                    className="flex-1 px-4 py-3 text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors text-center"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading || !isFormValid()}
                    className="flex-1 px-4 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
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
                    This is a demo form. In production, billing address changes would be automatically applied to future invoices and tax calculations.
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

export default EditBillingAddressPage;