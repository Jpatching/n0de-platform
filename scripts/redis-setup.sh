#!/bin/bash

# N0DE Redis Setup Script
# Configures Redis for n0de backend with proper isolation

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔴 Setting up Redis for N0DE...${NC}"

# Check if Redis is running
if ! systemctl is-active --quiet redis-server; then
    echo -e "${RED}❌ Redis server is not running${NC}"
    echo "Starting Redis..."
    sudo systemctl start redis-server
    sleep 2
fi

# Check Redis connection
echo -e "${YELLOW}Testing Redis connection...${NC}"
if redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis is responding${NC}"
else
    echo -e "${RED}❌ Redis connection failed${NC}"
    exit 1
fi

# Create Redis configuration for n0de
echo -e "${YELLOW}Configuring Redis for N0DE...${NC}"

# Set up Redis database for n0de (using database 1 to avoid conflicts)
redis-cli << EOF
SELECT 1
FLUSHDB
SET n0de:config:setup "$(date)"
SET n0de:config:version "1.0.0"
QUIT
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Redis configuration completed${NC}"
    
    # Save Redis URL to file
    REDIS_URL="redis://localhost:6379/1"
    echo "REDIS_URL=\"${REDIS_URL}\"" > /home/sol/n0de-deploy/.env.redis
    echo -e "${GREEN}✅ Redis URL saved to .env.redis${NC}"
    
    echo ""
    echo "Redis configuration:"
    echo "  Host: localhost"
    echo "  Port: 6379"
    echo "  Database: 1 (isolated from other services)"
    echo "  URL: ${REDIS_URL}"
    echo ""
    echo "Redis info:"
    redis-cli info server | grep redis_version
else
    echo -e "${RED}❌ Redis setup failed${NC}"
    exit 1
fi