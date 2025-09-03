#!/bin/bash

# N0DE Comprehensive Backup System
# Creates and manages backups for all critical components

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/home/sol/n0de-deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="n0de-backup-$TIMESTAMP"
FULL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Create backup directory structure
mkdir -p "$BACKUP_DIR"/{database,redis,config,logs,ssl}

echo -e "${PURPLE}💾 N0DE Comprehensive Backup System${NC}"
echo -e "${PURPLE}===================================${NC}"

# Logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$BACKUP_DIR/backup.log"
}

# Backup database
backup_database() {
    echo -e "${YELLOW}📊 Backing up PostgreSQL database...${NC}"
    
    if [ -f "/home/sol/n0de-deploy/.env.database" ]; then
        source /home/sol/n0de-deploy/.env.database
        
        DB_BACKUP_FILE="$FULL_BACKUP_PATH/database/n0de_database_$TIMESTAMP.sql"
        mkdir -p "$(dirname "$DB_BACKUP_FILE")"
        
        # Create database dump with compression
        if pg_dump "$DATABASE_URL" | gzip > "$DB_BACKUP_FILE.gz"; then
            DB_SIZE=$(du -h "$DB_BACKUP_FILE.gz" | cut -f1)
            echo -e "${GREEN}✅ Database backup completed ($DB_SIZE)${NC}"
            log "Database backup completed: $DB_BACKUP_FILE.gz ($DB_SIZE)"
            
            # Create schema-only backup for quick restore testing
            pg_dump --schema-only "$DATABASE_URL" > "$FULL_BACKUP_PATH/database/schema_$TIMESTAMP.sql"
            log "Schema-only backup created: schema_$TIMESTAMP.sql"
        else
            echo -e "${RED}❌ Database backup failed${NC}"
            log "ERROR: Database backup failed"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Database configuration not found, skipping database backup${NC}"
        log "WARNING: Database configuration not found"
    fi
}

# Backup Redis data
backup_redis() {
    echo -e "${YELLOW}🔴 Backing up Redis data...${NC}"
    
    REDIS_BACKUP_FILE="$FULL_BACKUP_PATH/redis/redis_$TIMESTAMP.rdb"
    mkdir -p "$(dirname "$REDIS_BACKUP_FILE")"
    
    if systemctl is-active --quiet redis-server; then
        # Force Redis to save current state
        redis-cli BGSAVE
        
        # Wait for background save to complete
        echo -e "${BLUE}Waiting for Redis background save to complete...${NC}"
        while [ "$(redis-cli LASTSAVE)" = "$(redis-cli LASTSAVE)" ]; do
            sleep 1
        done
        
        # Copy the RDB file
        if [ -f "/var/lib/redis/dump.rdb" ]; then
            cp /var/lib/redis/dump.rdb "$REDIS_BACKUP_FILE"
            REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
            echo -e "${GREEN}✅ Redis backup completed ($REDIS_SIZE)${NC}"
            log "Redis backup completed: $REDIS_BACKUP_FILE ($REDIS_SIZE)"
        else
            echo -e "${YELLOW}⚠️  Redis dump file not found${NC}"
            log "WARNING: Redis dump file not found"
        fi
        
        # Also export Redis data as text for easy inspection
        echo "# Redis data export - $(date)" > "$FULL_BACKUP_PATH/redis/redis_data_$TIMESTAMP.txt"
        redis-cli --scan | while read key; do
            key_type=$(redis-cli type "$key")
            echo "KEY: $key (TYPE: $key_type)" >> "$FULL_BACKUP_PATH/redis/redis_data_$TIMESTAMP.txt"
            case $key_type in
                string)
                    redis-cli get "$key" >> "$FULL_BACKUP_PATH/redis/redis_data_$TIMESTAMP.txt"
                    ;;
                hash)
                    redis-cli hgetall "$key" >> "$FULL_BACKUP_PATH/redis/redis_data_$TIMESTAMP.txt"
                    ;;
                *)
                    echo "(complex type - use redis-cli to inspect)" >> "$FULL_BACKUP_PATH/redis/redis_data_$TIMESTAMP.txt"
                    ;;
            esac
            echo "---" >> "$FULL_BACKUP_PATH/redis/redis_data_$TIMESTAMP.txt"
        done
        
    else
        echo -e "${YELLOW}⚠️  Redis is not running, skipping Redis backup${NC}"
        log "WARNING: Redis is not running"
    fi
}

