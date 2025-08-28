# Use Node.js 18 Debian slim as base image (better Prisma compatibility)
FROM node:18-slim

# Install OpenSSL and other required libraries for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm install --legacy-peer-deps

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client with proper binary targets for Railway
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies but keep Prisma CLI for migrations
RUN npm prune --omit=dev && npm install prisma @prisma/client

# Expose port (Railway uses PORT environment variable)
EXPOSE 8080

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nestjs

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application (migrations run automatically before app starts)
CMD ["npm", "run", "start:prod"] 