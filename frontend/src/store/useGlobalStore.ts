"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Types
interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN" | "ENTERPRISE";
  subscription?: {
    id: string;
    userId: string;
    planType: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED";
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface GlobalNotification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title?: string;
  duration?: number;
  timestamp: number;
}

interface PerformanceMetrics {
  totalRequests: number;
  avgLatency: number;
  uptime: number;
  errorRate: number;
  throughput: number;
  successRate: number;
}

interface GlobalState {
  // UI State
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  activeTab: string;

  // User State
  user: User | null;
  isAuthenticated: boolean;

  // Performance State
  performanceMetrics: PerformanceMetrics | null;
  isLoadingMetrics: boolean;

  // Notifications
  notifications: GlobalNotification[];

  // System Status
  systemStatus: "operational" | "degraded" | "down";
  lastStatusCheck: number;
}

interface GlobalActions {
  // UI Actions
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setActiveTab: (tab: string) => void;

  // User Actions
  setUser: (user: User | null) => void;
  logout: () => void;

  // Performance Actions
  setPerformanceMetrics: (metrics: PerformanceMetrics) => void;
  setLoadingMetrics: (loading: boolean) => void;

  // Notification Actions
  addNotification: (
    notification: Omit<GlobalNotification, "id" | "timestamp">,
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // System Actions
  setSystemStatus: (status: "operational" | "degraded" | "down") => void;
  updateStatusCheck: () => void;
}

type GlobalStore = GlobalState & GlobalActions;

// Create the store
export const useGlobalStore = create<GlobalStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    sidebarCollapsed: false,
    theme: "dark",
    activeTab: "overview",
    user: null,
    isAuthenticated: false,
    performanceMetrics: null,
    isLoadingMetrics: false,
    notifications: [],
    systemStatus: "operational",
    lastStatusCheck: Date.now(),

    // UI Actions
    toggleSidebar: () =>
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    setTheme: (theme) => {
      set({ theme });
      // Apply theme to document
      if (typeof window !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("n0de-theme", theme);
      }
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    // User Actions
    setUser: (user) =>
      set({
        user,
        isAuthenticated: !!user,
      }),

    logout: () =>
      set({
        user: null,
        isAuthenticated: false,
        performanceMetrics: null,
      }),

    // Performance Actions
    setPerformanceMetrics: (metrics) =>
      set({
        performanceMetrics: metrics,
        isLoadingMetrics: false,
      }),

    setLoadingMetrics: (loading) => set({ isLoadingMetrics: loading }),

    // Notification Actions
    addNotification: (notification) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const timestamp = Date.now();
      const newNotification = { ...notification, id, timestamp };

      set((state) => ({
        notifications: [...state.notifications, newNotification],
      }));

      // Auto-remove after duration (default 5 seconds)
      const duration = notification.duration || 5000;
      if (duration > 0) {
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      }
    },

    removeNotification: (id) =>
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),

    clearNotifications: () => set({ notifications: [] }),

    // System Actions
    setSystemStatus: (status) =>
      set({
        systemStatus: status,
        lastStatusCheck: Date.now(),
      }),

    updateStatusCheck: () => set({ lastStatusCheck: Date.now() }),
  })),
);

// Selectors for specific parts of the state
export const useUser = () => useGlobalStore((state) => state.user);
export const useAuth = () =>
  useGlobalStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    setUser: state.setUser,
    logout: state.logout,
  }));

export const usePerformance = () =>
  useGlobalStore((state) => ({
    metrics: state.performanceMetrics,
    isLoading: state.isLoadingMetrics,
    setMetrics: state.setPerformanceMetrics,
    setLoading: state.setLoadingMetrics,
  }));

export const useNotifications = () =>
  useGlobalStore((state) => ({
    notifications: state.notifications,
    addNotification: state.addNotification,
    removeNotification: state.removeNotification,
    clearNotifications: state.clearNotifications,
  }));

export const useTheme = () =>
  useGlobalStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));

export const useUI = () =>
  useGlobalStore((state) => ({
    sidebarCollapsed: state.sidebarCollapsed,
    activeTab: state.activeTab,
    toggleSidebar: state.toggleSidebar,
    setActiveTab: state.setActiveTab,
  }));

// Initialize theme on load
if (typeof window !== "undefined") {
  const savedTheme = localStorage.getItem("n0de-theme") as
    | "light"
    | "dark"
    | "system"
    | null;
  if (savedTheme) {
    useGlobalStore.getState().setTheme(savedTheme);
  }
}

export default useGlobalStore;