# Backup configuration files
backup_config() {
    echo -e "${YELLOW}⚙️  Backing up configuration files...${NC}"
    
    CONFIG_BACKUP_DIR="$FULL_BACKUP_PATH/config"
    mkdir -p "$CONFIG_BACKUP_DIR"
    
    # Environment files
    cp /home/sol/n0de-deploy/.env* "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
    
    # Nginx configuration
    mkdir -p "$CONFIG_BACKUP_DIR/nginx"
    cp -r /etc/nginx/sites-available/n0de-* "$CONFIG_BACKUP_DIR/nginx/" 2>/dev/null || true
    cp -r /etc/nginx/sites-enabled/n0de-* "$CONFIG_BACKUP_DIR/nginx/" 2>/dev/null || true
    
    # Systemd services
    mkdir -p "$CONFIG_BACKUP_DIR/systemd"
    cp /etc/systemd/system/n0de-* "$CONFIG_BACKUP_DIR/systemd/" 2>/dev/null || true
    
    # Application configuration
    cp /home/sol/n0de-deploy/package.json "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
    cp /home/sol/n0de-deploy/prisma/schema.prisma "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
    
    # Monitoring configuration
    mkdir -p "$CONFIG_BACKUP_DIR/monitoring"
    cp /home/sol/n0de-deploy/monitoring/monitor.conf "$CONFIG_BACKUP_DIR/monitoring/" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Configuration backup completed${NC}"
    log "Configuration backup completed"
}

# Backup SSL certificates
backup_ssl() {
    echo -e "${YELLOW}🔒 Backing up SSL certificates...${NC}"
    
    SSL_BACKUP_DIR="$FULL_BACKUP_PATH/ssl"
    mkdir -p "$SSL_BACKUP_DIR"
    
    if [ -d "/etc/letsencrypt" ]; then
        # Backup Let's Encrypt certificates and configuration
        sudo cp -r /etc/letsencrypt "$SSL_BACKUP_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✅ SSL certificates backup completed${NC}"
        log "SSL certificates backup completed"
    else
        echo -e "${YELLOW}⚠️  No SSL certificates found${NC}"
        log "WARNING: No SSL certificates found"
    fi
}

