#!/bin/bash

# N0DE Service Management Script
# Provides easy service management commands

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_NAME="n0de-backend"

show_help() {
    echo "N0DE Service Manager"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the n0de-backend service"
    echo "  stop      - Stop the n0de-backend service"
    echo "  restart   - Restart the n0de-backend service"
    echo "  status    - Show service status"
    echo "  logs      - Show recent logs"
    echo "  follow    - Follow logs in real-time"
    echo "  enable    - Enable service to start on boot"
    echo "  disable   - Disable service from starting on boot"
    echo "  reload    - Reload systemd configuration"
    echo "  health    - Check service health"
    echo ""
}

check_service_exists() {
    if ! systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
        echo -e "${RED}❌ Service ${SERVICE_NAME} not found. Run setup-system-services.sh first.${NC}"
        exit 1
    fi
}

service_start() {
    echo -e "${BLUE}🚀 Starting ${SERVICE_NAME}...${NC}"
    sudo systemctl start $SERVICE_NAME
    sleep 2
    service_status
}

service_stop() {
    echo -e "${YELLOW}🛑 Stopping ${SERVICE_NAME}...${NC}"
    sudo systemctl stop $SERVICE_NAME
    echo -e "${GREEN}✅ Service stopped${NC}"
}

service_restart() {
    echo -e "${BLUE}🔄 Restarting ${SERVICE_NAME}...${NC}"
    sudo systemctl restart $SERVICE_NAME
    sleep 2
    service_status
}

service_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    sudo systemctl status $SERVICE_NAME --no-pager -l
    echo ""
    echo -e "${BLUE}🔌 Port Status:${NC}"
    ss -tlnp | grep :3001 || echo "Port 3001 not listening"
}

service_logs() {
    echo -e "${BLUE}📋 Recent Logs:${NC}"
    sudo journalctl -u $SERVICE_NAME --no-pager -l -n 50
}

service_follow() {
    echo -e "${BLUE}📋 Following Logs (Ctrl+C to exit):${NC}"
    sudo journalctl -u $SERVICE_NAME -f
}

service_enable() {
    echo -e "${BLUE}⚙️ Enabling ${SERVICE_NAME} to start on boot...${NC}"
    sudo systemctl enable $SERVICE_NAME
    echo -e "${GREEN}✅ Service enabled${NC}"
}

service_disable() {
    echo -e "${YELLOW}⚙️ Disabling ${SERVICE_NAME} from starting on boot...${NC}"
    sudo systemctl disable $SERVICE_NAME
    echo -e "${GREEN}✅ Service disabled${NC}"
}

service_reload() {
    echo -e "${BLUE}🔄 Reloading systemd configuration...${NC}"
    sudo systemctl daemon-reload
    echo -e "${GREEN}✅ Configuration reloaded${NC}"
}

service_health() {
    echo -e "${BLUE}🏥 Health Check:${NC}"
    echo ""
    
    # Check if service is active
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${GREEN}✅ Service is running${NC}"
        
        # Check if port is listening
        if ss -tlnp | grep -q :3001; then
            echo -e "${GREEN}✅ Port 3001 is listening${NC}"
            
            # Try HTTP health check
            if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ HTTP health check passed${NC}"
                curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
            else
                echo -e "${RED}❌ HTTP health check failed${NC}"
            fi
        else
            echo -e "${RED}❌ Port 3001 not listening${NC}"
        fi
    else
        echo -e "${RED}❌ Service is not running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}System Resources:${NC}"
    echo "CPU Usage: $(ps -C node -o %cpu --no-headers | awk '{sum+=$1} END {print sum "%"}')"
    echo "Memory Usage: $(ps -C node -o %mem --no-headers | awk '{sum+=$1} END {print sum "%"}')"
}

# Main command handling
case "${1:-help}" in
    "start")
        check_service_exists
        service_start
        ;;
    "stop")
        check_service_exists
        service_stop
        ;;
    "restart")
        check_service_exists
        service_restart
        ;;
    "status")
        check_service_exists
        service_status
        ;;
    "logs")
        check_service_exists
        service_logs
        ;;
    "follow")
        check_service_exists
        service_follow
        ;;
    "enable")
        check_service_exists
        service_enable
        ;;
    "disable")
        check_service_exists
        service_disable
        ;;
    "reload")
        service_reload
        ;;
    "health")
        check_service_exists
        service_health
        ;;
    "help"|*)
        show_help
        ;;
esac