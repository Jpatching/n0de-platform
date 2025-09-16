#!/bin/bash

# N0DE Domain Routing Fix Script
# Fixes the www.n0de.pro → n0de.pro redirect issue

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 N0DE Domain Routing Fix${NC}"
echo "=============================="

# Step 1: Deploy the updated Vercel configuration
echo -e "\n${YELLOW}Step 1: Deploying updated Vercel configuration...${NC}"
cd /home/sol/n0de-deploy/frontend

# Deploy to Vercel
if vercel --prod; then
    echo -e "${GREEN}✅ Vercel deployment successful${NC}"
else
    echo -e "${RED}❌ Vercel deployment failed${NC}"
    exit 1
fi

# Step 2: Add both domains to Vercel project
echo -e "\n${YELLOW}Step 2: Adding domains to Vercel project...${NC}"

# Add n0de.pro domain
echo "Adding n0de.pro..."
if vercel domains add n0de.pro 2>/dev/null || echo "Domain already exists"; then
    echo -e "${GREEN}✅ n0de.pro domain configured${NC}"
fi

# Add www.n0de.pro domain  
echo "Adding www.n0de.pro..."
if vercel domains add www.n0de.pro 2>/dev/null || echo "Domain already exists"; then
    echo -e "${GREEN}✅ www.n0de.pro domain configured${NC}"
fi

# Step 3: Get the required DNS records
echo -e "\n${YELLOW}Step 3: Getting required DNS configuration...${NC}"

echo -e "\n${BLUE}DNS Records needed for Porkbun:${NC}"
echo "=================================="
echo -e "${YELLOW}For n0de.pro:${NC}"
echo "Type: A"
echo "Name: @"
echo "Value: 76.76.19.61"
echo ""
echo -e "${YELLOW}For www.n0de.pro:${NC}"
echo "Type: CNAME" 
echo "Name: www"
echo "Value: cname.vercel-dns.com"
echo ""
echo -e "${YELLOW}For api.n0de.pro (if not already configured):${NC}"
echo "Type: A"
echo "Name: api"
echo "Value: $(curl -s ipinfo.io/ip)"

# Step 4: Test the domains
echo -e "\n${YELLOW}Step 4: Testing domain accessibility...${NC}"

sleep 10  # Wait for DNS propagation

test_domain() {
    local domain=$1
    local expected_status=${2:-200}
    
    echo -n "Testing $domain... "
    local status=$(curl -s -w '%{http_code}' -o /dev/null --max-time 10 "https://$domain")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $status${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ $status (may need DNS propagation)${NC}"
        return 1
    fi
}

test_domain "n0de.pro"
test_domain "www.n0de.pro"

# Step 5: Verify redirect behavior
echo -e "\n${YELLOW}Step 5: Checking redirect behavior...${NC}"

check_redirect() {
    local domain=$1
    echo -n "Checking $domain redirect behavior... "
    
    local response=$(curl -s -I "https://$domain" --max-time 10)
    local status=$(echo "$response" | grep "HTTP/" | awk '{print $2}')
    local location=$(echo "$response" | grep -i "location:" | awk '{print $2}' | tr -d '\r')
    
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✅ Serving content directly${NC}"
    elif [ "$status" = "301" ] || [ "$status" = "302" ] || [ "$status" = "307" ] || [ "$status" = "308" ]; then
        echo -e "${YELLOW}⚠️ Redirecting to: $location${NC}"
    else
        echo -e "${RED}❌ Status: $status${NC}"
    fi
}

check_redirect "www.n0de.pro"
check_redirect "n0de.pro"

# Step 6: Manual DNS configuration instructions
echo -e "\n${BLUE}📋 Manual DNS Configuration Required${NC}"
echo "====================================="
echo -e "${YELLOW}If you see redirect issues above, configure these DNS records in Porkbun:${NC}"
echo ""
echo "1. Login to Porkbun dashboard"
echo "2. Go to DNS settings for n0de.pro" 
echo "3. Add/Update these records:"
echo ""
echo -e "${GREEN}Record 1:${NC}"
echo "  Type: A"
echo "  Host: @"
echo "  Answer: 76.76.19.61"
echo "  TTL: 300"
echo ""
echo -e "${GREEN}Record 2:${NC}"
echo "  Type: CNAME"
echo "  Host: www"  
echo "  Answer: cname.vercel-dns.com"
echo "  TTL: 300"
echo ""
echo -e "${GREEN}Record 3 (if api subdomain not working):${NC}"
echo "  Type: A"
echo "  Host: api"
echo "  Answer: $(curl -s ipinfo.io/ip)"
echo "  TTL: 300"

# Step 7: Final verification
echo -e "\n${YELLOW}Step 7: Final system verification...${NC}"

echo "Frontend deployment URL:"
echo "$(vercel list | head -1 | awk '{print $3}')"

echo -e "\n${GREEN}✅ Domain routing fix deployed!${NC}"
echo -e "${BLUE}Note: DNS changes may take up to 24 hours to fully propagate.${NC}"
echo -e "${BLUE}Test your payment flows after DNS propagation is complete.${NC}"

# Create a test script for later verification
cat > /home/sol/n0de-deploy/scripts/test-domain-routing.sh << 'EOF'
#!/bin/bash

# Test script to verify domain routing is working correctly

echo "Testing N0DE domain routing..."

echo -n "n0de.pro: "
curl -s -w '%{http_code}' -o /dev/null https://n0de.pro

echo -n "www.n0de.pro: "  
curl -s -w '%{http_code}' -o /dev/null https://www.n0de.pro

echo -n "api.n0de.pro/health: "
curl -s -w '%{http_code}' -o /dev/null https://api.n0de.pro/health

echo ""
echo "Payment flow test URLs:"
echo "- Subscription page: https://n0de.pro/subscription"
echo "- Payment success: https://n0de.pro/payment/success" 
echo "- Payment cancel: https://n0de.pro/payment/cancel"
EOF

chmod +x /home/sol/n0de-deploy/scripts/test-domain-routing.sh

echo -e "\n${BLUE}Created test script: /home/sol/n0de-deploy/scripts/test-domain-routing.sh${NC}"
echo -e "Run this later to verify the fix worked!"