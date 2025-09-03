#!/bin/bash
# N0DE Development Security Setup
# Implements IP-based access control for safe development

echo "🔒 Setting up N0DE Development Security..."

# Define allowed IPs
SERVER_IP="212.108.83.175"
YOUR_PC_IP="86.22.235.7"
STAGING_PORT="8001"
BACKEND_PORT="3001"
FRONTEND_PORT="3000"

echo "📍 Allowed IPs:"
echo "   Server: $SERVER_IP"
echo "   Your PC: $YOUR_PC_IP"

# 1. Configure UFW firewall for enhanced security
echo "🛡️ Configuring UFW firewall..."

# Reset UFW to ensure clean state
echo "y" | sudo ufw --force reset

# Default policies (deny all incoming, allow outgoing)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH from your PC only
sudo ufw allow from $YOUR_PC_IP to any port 22
echo "✅ SSH access restricted to your PC ($YOUR_PC_IP)"

# Allow HTTP/HTTPS for public production
sudo ufw allow 80
sudo ufw allow 443
echo "✅ HTTP/HTTPS allowed for production"

# Allow staging port only from your PC and server
sudo ufw allow from $YOUR_PC_IP to any port $STAGING_PORT
sudo ufw allow from 127.0.0.1 to any port $STAGING_PORT
echo "✅ Staging port ($STAGING_PORT) restricted to your PC"

# Allow backend port only from localhost and your PC (for direct testing)
sudo ufw allow from $YOUR_PC_IP to any port $BACKEND_PORT
sudo ufw allow from 127.0.0.1 to any port $BACKEND_PORT
echo "✅ Backend port ($BACKEND_PORT) restricted"

# Allow frontend dev port only from localhost and your PC
sudo ufw allow from $YOUR_PC_IP to any port $FRONTEND_PORT
sudo ufw allow from 127.0.0.1 to any port $FRONTEND_PORT
echo "✅ Frontend dev port ($FRONTEND_PORT) restricted"

# Enable UFW
echo "y" | sudo ufw --force enable

# 2. Install and configure fail2ban for additional security
echo "🚫 Setting up fail2ban for intrusion prevention..."
sudo apt-get update -q
sudo apt-get install -y fail2ban

# Create custom fail2ban configuration for N0DE
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 $SERVER_IP $YOUR_PC_IP

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
echo "✅ fail2ban configured and enabled"

# 3. Create staging nginx configuration
echo "⚙️ Installing staging nginx configuration..."
sudo cp /home/sol/n0de-deploy/nginx/n0de-staging-secure.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/n0de-staging-secure.conf /etc/nginx/sites-enabled/

# Test nginx configuration
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx staging configuration applied"
else
    echo "❌ Nginx configuration error - please check"
    exit 1
fi

# 4. Create development environment variables
echo "📝 Creating development environment configuration..."
cat > /home/sol/n0de-deploy/.env.development <<EOF
# Development Environment - IP Restricted
NODE_ENV=development
PORT=3001

# Database: Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/n0de_development

# Redis: Local
REDIS_URL=redis://localhost:6379/1

# Security
JWT_SECRET=dev-jwt-secret-$(openssl rand -hex 32)
API_KEY_SECRET=dev-api-secret-$(openssl rand -hex 32)

# URLs - Development/Staging
FRONTEND_URL=http://$SERVER_IP:$FRONTEND_PORT
BACKEND_URL=http://$SERVER_IP:$STAGING_PORT

# OAuth - Development (separate from production)
GOOGLE_CLIENT_ID=your-dev-google-client-id
GOOGLE_CLIENT_SECRET=your-dev-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://$SERVER_IP:$STAGING_PORT/api/v1/auth/google/callback

GITHUB_CLIENT_ID=your-dev-github-client-id
GITHUB_CLIENT_SECRET=your-dev-github-client-secret
GITHUB_OAUTH_REDIRECT_URI=http://$SERVER_IP:$STAGING_PORT/api/v1/auth/github/callback

# Development Features
DEBUG_MODE=true
BILLING_ENABLED=false
ENABLE_SWAGGER=true

# CORS - Development
CORS_ORIGINS=http://$SERVER_IP:$FRONTEND_PORT,http://$YOUR_PC_IP:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT

# Development Restrictions
DEV_IP_WHITELIST=$SERVER_IP,$YOUR_PC_IP,127.0.0.1
EOF

chown sol:sol /home/sol/n0de-deploy/.env.development
echo "✅ Development environment file created"

# 5. Create development database
echo "🗄️ Setting up development database..."
sudo -u postgres createdb n0de_development 2>/dev/null || echo "Development database already exists"

# 6. Create security monitoring script
cat > /home/sol/n0de-deploy/scripts/security-monitor.sh <<'EOF'
#!/bin/bash
# N0DE Development Security Monitor

echo "🔍 N0DE Security Status Report - $(date)"
echo "============================================"

echo "🛡️ UFW Status:"
sudo ufw status numbered

echo -e "\n🚫 fail2ban Status:"
sudo fail2ban-client status

echo -e "\n📊 Current Connections:"
echo "SSH connections:"
ss -t state established '( sport = :22 )' | grep -v "127.0.0.1"

echo -e "\nActive HTTP connections:"
ss -t state established '( sport = :80 or sport = :443 or sport = :8001 )' | head -10

echo -e "\n📈 Recent Access Attempts:"
echo "Last 10 nginx access logs:"
tail -10 /var/log/nginx/access.log 2>/dev/null || echo "No access logs found"

echo -e "\n🚨 Recent Security Events:"
echo "Last 5 fail2ban actions:"
sudo tail -5 /var/log/fail2ban.log 2>/dev/null | grep "Ban\|Unban" || echo "No recent ban events"

echo -e "\n✅ Security check complete!"
EOF

chmod +x /home/sol/n0de-deploy/scripts/security-monitor.sh
echo "✅ Security monitoring script created"

# 7. Final status report
echo ""
echo "🎯 Development Security Setup Complete!"
echo "============================================"
echo "📍 Your PC IP: $YOUR_PC_IP"
echo "📍 Server IP: $SERVER_IP"
echo "🔒 Access Control: ACTIVE"
echo ""
echo "🚀 Development Endpoints:"
echo "   Staging API: http://$SERVER_IP:$STAGING_PORT"
echo "   Frontend Dev: http://$SERVER_IP:$FRONTEND_PORT"
echo "   Backend Direct: http://$SERVER_IP:$BACKEND_PORT"
echo ""
echo "🛡️ Security Features:"
echo "   ✅ UFW Firewall: Configured"
echo "   ✅ fail2ban: Active"
echo "   ✅ IP Whitelist: Enforced"
echo "   ✅ Rate Limiting: Applied"
echo ""
echo "📊 Monitor security: ./scripts/security-monitor.sh"
echo "⚠️ REMEMBER: Only your IP ($YOUR_PC_IP) can access development services!"