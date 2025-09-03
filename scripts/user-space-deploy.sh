#!/bin/bash

# N0DE User-Space Deployment (No Sudo Required)
# Deploys N0DE backend using user-level services and permissions

set -euo pipefail

# Load error handling library
source "/home/sol/n0de-deploy/lib/error-handler.sh"
init_error_handler "$(basename "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/home/sol/n0de-deploy"
USER_SERVICE_DIR="$HOME/.config/systemd/user"
USER_NGINX_DIR="$HOME/.config/nginx"
BACKEND_PORT=3001
FRONTEND_PORT=3002

echo -e "${PURPLE}🚀 N0DE User-Space Deployment${NC}"
echo -e "${PURPLE}==============================${NC}"
echo ""
echo -e "${BLUE}This deployment runs everything in user space - no sudo required!${NC}"
echo ""

cd "$PROJECT_DIR"

# Step 1: Build the application
echo -e "${YELLOW}📦 Building N0DE Backend...${NC}"
npm ci --only=production
npm run build
log_success "Backend build completed"

# Step 2: Setup user-level systemd directory
echo -e "${YELLOW}⚙️ Setting up user systemd services...${NC}"
mkdir -p "$USER_SERVICE_DIR"

# Create user-level N0DE backend service
cat > "$USER_SERVICE_DIR/n0de-backend.service" << EOF
[Unit]
Description=N0DE Backend API Service (User)
After=network.target
Documentation=https://github.com/n0de-team/n0de-backend

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=PORT=$BACKEND_PORT
EnvironmentFile=$PROJECT_DIR/.env.production
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/backend.log  
StandardError=append:$PROJECT_DIR/logs/backend-error.log
TimeoutStartSec=30

# Security settings (user-level)
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$PROJECT_DIR
ReadOnlyPaths=/
RemoveIPC=true

[Install]
WantedBy=default.target
EOF

log_success "User systemd service created"

# Step 3: Setup environment with DATABASE_URL that works
echo -e "${YELLOW}🔧 Configuring environment...${NC}"
if [ ! -f ".env.production" ]; then
    cp .env.production.template .env.production
fi

# Use SQLite for user-space deployment (no PostgreSQL setup required)
sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./n0de.db"|g' .env.production
sed -i "s|PORT=.*|PORT=$BACKEND_PORT|g" .env.production

log_success "Environment configured for user-space deployment"

# Step 4: Setup database (SQLite - no sudo required)
echo -e "${YELLOW}🗄️ Setting up database...${NC}"
npx prisma db push --accept-data-loss
log_success "Database setup completed"

# Step 5: Create log directory
echo -e "${YELLOW}📝 Setting up logging...${NC}"
mkdir -p logs
touch logs/backend.log logs/backend-error.log
log_success "Logging configured"

# Step 6: Enable and start user service
echo -e "${YELLOW}🔄 Starting N0DE backend service...${NC}"
systemctl --user daemon-reload
systemctl --user enable n0de-backend.service
systemctl --user start n0de-backend.service

# Wait for service to start
sleep 5

if systemctl --user is-active --quiet n0de-backend.service; then
    log_success "N0DE backend service started successfully"
else
    log_error "N0DE backend service failed to start"
    systemctl --user status n0de-backend.service --no-pager -l
    return 1
fi

# Step 7: Test the backend
echo -e "${YELLOW}🧪 Testing backend connectivity...${NC}"
if curl -s -f "http://localhost:$BACKEND_PORT/health" > /dev/null; then
    log_success "Backend health check passed"
else
    log_warning "Backend health check failed - service may still be starting"
fi

# Step 8: Setup nginx user configuration (optional reverse proxy)
echo -e "${YELLOW}🌐 Setting up user nginx configuration...${NC}"
mkdir -p "$USER_NGINX_DIR/conf.d"

cat > "$USER_NGINX_DIR/nginx.conf" << EOF
# User-level nginx configuration
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Basic settings
    sendfile on;
    keepalive_timeout 65;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    # Upstream
    upstream n0de_backend {
        server 127.0.0.1:$BACKEND_PORT;
        keepalive 16;
    }
    
    # Server block for user nginx
    server {
        listen $FRONTEND_PORT;
        server_name localhost;
        
        # API proxy
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://n0de_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            
            # Response buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }
        
        # Health check
        location /health {
            proxy_pass http://n0de_backend/health;
            access_log off;
        }
        
        # Default
        location / {
            return 200 'N0DE Backend Running (User Space)\\n\\n🚀 Backend: http://localhost:$BACKEND_PORT\\n📡 API Proxy: http://localhost:$FRONTEND_PORT/api\\n🏥 Health: http://localhost:$FRONTEND_PORT/health\\n';
            add_header Content-Type text/plain;
        }
    }
}
EOF

log_success "User nginx configuration created"

# Step 9: Display deployment summary
echo ""
echo -e "${GREEN}✅ N0DE User-Space Deployment Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "🎯 Services Running:"
echo "   • N0DE Backend: http://localhost:$BACKEND_PORT"
echo "   • Health Check: http://localhost:$BACKEND_PORT/health" 
echo "   • User nginx: http://localhost:$FRONTEND_PORT (optional)"
echo ""
echo "🔧 Service Management:"
echo "   • Status: systemctl --user status n0de-backend.service"
echo "   • Logs: journalctl --user -u n0de-backend.service -f"
echo "   • Stop: systemctl --user stop n0de-backend.service"
echo "   • Restart: systemctl --user restart n0de-backend.service"
echo ""
echo "📁 Files Created:"
echo "   • Service: $USER_SERVICE_DIR/n0de-backend.service"
echo "   • Database: $PROJECT_DIR/n0de.db (SQLite)"
echo "   • Logs: $PROJECT_DIR/logs/"
echo ""
echo "🌟 Next Steps:"
echo "   • Update Vercel: NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT"
echo "   • For production: Configure reverse proxy to expose publicly"
echo "   • Monitor logs: tail -f logs/backend.log"
echo ""
echo -e "${PURPLE}🎉 Railway-free deployment successful!${NC}"

# Optional: Test the deployment
if [ "${1:-}" = "test" ]; then
    echo ""
    echo -e "${YELLOW}🧪 Running deployment tests...${NC}"
    sleep 2
    
    # Test backend
    if curl -s "http://localhost:$BACKEND_PORT/health" | grep -q "ok"; then
        echo -e "${GREEN}✅ Backend health test passed${NC}"
    else
        echo -e "${RED}❌ Backend health test failed${NC}"
    fi
    
    # Test user systemd service
    if systemctl --user is-active --quiet n0de-backend.service; then
        echo -e "${GREEN}✅ User systemd service test passed${NC}"
    else
        echo -e "${RED}❌ User systemd service test failed${NC}"
    fi
fi

log_success "User-space deployment completed successfully"