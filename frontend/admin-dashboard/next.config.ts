import type { NextConfig } from "next";

// Admin Dashboard Configuration - Updated for deployment
const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ['src']
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
