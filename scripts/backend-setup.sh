#!/bin/bash

# N0DE Backend Setup Script
# Configures NestJS backend for bare metal deployment

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up N0DE Backend for bare metal deployment...${NC}"

# Change to project directory
cd /home/sol/n0de-deploy

# Check if we have the necessary files
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Are you in the right directory?${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --only=production || {
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate || {
    echo -e "${RED}❌ Prisma generate failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Prisma client generated${NC}"

# Build the application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Application built successfully${NC}"

# Create production environment file from template
echo -e "${YELLOW}⚙️  Setting up environment configuration...${NC}"

if [ ! -f ".env.production" ]; then
    cp .env.production.template .env.production
    echo -e "${YELLOW}📄 Created .env.production from template${NC}"
    echo -e "${YELLOW}⚠️  You need to update .env.production with your actual values${NC}"
else
    echo -e "${BLUE}📄 .env.production already exists${NC}"
fi

# Merge database and Redis configuration if they exist
if [ -f ".env.database" ]; then
    echo -e "${YELLOW}🔗 Merging database configuration...${NC}"
    
    # Read database URL and update .env.production
    DB_URL=$(grep DATABASE_URL .env.database)
    
    # Replace the template DATABASE_URL with the real one
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=\"postgresql://.*\"|$DB_URL|" .env.production
    else
        # Linux
        sed -i "s|DATABASE_URL=\"postgresql://.*\"|$DB_URL|" .env.production
    fi
    
    echo -e "${GREEN}✅ Database URL updated in .env.production${NC}"
fi

if [ -f ".env.redis" ]; then
    echo -e "${YELLOW}🔗 Merging Redis configuration...${NC}"
    
    # Read Redis URL and update .env.production
    REDIS_URL_LINE=$(grep REDIS_URL .env.redis)
    
    # Replace the template REDIS_URL with the real one
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|REDIS_URL=\"redis://.*\"|$REDIS_URL_LINE|" .env.production
    else
        # Linux
        sed -i "s|REDIS_URL=\"redis://.*\"|$REDIS_URL_LINE|" .env.production
    fi
    
    echo -e "${GREEN}✅ Redis URL updated in .env.production${NC}"
fi

# Set proper permissions
echo -e "${YELLOW}🔒 Setting permissions...${NC}"
chmod 600 .env.production .env.* 2>/dev/null || true
chmod +x dist/src/main.js 2>/dev/null || true

# Test the build
echo -e "${YELLOW}🧪 Testing the build...${NC}"
timeout 10 node dist/src/main.js || {
    if [ $? -eq 124 ]; then
        echo -e "${GREEN}✅ Application starts successfully${NC}"
    else
        echo -e "${RED}❌ Application failed to start${NC}"
        echo "Check your environment configuration in .env.production"
        exit 1
    fi
}

echo -e "${GREEN}🎉 Backend setup completed successfully!${NC}"
echo ""
echo "Configuration files:"
echo "  📄 .env.production - Main configuration (update with your values)"
echo "  📄 .env.database - Database connection"  
echo "  📄 .env.redis - Redis connection"
echo ""
echo "Next steps:"
echo "  1. Update .env.production with your actual values (JWT secret, OAuth keys, etc.)"
echo "  2. Run database migrations: npx prisma db push"
echo "  3. Start the service: ./scripts/service-manager.sh start"
echo "  4. Check logs: ./scripts/service-manager.sh logs"
echo ""
echo "Important files to configure:"
echo "  - JWT_SECRET: $(openssl rand -base64 32)"
echo "  - OAuth credentials from your providers"
echo "  - Payment provider keys"