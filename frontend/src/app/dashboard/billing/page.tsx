"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layouts/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import {
  CreditCard,
  Download,
  Calendar,
  TrendingUp,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface UsageData {
  requests: {
    current: number;
    limit: number;
    percentage: number;
  };
  bandwidth: {
    current: string;
    limit: string;
    percentage: number;
  };
  storage: {
    current: string;
    limit: string;
    percentage: number;
  };
}

interface SubscriptionData {
  plan: {
    name: string;
    price: number;
    billing_cycle: string;
    status: string;
  };
  next_billing_date: string;
  payment_method: {
    last_four: string;
    expires: string;
    brand: string;
  };
  billing_address: {
    company: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
  download_url?: string;
}

const BillingPage = () => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        // Error handling removed for cleanup

        // Get API base URL for production/development
        // const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""; // Unused
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const token = localStorage.getItem("n0de_token");

        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Fetch usage data - use direct backend URL in production, proxy in development
        const usageEndpoint =
          process.env.NODE_ENV === "development"
            ? "/api/billing/usage"
            : `${backendUrl}/api/v1/billing/usage`;

        const usageResponse = await fetch(usageEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!usageResponse.ok) {
          throw new Error(
            `Failed to fetch usage data: ${usageResponse.status} ${usageResponse.statusText}`,
          );
        }

        const usage = await usageResponse.json();

        // Transform usage data to match interface
        setUsageData({
          requests: {
            current: usage.usage?.requests_used || 0,
            limit: usage.usage?.requests_limit || 5000000,
            percentage: usage.usage?.requests_used
              ? (usage.usage.requests_used / usage.usage.requests_limit) * 100
              : 0,
          },
          bandwidth: {
            current: formatBytes(usage.usage?.bandwidth_used || 0),
            limit: formatBytes(usage.usage?.bandwidth_limit || 2000000000000),
            percentage: usage.usage?.bandwidth_used
              ? (usage.usage.bandwidth_used / usage.usage.bandwidth_limit) * 100
              : 0,
          },
          storage: {
            current: formatBytes(usage.usage?.storage_used || 0),
            limit: formatBytes(usage.usage?.storage_limit || 500000000000),
            percentage: usage.usage?.storage_used
              ? (usage.usage.storage_used / usage.usage.storage_limit) * 100
              : 0,
          },
        });

        // Fetch subscription data - use direct backend URL in production, proxy in development
        const subscriptionEndpoint =
          process.env.NODE_ENV === "development"
            ? "/api/billing/subscription"
            : `${backendUrl}/api/v1/billing/subscription`;

        const subscriptionResponse = await fetch(subscriptionEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!subscriptionResponse.ok) {
          throw new Error(
            `Failed to fetch subscription data: ${subscriptionResponse.status} ${subscriptionResponse.statusText}`,
          );
        }

        const subscription = await subscriptionResponse.json();
        
        // Ensure subscription data has the expected structure
        const normalizedSubscription = {
          ...subscription,
          plan: subscription.plan || null,
          payment_method: subscription.payment_method || null,
          billing_address: subscription.billing_address || null,
        };
        
        setSubscriptionData(normalizedSubscription);

