#!/bin/bash

# Complete Payment Testing Script for N0DE
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   N0DE Payment System Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Configuration
API_URL="http://localhost:4000"
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="n0de_production"

# Function to check if backend is running
check_backend() {
    echo -e "${YELLOW}Checking backend status...${NC}"
    if curl -s "$API_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running. Starting it now...${NC}"
        pm2 restart n0de-backend
        sleep 3
        return 1
    fi
}

# Function to monitor database
monitor_database() {
    echo -e "\n${YELLOW}Current payment records:${NC}"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h localhost -c \
        "SELECT id, status, amount, provider, \"createdAt\" 
         FROM payments 
         ORDER BY \"createdAt\" DESC 
         LIMIT 5;" 2>/dev/null || echo "No payments found"
    
    echo -e "\n${YELLOW}Unprocessed webhook events:${NC}"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h localhost -c \
        "SELECT COUNT(*) as unprocessed 
         FROM webhook_events 
         WHERE processed = false;" 2>/dev/null
}

# Function to create test payment
create_test_payment() {
    echo -e "\n${YELLOW}Creating test Stripe payment link...${NC}"
    
    # Run the Node.js payment test script
    node /home/sol/n0de-deploy/scripts/test-payment-flow.js
}

# Main execution
echo -e "${YELLOW}Step 1: Backend Health Check${NC}"
check_backend

echo -e "\n${YELLOW}Step 2: Database Status${NC}"
monitor_database

echo -e "\n${YELLOW}Step 3: Creating Test Payment${NC}"
create_test_payment

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}   Testing Instructions${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}To test payments:${NC}"
echo -e "1. ${YELLOW}Browser Test:${NC}"
echo -e "   - Open: https://www.n0de.pro/checkout?plan=STARTER"
echo -e "   - Use test card: 4242 4242 4242 4242"
echo -e "   - Any future expiry date, any CVC\n"

echo -e "2. ${YELLOW}Webhook Forwarding:${NC}"
echo -e "   Run in another terminal:"
echo -e "   ${BLUE}./scripts/setup-stripe-webhooks.sh${NC}\n"

echo -e "3. ${YELLOW}Monitor Database:${NC}"
echo -e "   Run in another terminal:"
echo -e "   ${BLUE}watch -n 2 'PGPASSWORD=postgres psql -U postgres -d n0de_production -c \"SELECT * FROM payments ORDER BY \\\"createdAt\\\" DESC LIMIT 5;\"'${NC}\n"

echo -e "4. ${YELLOW}Monitor Logs:${NC}"
echo -e "   Run in another terminal:"
echo -e "   ${BLUE}pm2 logs n0de-backend${NC}\n"

echo -e "${GREEN}✅ Test environment ready!${NC}"