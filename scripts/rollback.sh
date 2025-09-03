#!/bin/bash

# N0DE Rollback Script
# Safely rolls back to Railway if migration fails

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${RED}🔙 N0DE Migration Rollback${NC}"
echo -e "${RED}=========================${NC}"
echo ""

echo -e "${YELLOW}⚠️  This will rollback your migration and stop local services.${NC}"
echo -e "${YELLOW}⚠️  Make sure Railway is still running before proceeding!${NC}"
echo ""
echo "Are you sure you want to rollback? (y/N)"
read -r confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

echo -e "${BLUE}🛑 Stopping local services...${NC}"

# Stop n0de backend service
if systemctl is-active --quiet n0de-backend 2>/dev/null; then
    echo "Stopping n0de-backend service..."
    sudo systemctl stop n0de-backend
    echo -e "${GREEN}✅ n0de-backend service stopped${NC}"
fi

# Disable the service
if systemctl is-enabled --quiet n0de-backend 2>/dev/null; then
    echo "Disabling n0de-backend service..."
    sudo systemctl disable n0de-backend
    echo -e "${GREEN}✅ n0de-backend service disabled${NC}"
fi

# Restore nginx configuration
echo -e "${BLUE}🌐 Restoring nginx configuration...${NC}"

if [ -d "/etc/nginx/backups" ] && [ "$(ls -A /etc/nginx/backups 2>/dev/null)" ]; then
    echo "Restoring nginx configuration from backup..."
    sudo rm -f /etc/nginx/sites-enabled/n0de-complete.conf
    sudo cp /etc/nginx/backups/* /etc/nginx/sites-enabled/ 2>/dev/null || true
    
    # Test and reload nginx
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ nginx configuration restored${NC}"
    else
        echo -e "${RED}❌ nginx configuration test failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No nginx backup found${NC}"
fi

# Keep database and Redis running (they don't interfere with Railway)
echo -e "${BLUE}📊 Local database and Redis will remain running${NC}"
echo -e "${YELLOW}💡 You can clean them up later if desired${NC}"

# Update Vercel to point back to Railway (if needed)
echo -e "${BLUE}🔄 Vercel Environment Update${NC}"
echo ""
echo "Don't forget to:"
echo "1. Update Vercel environment variables to point back to Railway"
echo "2. Check that Railway services are still running"
echo "3. Test your frontend at https://n0de.pro"
echo ""

# Show Railway status
if railway --version > /dev/null 2>&1; then
    echo -e "${BLUE}📡 Checking Railway status...${NC}"
    railway status || echo "Run 'railway status' to check your Railway deployment"
else
    echo -e "${YELLOW}💡 Install Railway CLI to check status: npm install -g @railway/cli${NC}"
fi

echo ""
echo -e "${GREEN}🔙 Rollback completed!${NC}"
echo ""
echo -e "${PURPLE}Railway should now be handling your traffic again.${NC}"
echo ""
echo "Cleanup commands (optional):"
echo "  - Remove systemd service: sudo rm /etc/systemd/system/n0de-backend.service"
echo "  - Remove nginx config: sudo rm /etc/nginx/sites-available/n0de-complete.conf"
echo "  - Remove n0de user: sudo userdel n0de"
echo "  - Clean up database: sudo -u postgres dropdb n0de_db && sudo -u postgres dropuser n0de_user"