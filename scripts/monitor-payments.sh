#!/bin/bash

# Real-time Payment Monitoring Script
# Watches database for payment activity in real-time

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="n0de_production"
DB_HOST="localhost"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   N0DE Real-time Payment Monitor${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Monitoring payment activity...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

# Function to display current timestamp
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Function to monitor payments
monitor_payments() {
    while true; do
        clear
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}   Payment Monitor - $(timestamp)${NC}"
        echo -e "${BLUE}========================================${NC}\n"
        
        # Recent Payments (last 10 minutes)
        echo -e "${YELLOW}📊 Recent Payments (last 10 minutes):${NC}"
        PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "
            SELECT 
                SUBSTRING(id, 1, 8) as id,
                provider,
                \"planType\",
                status,
                CONCAT('$', amount) as amount,
                TO_CHAR(\"createdAt\", 'HH24:MI:SS') as time
            FROM payments 
            WHERE \"createdAt\" > NOW() - INTERVAL '10 minutes'
            ORDER BY \"createdAt\" DESC
            LIMIT 10;
        " 2>/dev/null || echo -e "${RED}❌ Database connection failed${NC}"
        
        echo ""
        
        # Unprocessed Webhooks
        echo -e "${YELLOW}🔄 Unprocessed Webhook Events:${NC}"
        UNPROCESSED=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "
            SELECT COUNT(*) FROM webhook_events WHERE processed = false;
        " 2>/dev/null | xargs)
        
        if [ "$UNPROCESSED" -gt 0 ]; then
            echo -e "${RED}⚠️  $UNPROCESSED unprocessed webhook events${NC}"
            PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "
                SELECT 
                    SUBSTRING(id, 1, 8) as id,
                    provider,
                    \"eventType\",
                    \"errorMessage\",
                    TO_CHAR(\"createdAt\", 'HH24:MI:SS') as time
                FROM webhook_events 
                WHERE processed = false
                ORDER BY \"createdAt\" DESC
                LIMIT 5;
            " 2>/dev/null
        else
            echo -e "${GREEN}✅ All webhook events processed${NC}"
        fi
        
        echo ""
        
        # Payment Statistics
        echo -e "${YELLOW}📈 Payment Statistics (last 24 hours):${NC}"
        PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "
            SELECT 
                provider,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount END), 0) as revenue
            FROM payments 
            WHERE \"createdAt\" > NOW() - INTERVAL '24 hours'
            GROUP BY provider
            ORDER BY total DESC;
        " 2>/dev/null || echo -e "${RED}❌ Statistics query failed${NC}"
        
        echo ""
        
        # Active Subscriptions
        echo -e "${YELLOW}👥 Active Subscriptions:${NC}"
        PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "
            SELECT 
                type as plan,
                COUNT(*) as active_users,
                COUNT(CASE WHEN \"endDate\" > NOW() THEN 1 END) as not_expired
            FROM subscriptions 
            WHERE status = 'ACTIVE'
            GROUP BY type
            ORDER BY active_users DESC;
        " 2>/dev/null || echo -e "${RED}❌ Subscription query failed${NC}"
        
        echo ""
        echo -e "${BLUE}Refreshing in 5 seconds... (Ctrl+C to stop)${NC}"
        sleep 5
    done
}

# Function to test database connection
test_connection() {
    echo -e "${YELLOW}Testing database connection...${NC}"
    if PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}\n"
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo -e "${RED}Please check your database configuration${NC}\n"
        return 1
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}N0DE Payment Monitor Usage:${NC}"
    echo -e "${YELLOW}  monitor-payments.sh           ${NC}# Start real-time monitoring"
    echo -e "${YELLOW}  monitor-payments.sh --help    ${NC}# Show this help"
    echo -e "${YELLOW}  monitor-payments.sh --test    ${NC}# Test database connection"
    echo -e "${YELLOW}  monitor-payments.sh --summary ${NC}# Show summary and exit"
    echo ""
}

# Function to show summary
show_summary() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   Payment System Summary${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    
    # Total counts
    echo -e "${YELLOW}💳 Total Payments:${NC}"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "
        SELECT 
            COUNT(*) as total_payments,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
            COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount END), 0) as total_revenue
        FROM payments;
    " 2>/dev/null
    
    echo ""
    
    # By provider
    echo -e "${YELLOW}🏦 By Payment Provider:${NC}"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "
        SELECT 
            provider,
            COUNT(*) as payments,
            COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount END), 0) as revenue
        FROM payments
        GROUP BY provider
        ORDER BY payments DESC;
    " 2>/dev/null
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --test|-t)
        test_connection
        exit $?
        ;;
    --summary|-s)
        if test_connection; then
            show_summary
        fi
        exit 0
        ;;
    "")
        if test_connection; then
            monitor_payments
        fi
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac