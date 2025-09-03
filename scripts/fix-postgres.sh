#!/bin/bash

echo "🔧 Fixing PostgreSQL authentication..."

# Set the postgres user password
sudo -u postgres psql << EOF
ALTER USER postgres PASSWORD 'postgres';
CREATE DATABASE IF NOT EXISTS n0de_production;
GRANT ALL PRIVILEGES ON DATABASE n0de_production TO postgres;
\q
EOF

echo "✅ PostgreSQL password set to: postgres"
echo "✅ Database: n0de_production"

# Update pg_hba.conf to use md5 authentication
echo "Updating authentication method..."
sudo sed -i 's/local   all             postgres                                peer/local   all             postgres                                md5/' /etc/postgresql/16/main/pg_hba.conf
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/16/main/pg_hba.conf

# Restart PostgreSQL
echo "Restarting PostgreSQL..."
sudo systemctl restart postgresql

echo "✅ PostgreSQL configured successfully!"
echo ""
echo "Test connection with:"
echo "  PGPASSWORD=postgres psql -U postgres -d n0de_production -c 'SELECT 1;'"