# Backup application logs
backup_logs() {
    echo -e "${YELLOW}📝 Backing up application logs...${NC}"
    
    LOG_BACKUP_DIR="$FULL_BACKUP_PATH/logs"
    mkdir -p "$LOG_BACKUP_DIR"
    
    # N0DE logs
    mkdir -p "$LOG_BACKUP_DIR/n0de"
    cp /var/log/n0de/* "$LOG_BACKUP_DIR/n0de/" 2>/dev/null || true
    
    # Nginx logs (recent only)
    mkdir -p "$LOG_BACKUP_DIR/nginx"
    tail -1000 /var/log/nginx/n0de_access.log > "$LOG_BACKUP_DIR/nginx/access.log" 2>/dev/null || true
    tail -1000 /var/log/nginx/n0de_error.log > "$LOG_BACKUP_DIR/nginx/error.log" 2>/dev/null || true
    
    # Systemd journal (recent only)
    journalctl -u n0de-backend --since "1 day ago" > "$LOG_BACKUP_DIR/backend-journal.log" 2>/dev/null || true
    journalctl -u n0de-monitor --since "1 day ago" > "$LOG_BACKUP_DIR/monitor-journal.log" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Logs backup completed${NC}"
    log "Logs backup completed"
}

# Create backup metadata
create_backup_metadata() {
    echo -e "${YELLOW}📋 Creating backup metadata...${NC}"
    
    cat > "$FULL_BACKUP_PATH/backup-info.json" << EOF
{
    "backup_name": "$BACKUP_NAME",
    "timestamp": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "ip_address": "$(curl -s ifconfig.me 2>/dev/null || echo 'unknown')",
    "user": "$(whoami)",
    "backup_type": "full",
    "components": {
        "database": $([ -f "$FULL_BACKUP_PATH/database/n0de_database_$TIMESTAMP.sql.gz" ] && echo "true" || echo "false"),
        "redis": $([ -f "$FULL_BACKUP_PATH/redis/redis_$TIMESTAMP.rdb" ] && echo "true" || echo "false"),
        "config": $([ -d "$FULL_BACKUP_PATH/config" ] && echo "true" || echo "false"),
        "ssl": $([ -d "$FULL_BACKUP_PATH/ssl/letsencrypt" ] && echo "true" || echo "false"),
        "logs": $([ -d "$FULL_BACKUP_PATH/logs" ] && echo "true" || echo "false")
    },
    "total_size": "$(du -sh "$FULL_BACKUP_PATH" | cut -f1)",
    "version": "1.0"
}
EOF

    # Create human-readable summary
    cat > "$FULL_BACKUP_PATH/README.md" << EOF
# N0DE Backup - $BACKUP_NAME

**Created:** $(date)
**Hostname:** $(hostname)
**Total Size:** $(du -sh "$FULL_BACKUP_PATH" | cut -f1)

## Contents

- **database/**: PostgreSQL database dump (compressed)
- **redis/**: Redis data backup and text export  
- **config/**: All configuration files (environment, nginx, systemd)
- **ssl/**: SSL certificates and Let's Encrypt configuration
- **logs/**: Recent application logs

## Restore Instructions

### Database Restore
\`\`\`bash
# Decompress and restore database
gunzip -c database/n0de_database_$TIMESTAMP.sql.gz | psql \$DATABASE_URL
\`\`\`

### Redis Restore
\`\`\`bash
# Stop Redis, restore file, restart
sudo systemctl stop redis-server
sudo cp redis/redis_$TIMESTAMP.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo systemctl start redis-server
\`\`\`

### Configuration Restore
\`\`\`bash
# Restore environment files
cp config/.env* /home/sol/n0de-deploy/

# Restore nginx configuration
sudo cp config/nginx/n0de-* /etc/nginx/sites-available/
sudo systemctl reload nginx

# Restore systemd services
sudo cp config/systemd/n0de-* /etc/systemd/system/
sudo systemctl daemon-reload
\`\`\`

### SSL Restore
\`\`\`bash
# Restore Let's Encrypt certificates
sudo cp -r ssl/letsencrypt /etc/
sudo systemctl reload nginx
\`\`\`

## Verification

After restore, verify with:
\`\`\`bash
# Test database connection
psql \$DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Test Redis
redis-cli ping

# Test services
systemctl status n0de-backend nginx
\`\`\`
EOF

    echo -e "${GREEN}✅ Backup metadata created${NC}"
    log "Backup metadata created"
}

# Compress backup
compress_backup() {
    echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
    
    cd "$BACKUP_DIR"
    if tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME" --remove-files; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)
        echo -e "${GREEN}✅ Backup compressed: $BACKUP_NAME.tar.gz ($COMPRESSED_SIZE)${NC}"
        log "Backup compressed: $BACKUP_NAME.tar.gz ($COMPRESSED_SIZE)"
        echo "$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    else
        echo -e "${RED}❌ Backup compression failed${NC}"
        log "ERROR: Backup compression failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
    
    # Keep last 7 backups
    cd "$BACKUP_DIR"
    ls -t n0de-backup-*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
    
    REMAINING=$(ls -1 n0de-backup-*.tar.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Cleanup completed ($REMAINING backups remaining)${NC}"
    log "Cleanup completed - $REMAINING backups remaining"
}

# Verify backup integrity
verify_backup() {
    echo -e "${YELLOW}🔍 Verifying backup integrity...${NC}"
    
    if [ -f "$BACKUP_DIR/$BACKUP_NAME.tar.gz" ]; then
        if tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" > /dev/null; then
            echo -e "${GREEN}✅ Backup integrity verified${NC}"
            log "Backup integrity verified"
            return 0
        else
            echo -e "${RED}❌ Backup integrity check failed${NC}"
            log "ERROR: Backup integrity check failed"
            return 1
        fi
    else
        echo -e "${RED}❌ Backup file not found${NC}"
        log "ERROR: Backup file not found"
        return 1
    fi
}

# Main backup process
main() {
    echo -e "${BLUE}Starting comprehensive backup process...${NC}"
    log "Starting comprehensive backup: $BACKUP_NAME"
    
    # Create full backup directory
    mkdir -p "$FULL_BACKUP_PATH"
    
    # Perform all backup operations
    backup_database
    backup_redis
    backup_config
    backup_ssl
    backup_logs
    create_backup_metadata
    
    # Compress and verify
    BACKUP_FILE=$(compress_backup)
    verify_backup
    cleanup_old_backups
    
    echo ""
    echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Backup Details:${NC}"
    echo "  📁 Location: $BACKUP_FILE"
    echo "  📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo "  📅 Created: $(date)"
    echo "  🔍 Integrity: Verified"
    echo ""
    echo "To restore from this backup:"
    echo "  tar -xzf '$BACKUP_FILE'"
    echo "  cd '$BACKUP_NAME'"
    echo "  cat README.md"
    
    log "Backup completed successfully: $BACKUP_FILE"
}

# Command line interface
case "${1:-backup}" in
    "backup"|"create")
        main
        ;;
    "list")
        echo "Available backups:"
        ls -la "$BACKUP_DIR"/n0de-backup-*.tar.gz 2>/dev/null || echo "No backups found"
        ;;
    "verify")
        if [ -n "${2:-}" ]; then
            if tar -tzf "$2" > /dev/null; then
                echo "✅ Backup $2 is valid"
            else
                echo "❌ Backup $2 is corrupted"
                exit 1
            fi
        else
            echo "Usage: $0 verify <backup-file>"
        fi
        ;;
    "restore")
        echo "Restore functionality available in extracted backup directory"
        echo "Extract backup with: tar -xzf <backup-file>"
        echo "Then follow README.md instructions in extracted directory"
        ;;
    *)
        echo "N0DE Backup System"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  backup|create  - Create full system backup (default)"
        echo "  list          - List available backups"
        echo "  verify <file> - Verify backup integrity"
        echo "  restore       - Show restore instructions"
        ;;
esac