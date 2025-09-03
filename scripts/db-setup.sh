#!/bin/bash

# N0DE Database Setup Script
# Sets up PostgreSQL database and user for n0de backend

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🗄️  Setting up PostgreSQL for N0DE...${NC}"

# Database configuration
DB_NAME="n0de_db"
DB_USER="n0de_user"
DB_PASSWORD="n0de_secure_$(date +%s | sha256sum | base64 | head -c 16)"

echo -e "${YELLOW}Creating database and user...${NC}"

# Create database and user
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};

\q
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database setup completed successfully${NC}"
    
    # Save database URL to file
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
    echo "DATABASE_URL=\"${DATABASE_URL}\"" > /home/sol/n0de-deploy/.env.database
    echo -e "${GREEN}✅ Database URL saved to .env.database${NC}"
    
    echo ""
    echo "Database configuration:"
    echo "  Database: ${DB_NAME}"
    echo "  User: ${DB_USER}"
    echo "  Password: ${DB_PASSWORD}"
    echo "  URL: ${DATABASE_URL}"
    echo ""
    echo "Next steps:"
    echo "  1. Run Prisma migrations"
    echo "  2. Test database connection"
else
    echo -e "${RED}❌ Database setup failed${NC}"
    exit 1
fi