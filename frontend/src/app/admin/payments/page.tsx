"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  Bitcoin,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

interface Payment {
  id: string;
  userId: string;
  provider: "COINBASE_COMMERCE" | "NOWPAYMENTS" | "STRIPE";
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELED"
    | "EXPIRED"
    | "REFUNDED";
  planType: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  chargeUrl?: string;
  paymentUrl?: string;
  paidAt?: string;
  failedAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  subscription?: {
    id: string;
    planType: string;
    status: string;
  };
}

interface PaymentsResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface PaymentAnalytics {
  totalRevenue: number;
  totalPayments: number;
  paymentsByStatus: Array<{ status: string; _count: { id: number } }>;
  paymentsByProvider: Array<{
    provider: string;
    _count: { id: number };
    _sum: { amount: number };
  }>;
  dailyPayments: Array<{ date: string; count: number; revenue: number }>;
}

export default function AdminPaymentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<
    PaymentsResponse["pagination"] | null
  >(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (providerFilter) params.append("provider", providerFilter);

      const data: PaymentsResponse = await api.get(`/admin/payments?${params}`);
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, providerFilter]);

  const fetchAnalytics = async () => {
    try {
      const data = await api.get("/admin/payments/analytics?days=30");
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch payment analytics:", error);
    }
  };

  useEffect(() => {
    if (!isLoading && (!user || user.role === "USER")) {
      router.push("/dashboard");
      return;
    }

    if (user) {
      fetchPayments();
      fetchAnalytics();
    }
  }, [
    user,
    isLoading,
    router,
    page,
    statusFilter,
    providerFilter,
    fetchPayments,
  ]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "FAILED":
      case "CANCELED":
      case "EXPIRED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "PROCESSING":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "PENDING":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "COMPLETED":
        return `${baseClasses} bg-green-500/20 text-green-300`;
      case "FAILED":
      case "CANCELED":
      case "EXPIRED":
        return `${baseClasses} bg-red-500/20 text-red-300`;
      case "PROCESSING":
        return `${baseClasses} bg-blue-500/20 text-blue-300`;
      case "PENDING":
        return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      case "REFUNDED":
        return `${baseClasses} bg-purple-500/20 text-purple-300`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "COINBASE_COMMERCE":
        return <Bitcoin className="w-4 h-4 text-orange-500" />;
      case "NOWPAYMENTS":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case "STRIPE":
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPlanBadge = (planType: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (planType) {
      case "STARTER":
        return `${baseClasses} bg-blue-500/20 text-blue-300`;
      case "PROFESSIONAL":
        return `${baseClasses} bg-purple-500/20 text-purple-300`;
      case "ENTERPRISE":
        return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading payments...</p>
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
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <span className="text-text-muted">/</span>
              <h1 className="text-xl font-bold">Payments</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-width py-8">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-secondary">
                  Total Revenue
                </h3>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <div className="text-sm text-text-secondary">Last 30 days</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-secondary">
                  Total Payments
                </h3>
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {analytics.totalPayments}
              </div>
              <div className="text-sm text-text-secondary">Last 30 days</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-secondary">
                  Success Rate
                </h3>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {analytics.paymentsByStatus.length > 0
                  ? Math.round(
                      ((analytics.paymentsByStatus.find(
                        (s) => s.status === "COMPLETED",
                      )?._count.id || 0) /
                        analytics.totalPayments) *
                        100,
                    )
                  : 0}
                %
              </div>
              <div className="text-sm text-text-secondary">Completion rate</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-secondary">
                  Avg. Payment
                </h3>
                <DollarSign className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {formatCurrency(
                  analytics.totalPayments > 0
                    ? analytics.totalRevenue / analytics.totalPayments
                    : 0,
                )}
              </div>
              <div className="text-sm text-text-secondary">Per transaction</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <select
              className="pl-10 pr-8 py-2 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-n0de-green"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELED">Canceled</option>
              <option value="EXPIRED">Expired</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <select
              className="pl-10 pr-8 py-2 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-n0de-green"
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Providers</option>
              <option value="COINBASE_COMMERCE">Coinbase Commerce</option>
              <option value="NOWPAYMENTS">NOWPayments</option>
              <option value="STRIPE">Stripe</option>
            </select>
          </div>

          <div className="flex-1"></div>

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-text-secondary">
            <span>Total: {pagination?.total || 0}</span>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-main border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Payment
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Provider
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border hover:bg-bg-elevated/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-sm">
                          {payment.id.slice(0, 8)}...
                        </div>
                        {payment.providerPaymentId && (
                          <div className="text-xs text-text-secondary">
                            Provider ID:{" "}
                            {payment.providerPaymentId.slice(0, 12)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-sm">
                          {payment.user.firstName && payment.user.lastName
                            ? `${payment.user.firstName} ${payment.user.lastName}`
                            : payment.user.username || "N/A"}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {payment.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {payment.currency}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        <span className={getStatusBadge(payment.status)}>
                          {payment.status.toLowerCase()}
                        </span>
                      </div>
                      {payment.paidAt && (
                        <div className="text-xs text-text-muted mt-1">
                          Paid: {formatDate(payment.paidAt)}
                        </div>
                      )}
                      {payment.failedAt && (
                        <div className="text-xs text-red-400 mt-1">
                          Failed: {formatDate(payment.failedAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {getProviderIcon(payment.provider)}
                        <span className="text-sm">
                          {payment.provider.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={getPlanBadge(payment.planType)}>
                        {payment.planType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {formatDate(payment.createdAt)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {new Date(payment.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentModal(true);
                        }}
                        className="p-2 hover:bg-bg-elevated rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                Showing {(page - 1) * pagination.limit + 1} to{" "}
                {Math.min(page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} payments
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">
                  {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 border border-border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-elevated rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Payment Details
                  </h3>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedPayment.status)}
                    <span className={getStatusBadge(selectedPayment.status)}>
                      {selectedPayment.status.toLowerCase()}
                    </span>
                    <span className={getPlanBadge(selectedPayment.planType)}>
                      {selectedPayment.planType}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      selectedPayment.amount,
                      selectedPayment.currency,
                    )}
                  </div>
                  <div className="text-sm text-text-muted">
                    {selectedPayment.currency}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-bg-main rounded">
                  <strong>Payment ID:</strong>
                  <p className="text-text-secondary font-mono text-sm break-all">
                    {selectedPayment.id}
                  </p>
                </div>

                <div className="p-3 bg-bg-main rounded">
                  <strong>Provider:</strong>
                  <div className="flex items-center space-x-2 mt-1">
                    {getProviderIcon(selectedPayment.provider)}
                    <span>{selectedPayment.provider.replace("_", " ")}</span>
                  </div>
                </div>

                {selectedPayment.providerPaymentId && (
                  <div className="p-3 bg-bg-main rounded">
                    <strong>Provider Payment ID:</strong>
                    <p className="text-text-secondary font-mono text-sm break-all">
                      {selectedPayment.providerPaymentId}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-bg-main rounded">
                  <strong>User:</strong>
                  <p className="text-text-secondary">
                    {selectedPayment.user.firstName &&
                    selectedPayment.user.lastName
                      ? `${selectedPayment.user.firstName} ${selectedPayment.user.lastName}`
                      : selectedPayment.user.username || "N/A"}
                  </p>
                  <p className="text-sm text-text-muted">
                    {selectedPayment.user.email}
                  </p>
                </div>

                <div className="p-3 bg-bg-main rounded">
                  <strong>Created:</strong>
                  <p className="text-text-secondary">
                    {formatDateTime(selectedPayment.createdAt)}
                  </p>
                </div>

                <div className="p-3 bg-bg-main rounded">
                  <strong>Last Updated:</strong>
                  <p className="text-text-secondary">
                    {formatDateTime(selectedPayment.updatedAt)}
                  </p>
                </div>

                {selectedPayment.paidAt && (
                  <div className="p-3 bg-bg-main rounded">
                    <strong>Paid At:</strong>
                    <p className="text-green-400">
                      {formatDateTime(selectedPayment.paidAt)}
                    </p>
                  </div>
                )}

                {selectedPayment.failedAt && (
                  <div className="p-3 bg-bg-main rounded">
                    <strong>Failed At:</strong>
                    <p className="text-red-400">
                      {formatDateTime(selectedPayment.failedAt)}
                    </p>
                  </div>
                )}

                {selectedPayment.canceledAt && (
                  <div className="p-3 bg-bg-main rounded">
                    <strong>Canceled At:</strong>
                    <p className="text-yellow-400">
                      {formatDateTime(selectedPayment.canceledAt)}
                    </p>
                  </div>
                )}
              </div>

              {(selectedPayment.chargeUrl || selectedPayment.paymentUrl) && (
                <div className="mb-6">
                  <strong>Payment URLs:</strong>
                  <div className="mt-2 space-y-2">
                    {selectedPayment.chargeUrl && (
                      <div className="p-3 bg-bg-main rounded">
                        <div className="text-sm font-medium text-text-secondary mb-1">
                          Charge URL:
                        </div>
                        <a
                          href={selectedPayment.chargeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-n0de-green text-sm break-all hover:underline"
                        >
                          {selectedPayment.chargeUrl}
                        </a>
                      </div>
                    )}
                    {selectedPayment.paymentUrl && (
                      <div className="p-3 bg-bg-main rounded">
                        <div className="text-sm font-medium text-text-secondary mb-1">
                          Payment URL:
                        </div>
                        <a
                          href={selectedPayment.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-n0de-green text-sm break-all hover:underline"
                        >
                          {selectedPayment.paymentUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.subscription && (
                <div className="mb-6">
                  <strong>Associated Subscription:</strong>
                  <div className="mt-2 p-3 bg-bg-main rounded">
                    <div className="flex justify-between items-center">
                      <span>Plan: {selectedPayment.subscription.planType}</span>
                      <span
                        className={getStatusBadge(
                          selectedPayment.subscription.status,
                        )}
                      >
                        {selectedPayment.subscription.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-border">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() =>
                    router.push(`/admin/users/${selectedPayment.userId}`)
                  }
                  className="flex-1 btn-primary"
                >
                  View User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
