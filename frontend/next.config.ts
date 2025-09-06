import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Fix multiple lockfiles warning by specifying output file tracing root
  outputFileTracingRoot: "/home/sol/n0de-deploy/frontend",
  turbopack: {}, // Use Turbopack for faster builds (moved from experimental)
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
    ],
  },
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Improve performance
  poweredByHeader: false,
  reactStrictMode: true,
  // Skip lint and type check during build for production deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // API Proxy Configuration for Development
  // Eliminates CORS issues and simplifies API calls
  async rewrites() {
    // Only apply rewrites in development
    if (!isDevelopment) return [];

    return [
      // Proxy billing API calls (frontend uses /api/billing/*, backend expects /api/v1/billing/*)
      {
        source: "/api/billing/:path*",
        destination: "http://localhost:4000/api/v1/billing/:path*",
      },
      // Proxy payments API calls
      {
        source: "/api/payments/:path*",
        destination: "http://localhost:4000/api/v1/payments/:path*",
      },
      // Proxy subscriptions API calls
      {
        source: "/api/subscriptions/:path*",
        destination: "http://localhost:4000/api/v1/subscriptions/:path*",
      },
      // Proxy all other /api/v1/* requests to backend
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:4000/api/v1/:path*",
      },
      // Proxy health check
      {
        source: "/health",
        destination: "http://localhost:4000/health",
      },
      // Proxy WebSocket connections
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:4000/socket.io/:path*",
      },
      // Proxy RPC endpoints
      {
        source: "/rpc/:path*",
        destination: "http://localhost:4000/rpc/:path*",
      },
      // Proxy Swagger documentation
      {
        source: "/docs/:path*",
        destination: "http://localhost:4000/docs/:path*",
      },
    ];
  },

  // Headers configuration for development
  async headers() {
    if (!isDevelopment) return [];

    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },

  // Environment variables configuration
  env: {
    // These will be available in the browser
    NEXT_PUBLIC_API_URL: isDevelopment
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_API_URL || "https://api.n0de.pro",
    NEXT_PUBLIC_BACKEND_URL: isDevelopment
      ? "http://localhost:4000"
      : process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.n0de.pro",
    NEXT_PUBLIC_WS_URL: isDevelopment
      ? "ws://localhost:4000"
      : process.env.NEXT_PUBLIC_WS_URL || "wss://api.n0de.pro",
  },

  // Webpack configuration for development optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Enable source maps for better debugging
      config.devtool = "eval-source-map";

      // Add file watchers for hot reload
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules", "**/.git", "**/dist", "**/logs"],
      };
    }

    return config;
  },
};

export default nextConfig;
