#!/bin/bash

# N0DE System Services Setup Script
# Sets up systemd services for isolated deployment

set -euo pipefail

echo "🔧 Setting up N0DE system services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create n0de user and group if they don't exist
if ! id "n0de" &>/dev/null; then
    echo -e "${YELLOW}Creating n0de user and group...${NC}"
    sudo useradd -r -s /bin/false -d /home/sol/n0de-deploy -M n0de
    sudo usermod -a -G n0de sol
fi

# Create necessary directories
echo -e "${YELLOW}Creating necessary directories...${NC}"
sudo mkdir -p /var/log/n0de
sudo chown n0de:n0de /var/log/n0de
sudo chmod 755 /var/log/n0de

# Set ownership for n0de-deploy directory
echo -e "${YELLOW}Setting permissions for n0de-deploy...${NC}"
sudo chown -R sol:n0de /home/sol/n0de-deploy
sudo chmod -R 750 /home/sol/n0de-deploy
sudo chmod -R g+w /home/sol/n0de-deploy/node_modules 2>/dev/null || true
sudo chmod -R g+w /home/sol/n0de-deploy/dist 2>/dev/null || true

# Install systemd service files
echo -e "${YELLOW}Installing systemd service files...${NC}"
sudo cp /home/sol/n0de-deploy/systemd/n0de-backend.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable but don't start yet (we'll start after full setup)
echo -e "${YELLOW}Enabling n0de-backend service...${NC}"
sudo systemctl enable n0de-backend

echo -e "${GREEN}✅ System services setup complete!${NC}"
echo ""
echo "Services configured:"
echo "  - n0de-backend.service (port 3001)"
echo "  - User: n0de"
echo "  - Logs: /var/log/n0de and journalctl -u n0de-backend"
echo ""
echo "Next steps:"
echo "  1. Build the application (npm run build)"
echo "  2. Set up environment variables (.env.production)"
echo "  3. Start services (sudo systemctl start n0de-backend)"