import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Use Turbopack for faster builds (moved from experimental)
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Improve performance
  poweredByHeader: false,
  reactStrictMode: false, // Disable strict mode to reduce hydration issues
  
  // Hydration configuration
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Skip lint and type check during build for production deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Webpack configuration for better hydration handling
  webpack: (config, { dev, isServer }) => {
    // Handle client-side rendering issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
