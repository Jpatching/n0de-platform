#!/bin/bash

# N0DE nginx Configuration Setup Script
# Sets up nginx reverse proxy for RPC + Website Backend

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌐 Setting up nginx configuration for N0DE...${NC}"

# Backup current nginx config
echo -e "${YELLOW}Backing up current nginx configuration...${NC}"
sudo mkdir -p /etc/nginx/backups
sudo cp /etc/nginx/sites-enabled/* /etc/nginx/backups/ 2>/dev/null || true
echo "Backup saved to /etc/nginx/backups/"

# Test nginx configuration syntax
echo -e "${YELLOW}Testing nginx configuration...${NC}"
sudo nginx -t

# Install new configuration
echo -e "${YELLOW}Installing new nginx configuration...${NC}"
sudo cp /home/sol/n0de-deploy/nginx/n0de-complete.conf /etc/nginx/sites-available/

# Remove old site links and enable new one
sudo rm -f /etc/nginx/sites-enabled/n0de-*
sudo ln -sf /etc/nginx/sites-available/n0de-complete.conf /etc/nginx/sites-enabled/

# Test new configuration
echo -e "${YELLOW}Testing new nginx configuration...${NC}"
sudo nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ nginx configuration test passed${NC}"
    
    # Reload nginx
    echo -e "${YELLOW}Reloading nginx...${NC}"
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ nginx reloaded successfully${NC}"
    else
        echo -e "${RED}❌ nginx reload failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ nginx configuration test failed${NC}"
    echo -e "${YELLOW}Restoring previous configuration...${NC}"
    sudo cp /etc/nginx/backups/* /etc/nginx/sites-enabled/ 2>/dev/null || true
    sudo systemctl reload nginx
    exit 1
fi

echo -e "${GREEN}🎉 nginx configuration complete!${NC}"
echo ""
echo "Configuration details:"
echo "  📡 RPC API: /rpc/{api_key} → Solana RPC (8899)"
echo "  🌐 Website API: /api/v1/* → N0DE Backend (3001)"
echo "  🏥 Health checks: /health (RPC), /api/health (API)"
echo "  📚 API docs: /docs"
echo ""
echo "Next steps:"
echo "  1. Start the n0de-backend service"
echo "  2. Test endpoints with curl"
echo "  3. Update Vercel environment variables"