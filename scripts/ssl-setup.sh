#!/bin/bash

# N0DE SSL/TLS Setup Script
# Configures Let's Encrypt SSL certificates and HTTPS

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔒 Setting up SSL/TLS for N0DE...${NC}"

# Check if domain is provided
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Usage: $0 <domain.com>${NC}"
    echo "Example: $0 api.n0de.pro"
    echo ""
    echo "Available options:"
    echo "  --staging    Use Let's Encrypt staging environment (for testing)"
    echo "  --skip-dns   Skip DNS verification check"
    exit 1
fi

DOMAIN="$1"
STAGING=""
SKIP_DNS_CHECK=false

# Parse additional arguments
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --staging)
            STAGING="--staging"
            echo -e "${YELLOW}⚠️  Using Let's Encrypt STAGING environment${NC}"
            ;;
        --skip-dns)
            SKIP_DNS_CHECK=true
            echo -e "${YELLOW}⚠️  Skipping DNS verification${NC}"
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
    shift
done

# Validate domain format
if ! [[ $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    echo -e "${RED}❌ Invalid domain format: $DOMAIN${NC}"
    exit 1
fi

# Check if running as root (needed for certbot and nginx)
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root. Consider using sudo instead.${NC}"
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing certbot...${NC}"
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# DNS verification (unless skipped)
if [ "$SKIP_DNS_CHECK" = false ]; then
    echo -e "${YELLOW}🔍 Verifying DNS configuration for $DOMAIN...${NC}"
    
    # Get current server IP
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
    echo "Server IP: $SERVER_IP"
    
    # Check DNS resolution
    DNS_IP=$(dig +short "$DOMAIN" @8.8.8.8 | tail -n1)
    
    if [ -z "$DNS_IP" ]; then
        echo -e "${RED}❌ DNS resolution failed for $DOMAIN${NC}"
        echo "Please ensure your domain points to this server ($SERVER_IP)"
        exit 1
    fi
    
    if [ "$DNS_IP" != "$SERVER_IP" ]; then
        echo -e "${RED}❌ DNS mismatch:${NC}"
        echo "  Domain $DOMAIN resolves to: $DNS_IP"
        echo "  Server IP is: $SERVER_IP"
        echo ""
        echo "Please update your DNS to point $DOMAIN to $SERVER_IP"
        exit 1
    fi
    
    echo -e "${GREEN}✅ DNS configuration verified${NC}"
fi

# Create webroot directory for challenges
echo -e "${YELLOW}📁 Creating webroot directory...${NC}"
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html

# Stop nginx temporarily for standalone authentication (safer)
echo -e "${YELLOW}🛑 Temporarily stopping nginx...${NC}"
sudo systemctl stop nginx

# Obtain SSL certificate
echo -e "${YELLOW}🔐 Obtaining SSL certificate from Let's Encrypt...${NC}"

# Use standalone mode for initial certificate
if certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email support@${DOMAIN#*.} \
    -d "$DOMAIN" \
    $STAGING; then
    
    echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo "Starting nginx again..."
    sudo systemctl start nginx
    exit 1
fi

# Update nginx configuration with SSL
echo -e "${YELLOW}🌐 Updating nginx configuration for SSL...${NC}"

# Copy SSL configuration and update domain
sudo cp /home/sol/n0de-deploy/nginx/n0de-complete-ssl.conf /etc/nginx/sites-available/
sudo sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/n0de-complete-ssl.conf

# Remove old configuration and enable SSL version
sudo rm -f /etc/nginx/sites-enabled/n0de-*
sudo ln -sf /etc/nginx/sites-available/n0de-complete-ssl.conf /etc/nginx/sites-enabled/

# Test nginx configuration
echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ nginx configuration test passed${NC}"
else
    echo -e "${RED}❌ nginx configuration test failed${NC}"
    echo "Restoring previous configuration..."
    sudo rm -f /etc/nginx/sites-enabled/n0de-complete-ssl.conf
    sudo ln -sf /etc/nginx/sites-available/n0de-complete.conf /etc/nginx/sites-enabled/
    exit 1
fi

# Start nginx with SSL configuration
echo -e "${YELLOW}🚀 Starting nginx with SSL configuration...${NC}"
sudo systemctl start nginx

# Verify SSL is working
echo -e "${YELLOW}🔍 Verifying SSL configuration...${NC}"
sleep 3

if curl -s -f "https://$DOMAIN/health" > /dev/null; then
    echo -e "${GREEN}✅ HTTPS is working correctly${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS health check failed (this might be normal if backend isn't running yet)${NC}"
fi

# Set up automatic certificate renewal
echo -e "${YELLOW}⏰ Setting up automatic certificate renewal...${NC}"

# Create renewal hook script
sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null << 'EOF'
#!/bin/bash
# Reload nginx after certificate renewal
systemctl reload nginx
logger "SSL certificate renewed and nginx reloaded"
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Test renewal (dry run)
echo -e "${YELLOW}🧪 Testing certificate renewal...${NC}"
if sudo certbot renew --dry-run; then
    echo -e "${GREEN}✅ Certificate renewal test passed${NC}"
else
    echo -e "${YELLOW}⚠️  Certificate renewal test failed (check configuration)${NC}"
fi

# Add to crontab if not already there
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo -e "${YELLOW}⏰ Adding certificate renewal to crontab...${NC}"
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
fi

echo -e "${GREEN}🎉 SSL setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}SSL Configuration Details:${NC}"
echo "  🌐 Domain: $DOMAIN"
echo "  📄 Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  🔑 Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "  🔄 Auto-renewal: Enabled (daily check at 12:00 PM)"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo "  🔒 HTTPS API: https://$DOMAIN/api/v1/"
echo "  🔒 HTTPS RPC: https://$DOMAIN/rpc/{api_key}"
echo "  🔒 HTTPS Health: https://$DOMAIN/api/health"
echo "  🔒 HTTPS Docs: https://$DOMAIN/docs"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update your .env.production with HTTPS URLs"
echo "  2. Update Vercel environment variables to use HTTPS"
echo "  3. Test all endpoints with HTTPS"
echo "  4. Update any hardcoded HTTP references to HTTPS"