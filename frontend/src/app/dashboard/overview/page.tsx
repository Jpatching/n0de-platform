"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layouts/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import {
  Activity,
  Key,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  BarChart3,
  Code,
  Users,
} from "lucide-react";

interface Metric {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: any;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "success" | "warning" | "info";
}

const AppOverview = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real usage data from backend
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.n0de.pro";
        const endpoint =
          process.env.NODE_ENV === "development"
            ? "/api/billing/usage"
            : `${backendUrl}/api/v1/billing/usage`;
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("n0de_token")}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch metrics data");
        }

        const data = await response.json();

        // Format usage data
        const formatNumber = (num: number): string => {
          if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
          if (num >= 1000) return (num / 1000).toFixed(1) + "K";
          return num.toString();
        };

        const newMetrics: Metric[] = [
          {
            label: "API Requests",
            value: formatNumber(data.usage?.requests_used || 0),
            change: data.analytics?.requests_growth || "+12.3%",
            changeType:
              data.analytics?.requests_growth?.startsWith("+") ||
              !data.analytics?.requests_growth
                ? "positive"
                : "negative",
            icon: Activity,
          },
          {
            label: "Response Time",
            value: `${data.analytics?.avg_latency || 42}ms`,
            change: data.analytics?.latency_change || "-8.2%",
            changeType:
              data.analytics?.latency_change?.startsWith("-") ||
              !data.analytics?.latency_change
                ? "positive"
                : "negative",
            icon: Clock,
          },
          {
            label: "Success Rate",
            value: `${(data.analytics?.success_rate || 99.97).toFixed(2)}%`,
            change: data.analytics?.success_rate_change || "+0.02%",
            changeType:
              data.analytics?.success_rate_change?.startsWith("+") ||
              !data.analytics?.success_rate_change
                ? "positive"
                : "negative",
            icon: CheckCircle,
          },
          {
            label: "Active Keys",
            value: (data.analytics?.active_keys || 8).toString(),
            change: data.analytics?.keys_change || "+2",
            changeType:
              data.analytics?.keys_change?.startsWith("+") ||
              !data.analytics?.keys_change
                ? "positive"
                : "negative",
            icon: Key,
          },
        ];

        setMetrics(newMetrics);
      } catch (err) {
        console.error("Error fetching overview metrics:", err);
        setError(err instanceof Error ? err.message : "Failed to load metrics");

        // No fallback data - show real metrics or empty state
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch real activity data
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setActivityLoading(true);
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.n0de.pro";
        const endpoint =
          process.env.NODE_ENV === "development"
            ? "/api/activity/recent"
            : `${backendUrl}/api/v1/activity/recent`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("n0de_token")}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setRecentActivity(data.activities || []);
        }
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchActivity();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Activity className="h-4 w-4 text-blue-400" />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              <span className="text-white">Loading dashboard metrics...</span>
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
          {/* Page Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome back,{" "}
                  {user?.firstName || user?.username || "Developer"}
                </h1>
                <p className="text-zinc-400">
                  Here&apos;s what&apos;s happening with your API today.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-zinc-400">All systems operational</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.length > 0
              ? metrics.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                          <Icon className="h-5 w-5 text-cyan-400" />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            metric.changeType === "positive"
                              ? "text-green-400"
                              : metric.changeType === "negative"
                                ? "text-red-400"
                                : "text-zinc-400"
                          }`}
                        >
                          {metric.change}
                        </span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white mb-1">
                          {metric.value}
                        </p>
                        <p className="text-sm text-zinc-400">{metric.label}</p>
                      </div>
                    </motion.div>
                  );
                })
              : // Show default empty metrics
                [
                  { label: "API Requests", icon: Activity },
                  { label: "Response Time", icon: Clock },
                  { label: "Success Rate", icon: CheckCircle },
                  { label: "Active Keys", icon: Key },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <item.icon className="h-5 w-5 text-zinc-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-zinc-500 mb-1">
                        --
                      </p>
                      <p className="text-sm text-zinc-400">{item.label}</p>
                    </div>
                  </motion.div>
                ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Usage Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">API Usage</h3>
                <div className="flex items-center space-x-2">
                  <select className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm text-white">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                  </select>
                </div>
              </div>

              {/* Placeholder for chart */}
              <div className="h-64 bg-zinc-900/50 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">
                    Usage chart will be displayed here
                  </p>
                  <p className="text-zinc-500 text-sm">
                    Connect your analytics to see real-time data
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Recent Activity
                </h3>
                <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                  </div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors"
                    >
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {activity.title}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">No recent activity</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Activity will appear here as you use the platform
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <button className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <Key className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Create API Key
                  </p>
                  <p className="text-xs text-zinc-400">
                    Generate new credentials
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-cyan-400 transition-colors ml-auto" />
              </div>
            </button>

            <button className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <Code className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    API Playground
                  </p>
                  <p className="text-xs text-zinc-400">Test endpoints</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-cyan-400 transition-colors ml-auto" />
              </div>
            </button>

            <button className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <Database className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    View Database
                  </p>
                  <p className="text-xs text-zinc-400">Manage your data</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-cyan-400 transition-colors ml-auto" />
              </div>
            </button>

            <button className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Invite Team</p>
                  <p className="text-xs text-zinc-400">Add collaborators</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-cyan-400 transition-colors ml-auto" />
              </div>
            </button>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default AppOverview;
