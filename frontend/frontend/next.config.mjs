/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle analyzer for Phase 2 optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle splitting optimization
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Game engines get their own chunks
          gameEngines: {
            test: /[\\/](chess-engine|coinflip-engine|crash-engine|mines-engine)[\\/]/,
            name: 'game-engines',
            chunks: 'all',
            priority: 15,
          },
          // Unity and 3D libraries
          unity3d: {
            test: /[\\/](three|@3d-dice|unity)[\\/]/,
            name: 'unity-3d',
            chunks: 'all',
            priority: 20,
          },
          // Audio libraries
          audio: {
            test: /[\\/](howler|tone|web-audio)[\\/]/,
            name: 'audio-libs',
            chunks: 'all',
            priority: 12,
          }
        }
      };
    }
    return config;
  },
  
  // Existing config
  images: {
    domains: ['localhost', 'vercel.app'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Compression and performance
  compress: true,
  poweredByHeader: false,
  
  // Bundle analyzer (only in development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, options) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true,
        })
      );
      return config;
    },
  }),
};

export default nextConfig; 