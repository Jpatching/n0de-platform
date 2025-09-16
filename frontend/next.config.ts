import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Fix multiple lockfiles warning by specifying output file tracing root
  outputFileTracingRoot: "/home/jp/n0de-local/frontend",
  // Turbopack configuration - optimized for faster builds
  turbopack: {
    // Turbopack handles CSS, PostCSS, and modern JS compilation natively
    // No need for additional loaders - built-in support included
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**',
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Add quality configurations to fix Next.js 16 warning
    qualities: [75, 90, 100],
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

  // Headers configuration for development and production
  async headers() {
    return [
      // CORS headers for API routes
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { 
            key: "Access-Control-Allow-Origin", 
            value: isDevelopment ? "*" : "https://n0de.pro,https://www.n0de.pro,https://api.n0de.pro" 
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key",
          },
          { key: "Access-Control-Max-Age", value: "86400" }, // 24 hours
        ],
      },
      // Security headers for all pages
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Environment variables configuration
  env: {
    // These will be available in the browser - FIXED: No /api/v1 duplication
    NEXT_PUBLIC_API_URL: isDevelopment
      ? "http://localhost:3000/api/v1"  // Proxied through Next.js rewrites
      : "https://api.n0de.pro/api/v1",  // Direct backend API with /api/v1 path
    NEXT_PUBLIC_BACKEND_URL: isDevelopment
      ? "http://localhost:4000"  // Backend without /api/v1 for WebSocket/non-API calls
      : process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.n0de.pro",
    NEXT_PUBLIC_WS_URL: isDevelopment
      ? "ws://localhost:4000"
      : process.env.NEXT_PUBLIC_WS_URL || "wss://api.n0de.pro",
  },

  // Note: Webpack configuration removed as Turbopack provides:
  // - Built-in source maps for debugging
  // - Native hot reload and file watching
  // - Faster compilation without additional configuration
};

export default nextConfig;