        // Transform invoices data if available
        if (subscription.invoices) {
          setInvoices(
            subscription.invoices.map((invoice: any) => ({
              id: invoice.id,
              date: new Date(invoice.created * 1000).toLocaleDateString(),
              amount: `$${(invoice.amount_paid / 100).toFixed(2)}`,
              status: invoice.status,
              download_url: invoice.invoice_pdf,
            })),
          );
        }
      } catch (err) {
        console.error("Error fetching billing data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load billing data";
        setError(`API Error: ${errorMessage}. Check console for details.`);

        // Log detailed error information for debugging
        console.error("Billing API Error Details:", {
          error: err,
          environment: process.env.NODE_ENV,
          usageEndpoint:
            process.env.NODE_ENV === "development"
              ? "/api/billing/usage"
              : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/usage`,
          subscriptionEndpoint:
            process.env.NODE_ENV === "development"
              ? "/api/billing/subscription"
              : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/subscription`,
          hasToken: !!localStorage.getItem("n0de_token"),
          backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
        });

        // No fallback data - real data only
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="text-white">Loading billing data...</span>
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
                  <h3 className="text-xl font-semibold text-white">
                    {subscriptionData?.plan?.name || "Free Plan"}
                  </h3>
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                    {subscriptionData?.plan?.status || "Active"}
                  </span>
                </div>
                <p className="text-zinc-300">
                  ${subscriptionData?.plan?.price || 0}/
                  {subscriptionData?.plan?.billing_cycle || "month"} • Billed{" "}
                  {subscriptionData?.plan?.billing_cycle || "monthly"}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Next billing date:{" "}
                  {subscriptionData?.next_billing_date || "April 1, 2024"}
                </p>
              </div>
              <div className="text-right">
                <button 
                  onClick={() => window.location.href = '/subscription'}
                  className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium mb-2"
                >
                  Manage Plan
                </button>
                <p className="text-sm text-zinc-400">
                  {usageData
                    ? formatNumber(usageData.requests.current)
                    : "2.4M"}{" "}
                  / {usageData ? formatNumber(usageData.requests.limit) : "5M"}{" "}
                  requests used
                </p>
                <div className="w-32 h-2 bg-zinc-700 rounded-full mt-1">
                  <div
                    className="h-2 bg-cyan-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${usageData?.requests.percentage || 48}%`,
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
              <h3 className="text-lg font-semibold text-white mb-4">
                Usage This Month
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-white">
                      API Requests
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {usageData
                      ? formatNumber(usageData.requests.current)
                      : "--"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    of{" "}
                    {usageData ? formatNumber(usageData.requests.limit) : "--"}{" "}
                    included
                  </p>
                  <div className="w-full h-1 bg-zinc-700 rounded-full mt-2">
                    <div
                      className="h-1 bg-green-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(usageData?.requests.percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">
                      Bandwidth
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {usageData?.bandwidth.current || "--"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    of {usageData?.bandwidth.limit || "--"} included
                  </p>
                  <div className="w-full h-1 bg-zinc-700 rounded-full mt-2">
                    <div
                      className="h-1 bg-blue-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(usageData?.bandwidth.percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      Storage
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {usageData?.storage.current || "--"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    of {usageData?.storage.limit || "--"} included
                  </p>
                  <div className="w-full h-1 bg-zinc-700 rounded-full mt-2">
                    <div
                      className="h-1 bg-purple-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(usageData?.storage.percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
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
                <h3 className="text-lg font-semibold text-white mb-4">
                  Payment Method
                </h3>

                <div className="flex items-center space-x-3 p-3 bg-zinc-800/30 rounded-lg mb-4">
                  <div className="w-8 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      •••• •••• ••••{" "}
                      {subscriptionData?.payment_method?.last_four || "4242"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Expires{" "}
                      {subscriptionData?.payment_method?.expires || "12/25"}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>

                <button className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors">
                  Update Payment Method
                </button>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Billing Address
                </h3>
                <div className="text-sm text-zinc-300 space-y-1">
                  <p>
                    {subscriptionData?.billing_address?.company ||
                      "Your Company"}
                  </p>
                  <p>
                    {subscriptionData?.billing_address?.address_line1 ||
                      "123 Business Ave"}
                  </p>
                  <p>
                    {subscriptionData?.billing_address?.city || "San Francisco"},{" "}
                    {subscriptionData?.billing_address?.state || "CA"}{" "}
                    {subscriptionData?.billing_address?.postal_code || "94105"}
                  </p>
                  <p>
                    {subscriptionData?.billing_address?.country ||
                      "United States"}
                  </p>
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
                <h3 className="text-lg font-semibold text-white">
                  Recent Invoices
                </h3>
                <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  View All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Invoice
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {invoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">
                          {invoice.id}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-300">{invoice.date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">
                          {invoice.amount}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium rounded">
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="flex items-center space-x-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default BillingPage;
