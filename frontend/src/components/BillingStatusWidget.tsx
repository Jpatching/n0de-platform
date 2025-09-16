"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { io } from "socket.io-client";
import { ApiConfig } from "@/lib/api-config";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubscriptionData {
  subscription: {
    id: string;
    planName: string;
    planType: string;
    status: string;
    currentPeriodEnd: string;
    trialEnd?: string;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    requestsUsed: number;
    requestsLimit: number;
    requestsRemaining: number;
    overageRequests: number;
    overageCost: number;
    resetDate: string;
  };
  limits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    requestsPerMonth: number;
    maxApiKeys: number;
    maxConcurrentRequests: number;
    burstLimit: number;
  };
  apiKeys: any[];
  user: {
    isActive: boolean;
    isSuspended: boolean;
  };
  lastSynced: string;
}

interface PaymentStatus {
  hasPending: boolean;
  shouldPoll: boolean;
  pendingPayments: any[];
  pollInterval: number;
  message: string;
}

export default function BillingStatusWidget() {
  const { user, token } = useAuth();
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) return;

    // FIXED: Use centralized API configuration instead of URL manipulation hack
    const socketInstance = io(ApiConfig.buildWebSocketUrl('billing-sync'), {
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
    });

    socketInstance.on("connect", () => {
      console.log("Connected to billing sync service");
      // Request initial sync
      socketInstance.emit("request-sync", {
        userId: user.id,
        apiKey: token,
      });
    });

    socketInstance.on("subscription-synced", (data: SubscriptionData) => {
      setSubscriptionData(data);
      setLastUpdate(new Date());
      setIsLoading(false);
      setError(null);
    });

    socketInstance.on("subscription-updated", (data: SubscriptionData) => {
      setSubscriptionData(data);
      setLastUpdate(new Date());
      showSuccessNotification("Subscription updated!");
    });

    socketInstance.on("payment-confirmed", (data: any) => {
      showSuccessNotification(
        `Payment confirmed! ${data.planType} plan is now active.`,
      );
      // Request fresh sync after payment
      socketInstance.emit("request-sync", {
        userId: user.id,
        apiKey: token,
      });
    });

    socketInstance.on("sync-error", (error: any) => {
      setError(error.error);
      setIsLoading(false);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from billing sync service");
    });


    return () => {
      socketInstance.disconnect();
    };
  }, [user, token, showSuccessNotification]);

  // Check for pending payments and start polling if needed
  useEffect(() => {
    if (!user || !subscriptionData) return;

    checkPaymentStatus();
  }, [user, subscriptionData, checkPaymentStatus]);

  const checkPaymentStatus = useCallback(async () => {
    try {
      // FIXED: Use centralized API configuration
      const endpoint = ApiConfig.isDevelopment()
        ? `/api/billing/payment-status/${user?.id}`  // Proxied through Next.js
        : ApiConfig.buildApiUrl(`billing/payment-status/${user?.id}`);
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const status: PaymentStatus = await response.json();
        setPaymentStatus(status);

        if (status.shouldPoll && !isPolling) {
          startPolling(status.pollInterval);
        }
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  }, [user, token, setPaymentStatus, isPolling, startPolling]);

  const startPolling = useCallback((interval: number) => {
    setIsPolling(true);

    const pollTimer = setInterval(async () => {
      try {
        // FIXED: Use centralized API configuration
        const endpoint = ApiConfig.isDevelopment()
          ? `/api/billing/subscription/${user?.id}`  // Proxied through Next.js
          : ApiConfig.buildApiUrl(`billing/subscription/${user?.id}`);
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data: SubscriptionData = await response.json();
          setSubscriptionData(data);
          setLastUpdate(new Date());

          // Stop polling if subscription is active
          if (
            data.subscription.status === "ACTIVE" &&
            paymentStatus?.hasPending
          ) {
            clearInterval(pollTimer);
            setIsPolling(false);
            showSuccessNotification("Subscription activated!");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, interval);

    // Stop polling after 10 minutes max
    setTimeout(() => {
      clearInterval(pollTimer);
      setIsPolling(false);
    }, 600000);
  }, [user, token, setSubscriptionData, setLastUpdate, paymentStatus, setIsPolling, showSuccessNotification]);

  const showSuccessNotification = useCallback((message: string) => {
    // You can integrate with your notification system here
    console.log("Success:", message);
  }, []);

  const formatUsagePercentage = useCallback((used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min(100, (used / limit) * 100);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-400";
      case "TRIALING":
        return "text-blue-400";
      case "PAST_DUE":
        return "text-yellow-400";
      case "CANCELED":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="w-4 h-4" />;
      case "TRIALING":
        return <Clock className="w-4 h-4" />;
      case "PAST_DUE":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-bg-main rounded mb-2"></div>
          <div className="h-4 bg-bg-main rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-bg-main rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading billing status: {error}</span>
        </div>
      </div>
    );
  }

  if (!subscriptionData) return null;

  const usagePercentage = formatUsagePercentage(
    subscriptionData.usage.requestsUsed,
    subscriptionData.usage.requestsLimit,
  );

  return (
    <div className="space-y-4">
      {/* Real-time status indicator */}
      <AnimatePresence>
        {isPolling && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-blue-400 text-sm">
                Waiting for payment confirmation...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Payments Alert */}
      <AnimatePresence>
        {paymentStatus?.hasPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-medium">
                  Payment Processing
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  {paymentStatus.message}
                </p>
                <div className="mt-2 space-y-1">
                  {paymentStatus.pendingPayments.map((payment) => (
                    <div key={payment.id} className="text-xs text-gray-400">
                      ${payment.amount} via {payment.provider} -{" "}
                      {payment.status}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Billing Widget */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-2 ${getStatusColor(subscriptionData.subscription.status)}`}
            >
              {getStatusIcon(subscriptionData.subscription.status)}
              <span className="font-medium">
                {subscriptionData.subscription.planName}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              ({subscriptionData.subscription.status})
            </span>
          </div>

          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Usage Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">API Usage</span>
            <span className="text-sm text-gray-400">
              {subscriptionData.usage.requestsUsed.toLocaleString()} /{" "}
              {subscriptionData.usage.requestsLimit.toLocaleString()}
            </span>
          </div>

          <div className="w-full bg-bg-main rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full transition-all duration-500 ${
                usagePercentage > 90
                  ? "bg-red-400"
                  : usagePercentage > 75
                    ? "bg-yellow-400"
                    : "bg-green-400"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>
              {subscriptionData.usage.requestsRemaining.toLocaleString()}{" "}
              remaining
            </span>
            <span>
              Resets{" "}
              {new Date(subscriptionData.usage.resetDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Overage Alert */}
        {subscriptionData.usage.overageRequests > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3 mb-4">
            <div className="flex items-center space-x-2 text-orange-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Overage Usage</span>
            </div>
            <p className="text-gray-300 text-sm mt-1">
              {subscriptionData.usage.overageRequests.toLocaleString()} extra
              requests
              {subscriptionData.usage.overageCost > 0 && (
                <span className="text-orange-400 ml-1">
                  (${subscriptionData.usage.overageCost.toFixed(2)})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
          <div className="text-center">
            <div className="text-xs text-gray-500">Rate Limit</div>
            <div className="text-sm font-medium text-gray-300">
              {subscriptionData.limits.requestsPerMinute}/min
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-500">API Keys</div>
            <div className="text-sm font-medium text-gray-300">
              {subscriptionData.apiKeys.length}/
              {subscriptionData.limits.maxApiKeys}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-500">Burst Limit</div>
            <div className="text-sm font-medium text-gray-300">
              {subscriptionData.limits.burstLimit}
            </div>
          </div>
        </div>

        {/* Suspended Warning */}
        {subscriptionData.user.isSuspended && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mt-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Account Suspended</span>
            </div>
            <p className="text-gray-300 text-sm mt-1">
              Please contact support or update your payment method.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
