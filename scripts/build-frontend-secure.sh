#!/bin/bash
# N0DE Frontend Build for Secure Bare Metal Deployment

echo "🏗️ Building frontend for secure bare metal deployment..."

cd /home/sol/n0de-deploy/frontend

# Environment for production build
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Update Next.js config for static export
cat > next.config.ts << 'NEXTJS_EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Enable static export for nginx serving
  trailingSlash: true,
  images: {
    unoptimized: true,  // Disable Image Optimization for static export
  },
  // Remove Vercel-specific configurations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Security optimizations
  compiler: {
    removeConsole: true,  // Remove console logs in production
  },
  
  // Webpack security optimizations
  webpack: (config, { dev, isServer }) => {
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
NEXTJS_EOF

# Build the frontend
npm run build

# Copy build output to nginx directory
sudo mkdir -p /var/www/n0de-frontend
sudo cp -r out/* /var/www/n0de-frontend/
sudo chown -R www-data:www-data /var/www/n0de-frontend
sudo chmod -R 644 /var/www/n0de-frontend
sudo find /var/www/n0de-frontend -type d -exec chmod 755 {} \;

echo "✅ Frontend built and deployed to nginx"
