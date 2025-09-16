#!/bin/bash

# N0DE Monitoring Installation Script
# Sets up comprehensive monitoring with systemd service

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Installing N0DE Monitoring System...${NC}"

# Create monitoring user if it doesn't exist
if ! id "n0de-monitor" &>/dev/null; then
    echo -e "${YELLOW}Creating monitoring user...${NC}"
    sudo useradd -r -s /bin/bash -d /home/sol/n0de-deploy/monitoring -M n0de-monitor
    sudo usermod -a -G adm,systemd-journal n0de-monitor
fi

# Set up monitoring directory permissions
echo -e "${YELLOW}Setting up monitoring directories...${NC}"
sudo mkdir -p /var/log/n0de /home/sol/n0de-deploy/monitoring
sudo chown -R n0de-monitor:n0de-monitor /var/log/n0de /home/sol/n0de-deploy/monitoring
sudo chmod 755 /var/log/n0de /home/sol/n0de-deploy/monitoring

# Make monitoring script executable
chmod +x /home/sol/n0de-deploy/monitoring/n0de-monitor.sh

# Create systemd service for monitoring
echo -e "${YELLOW}Creating monitoring systemd service...${NC}"
sudo tee /etc/systemd/system/n0de-monitor.service > /dev/null << 'EOF'
[Unit]
Description=N0DE Monitoring System
Documentation=https://github.com/n0de-team/n0de-backend
After=network.target n0de-backend.service
Wants=n0de-backend.service

[Service]
Type=simple
User=n0de-monitor
Group=n0de-monitor
WorkingDirectory=/home/sol/n0de-deploy/monitoring
ExecStart=/home/sol/n0de-deploy/monitoring/n0de-monitor.sh monitor
ExecReload=/bin/kill -HUP $MAINPID

# Restart policy
Restart=always
RestartSec=30
StartLimitInterval=300
StartLimitBurst=5

# Resource limits
LimitNOFILE=1024
MemoryMax=256M
CPUQuota=50%

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/var/log/n0de
ReadWritePaths=/home/sol/n0de-deploy/monitoring
ReadWritePaths=/tmp

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=n0de-monitor

[Install]
WantedBy=multi-user.target
EOF

# Create log rotation configuration
echo -e "${YELLOW}Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/n0de-monitoring > /dev/null << 'EOF'
/var/log/n0de/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 n0de-monitor n0de-monitor
    postrotate
        systemctl reload n0de-monitor 2>/dev/null || true
    endscript
}
EOF

# Install monitoring utilities if not present
echo -e "${YELLOW}Installing monitoring utilities...${NC}"
sudo apt update -qq
sudo apt install -y jq curl mailutils 2>/dev/null || {
    echo -e "${YELLOW}Some utilities failed to install (this is usually fine)${NC}"
}

# Create monitoring dashboard script
echo -e "${YELLOW}Creating monitoring dashboard...${NC}"
cat > /home/sol/n0de-deploy/monitoring/dashboard.sh << 'EOF'
#!/bin/bash

# N0DE Monitoring Dashboard
# Real-time display of system status

MONITOR_DIR="/home/sol/n0de-deploy/monitoring"
STATUS_FILE="$MONITOR_DIR/status.json"

clear
echo "═══════════════════════════════════════════════════════"
echo "               N0DE MONITORING DASHBOARD"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ -f "$STATUS_FILE" ]; then
    echo "📊 System Status ($(date)):"
    echo ""
    
    if command -v jq >/dev/null 2>&1; then
        # Parse JSON with jq if available
        CPU=$(jq -r '.system.cpu_usage // "N/A"' "$STATUS_FILE")
        MEMORY=$(jq -r '.system.memory_usage // "N/A"' "$STATUS_FILE") 
        DISK=$(jq -r '.system.disk_usage // "N/A"' "$STATUS_FILE")
        LAST_CHECK=$(jq -r '.last_check // "N/A"' "$STATUS_FILE")
        
        echo "💻 System Resources:"
        echo "  CPU: $CPU"
        echo "  Memory: $MEMORY" 
        echo "  Disk: $DISK"
        echo ""
        
        echo "🔧 Services:"
        jq -r '.services | to_entries[] | "  \(.key): \(.value)"' "$STATUS_FILE" 2>/dev/null || echo "  Service info unavailable"
        echo ""
        
        echo "📅 Last Check: $LAST_CHECK"
    else
        # Fallback without jq
        echo "Status file found, but jq not available for parsing"
        cat "$STATUS_FILE"
    fi
else
    echo "❌ No status file found. Is monitoring running?"
    echo ""
    echo "Start monitoring with:"
    echo "  sudo systemctl start n0de-monitor"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Commands:"
echo "  systemctl status n0de-monitor  - Check monitoring service"
echo "  monitoring/n0de-monitor.sh alerts - View recent alerts"
echo "  monitoring/n0de-monitor.sh logs - View monitor logs"
echo "═══════════════════════════════════════════════════════"
EOF

chmod +x /home/sol/n0de-deploy/monitoring/dashboard.sh

# Create monitoring aliases
echo -e "${YELLOW}Creating monitoring aliases...${NC}"
cat >> /home/sol/.bashrc << 'EOF'

# N0DE Monitoring Aliases
alias n0de-status='/home/sol/n0de-deploy/monitoring/dashboard.sh'
alias n0de-monitor='sudo systemctl status n0de-monitor'
alias n0de-alerts='/home/sol/n0de-deploy/monitoring/n0de-monitor.sh alerts'
alias n0de-logs='sudo journalctl -u n0de-monitor -f'
EOF

# Enable and start monitoring service
echo -e "${YELLOW}Enabling and starting monitoring service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable n0de-monitor

# Test configuration first
echo -e "${YELLOW}Testing monitoring configuration...${NC}"
if /home/sol/n0de-deploy/monitoring/n0de-monitor.sh test; then
    echo -e "${GREEN}✅ Monitoring test passed${NC}"
    
    # Start the monitoring service
    sudo systemctl start n0de-monitor
    
    # Wait a moment and check status
    sleep 3
    if sudo systemctl is-active --quiet n0de-monitor; then
        echo -e "${GREEN}✅ Monitoring service started successfully${NC}"
    else
        echo -e "${RED}❌ Monitoring service failed to start${NC}"
        sudo systemctl status n0de-monitor
        exit 1
    fi
else
    echo -e "${RED}❌ Monitoring test failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 N0DE Monitoring System installed successfully!${NC}"
echo ""
echo -e "${BLUE}Monitoring Features:${NC}"
echo "  📊 Real-time system monitoring"
echo "  🔧 Service health checks"
echo "  🌐 Endpoint monitoring" 
echo "  📨 Alert notifications"
echo "  📝 Comprehensive logging"
echo "  🔄 Log rotation"
echo ""
echo -e "${BLUE}Commands:${NC}"
echo "  n0de-status     - Show monitoring dashboard"
echo "  n0de-monitor    - Check monitoring service status"
echo "  n0de-alerts     - View recent alerts"
echo "  n0de-logs       - Follow monitoring logs"
echo ""
echo -e "${BLUE}Service Management:${NC}"
echo "  sudo systemctl start n0de-monitor     - Start monitoring"
echo "  sudo systemctl stop n0de-monitor      - Stop monitoring"
echo "  sudo systemctl restart n0de-monitor   - Restart monitoring"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Edit: /home/sol/n0de-deploy/monitoring/monitor.conf"
echo "  Logs: /var/log/n0de/monitor.log"
echo "  Alerts: /home/sol/n0de-deploy/monitoring/alerts.log"
EOF