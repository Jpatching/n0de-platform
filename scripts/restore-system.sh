#!/bin/bash

# N0DE System Restore Script
# Restores from compressed backup files

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🔄 N0DE System Restore${NC}"
echo -e "${PURPLE}=====================${NC}"

# Validate input
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file.tar.gz> [options]"
    echo ""
    echo "Options:"
    echo "  --database-only    Restore only database"
    echo "  --config-only      Restore only configuration"
    echo "  --redis-only       Restore only Redis data"
    echo "  --ssl-only         Restore only SSL certificates"
    echo "  --dry-run          Show what would be restored without doing it"
    echo "  --force            Skip safety checks"
    echo ""
    echo "Available backups:"
    ls -la /home/sol/n0de-deploy/backups/n0de-backup-*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"
shift

# Parse options
DATABASE_ONLY=false
CONFIG_ONLY=false
REDIS_ONLY=false
SSL_ONLY=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --database-only) DATABASE_ONLY=true ;;
        --config-only) CONFIG_ONLY=true ;;
        --redis-only) REDIS_ONLY=true ;;
        --ssl-only) SSL_ONLY=true ;;
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Verify backup integrity
echo -e "${YELLOW}🔍 Verifying backup integrity...${NC}"
if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backup file is corrupted or invalid${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backup integrity verified${NC}"

# Extract backup to temporary directory
TEMP_DIR=$(mktemp -d)
BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)

echo -e "${YELLOW}📁 Extracting backup to temporary directory...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_PATH="$TEMP_DIR/$BACKUP_NAME"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Extracted backup directory not found${NC}"
    exit 1
fi

# Load backup metadata
BACKUP_INFO="$BACKUP_PATH/backup-info.json"
if [ -f "$BACKUP_INFO" ] && command -v jq >/dev/null 2>&1; then
    BACKUP_TIMESTAMP=$(jq -r '.timestamp' "$BACKUP_INFO")
    BACKUP_HOSTNAME=$(jq -r '.hostname' "$BACKUP_INFO")
    echo -e "${BLUE}📋 Backup Info: Created $BACKUP_TIMESTAMP on $BACKUP_HOSTNAME${NC}"
fi

# Safety checks
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}⚠️  This will overwrite current system data!${NC}"
    echo "Backup file: $BACKUP_FILE"
    echo "Components to restore:"
    
    if [ "$DATABASE_ONLY" = true ]; then
        echo "  - Database only"
    elif [ "$CONFIG_ONLY" = true ]; then
        echo "  - Configuration only"
    elif [ "$REDIS_ONLY" = true ]; then
        echo "  - Redis only"
    elif [ "$SSL_ONLY" = true ]; then
        echo "  - SSL certificates only"
    else
        echo "  - All components (database, redis, config, ssl, logs)"
    fi
    
    echo ""
    read -p "Continue with restore? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled"
        rm -rf "$TEMP_DIR"
        exit 0
    fi
fi

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a /home/sol/n0de-deploy/restore.log
}

# Create pre-restore backup
create_pre_restore_backup() {
    echo -e "${YELLOW}💾 Creating pre-restore backup...${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        PRE_RESTORE_BACKUP="/home/sol/n0de-deploy/backups/pre-restore-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        /home/sol/n0de-deploy/scripts/backup-system.sh > /dev/null
        log "Pre-restore backup created"
        echo -e "${GREEN}✅ Pre-restore backup created${NC}"
    else
        echo -e "${BLUE}[DRY RUN] Would create pre-restore backup${NC}"
    fi
}

# Restore database
restore_database() {
    echo -e "${YELLOW}📊 Restoring PostgreSQL database...${NC}"
    
    if [ -f "/home/sol/n0de-deploy/.env.database" ]; then
        source /home/sol/n0de-deploy/.env.database
        
        DB_BACKUP=$(find "$BACKUP_PATH/database" -name "*.sql.gz" | head -1)
        if [ -n "$DB_BACKUP" ] && [ -f "$DB_BACKUP" ]; then
            if [ "$DRY_RUN" = false ]; then
                # Stop backend service to prevent conflicts
                sudo systemctl stop n0de-backend 2>/dev/null || true
                
                # Restore database
                echo -e "${YELLOW}Dropping and recreating database...${NC}"
                DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
                DB_USER=$(echo "$DATABASE_URL" | sed 's/.*:\/\/\([^:]*\):.*/\1/')
                
                # Drop and recreate database
                sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
                sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
                
                # Restore data
                echo -e "${YELLOW}Restoring database data...${NC}"
                gunzip -c "$DB_BACKUP" | psql "$DATABASE_URL"
                
                echo -e "${GREEN}✅ Database restored successfully${NC}"
                log "Database restored from $DB_BACKUP"
            else
                echo -e "${BLUE}[DRY RUN] Would restore database from $DB_BACKUP${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  No database backup found in restore archive${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Database configuration not found${NC}"
    fi
}

# Restore Redis
restore_redis() {
    echo -e "${YELLOW}🔴 Restoring Redis data...${NC}"
    
    REDIS_BACKUP=$(find "$BACKUP_PATH/redis" -name "*.rdb" | head -1)
    if [ -n "$REDIS_BACKUP" ] && [ -f "$REDIS_BACKUP" ]; then
        if [ "$DRY_RUN" = false ]; then
            # Stop Redis
            sudo systemctl stop redis-server
            
            # Backup current Redis data
            if [ -f "/var/lib/redis/dump.rdb" ]; then
                sudo mv /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.pre-restore
            fi
            
            # Restore Redis data
            sudo cp "$REDIS_BACKUP" /var/lib/redis/dump.rdb
            sudo chown redis:redis /var/lib/redis/dump.rdb
            
            # Start Redis
            sudo systemctl start redis-server
            
            echo -e "${GREEN}✅ Redis data restored successfully${NC}"
            log "Redis restored from $REDIS_BACKUP"
        else
            echo -e "${BLUE}[DRY RUN] Would restore Redis from $REDIS_BACKUP${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No Redis backup found in restore archive${NC}"
    fi
}

# Restore configuration
restore_config() {
    echo -e "${YELLOW}⚙️  Restoring configuration files...${NC}"
    
    if [ -d "$BACKUP_PATH/config" ]; then
        if [ "$DRY_RUN" = false ]; then
            # Environment files
            if [ -d "$BACKUP_PATH/config" ]; then
                cp "$BACKUP_PATH/config"/.env* /home/sol/n0de-deploy/ 2>/dev/null || true
                echo "Environment files restored"
            fi
            
            # Nginx configuration
            if [ -d "$BACKUP_PATH/config/nginx" ]; then
                sudo cp "$BACKUP_PATH/config/nginx"/n0de-* /etc/nginx/sites-available/ 2>/dev/null || true
                sudo systemctl reload nginx 2>/dev/null || true
                echo "Nginx configuration restored"
            fi
            
            # Systemd services
            if [ -d "$BACKUP_PATH/config/systemd" ]; then
                sudo cp "$BACKUP_PATH/config/systemd"/n0de-* /etc/systemd/system/ 2>/dev/null || true
                sudo systemctl daemon-reload
                echo "Systemd services restored"
            fi
            
            # Application configuration
            if [ -f "$BACKUP_PATH/config/package.json" ]; then
                cp "$BACKUP_PATH/config/package.json" /home/sol/n0de-deploy/ 2>/dev/null || true
            fi
            
            if [ -f "$BACKUP_PATH/config/prisma/schema.prisma" ]; then
                mkdir -p /home/sol/n0de-deploy/prisma
                cp "$BACKUP_PATH/config/schema.prisma" /home/sol/n0de-deploy/prisma/ 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✅ Configuration restored successfully${NC}"
            log "Configuration restored"
        else
            echo -e "${BLUE}[DRY RUN] Would restore configuration files${NC}"
            find "$BACKUP_PATH/config" -type f | head -10
        fi
    else
        echo -e "${YELLOW}⚠️  No configuration backup found in restore archive${NC}"
    fi
}

# Restore SSL certificates
restore_ssl() {
    echo -e "${YELLOW}🔒 Restoring SSL certificates...${NC}"
    
    if [ -d "$BACKUP_PATH/ssl/letsencrypt" ]; then
        if [ "$DRY_RUN" = false ]; then
            # Backup current certificates
            if [ -d "/etc/letsencrypt" ]; then
                sudo mv /etc/letsencrypt /etc/letsencrypt.pre-restore
            fi
            
            # Restore certificates
            sudo cp -r "$BACKUP_PATH/ssl/letsencrypt" /etc/
            sudo systemctl reload nginx 2>/dev/null || true
            
            echo -e "${GREEN}✅ SSL certificates restored successfully${NC}"
            log "SSL certificates restored"
        else
            echo -e "${BLUE}[DRY RUN] Would restore SSL certificates${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No SSL backup found in restore archive${NC}"
    fi
}

# Verify restore
verify_restore() {
    echo -e "${YELLOW}🔍 Verifying restore...${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        ISSUES=0
        
        # Test database connection
        if [ -f "/home/sol/n0de-deploy/.env.database" ]; then
            source /home/sol/n0de-deploy/.env.database
            if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
                echo "✅ Database connection verified"
            else
                echo "❌ Database connection failed"
                ((ISSUES++))
            fi
        fi
        
        # Test Redis
        if redis-cli ping | grep -q "PONG"; then
            echo "✅ Redis connection verified"
        else
            echo "❌ Redis connection failed"
            ((ISSUES++))
        fi
        
        # Test nginx configuration
        if sudo nginx -t > /dev/null 2>&1; then
            echo "✅ Nginx configuration is valid"
        else
            echo "❌ Nginx configuration is invalid"
            ((ISSUES++))
        fi
        
        if [ $ISSUES -eq 0 ]; then
            echo -e "${GREEN}✅ All verification checks passed${NC}"
            log "Restore verification passed"
        else
            echo -e "${RED}❌ $ISSUES verification checks failed${NC}"
            log "Restore verification failed with $ISSUES issues"
        fi
    else
        echo -e "${BLUE}[DRY RUN] Would verify restore integrity${NC}"
    fi
}

# Start services
start_services() {
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        sudo systemctl start n0de-backend 2>/dev/null || true
        sudo systemctl start n0de-monitor 2>/dev/null || true
        
        sleep 3
        
        if sudo systemctl is-active --quiet n0de-backend; then
            echo "✅ n0de-backend service started"
        else
            echo "❌ n0de-backend service failed to start"
        fi
        
        echo -e "${GREEN}✅ Services started${NC}"
        log "Services started after restore"
    else
        echo -e "${BLUE}[DRY RUN] Would start services${NC}"
    fi
}

# Main restore process
main() {
    echo -e "${BLUE}Starting restore process...${NC}"
    log "Starting restore from $BACKUP_FILE"
    
    if [ "$FORCE" = false ]; then
        create_pre_restore_backup
    fi
    
    # Perform selected restore operations
    if [ "$DATABASE_ONLY" = true ]; then
        restore_database
    elif [ "$CONFIG_ONLY" = true ]; then
        restore_config
    elif [ "$REDIS_ONLY" = true ]; then
        restore_redis
    elif [ "$SSL_ONLY" = true ]; then
        restore_ssl
    else
        # Full restore
        restore_database
        restore_redis
        restore_config
        restore_ssl
    fi
    
    verify_restore
    
    if [ "$DATABASE_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$SSL_ONLY" = false ]; then
        start_services
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    echo ""
    echo -e "${GREEN}🎉 Restore completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test application functionality"
    echo "  2. Check service status: systemctl status n0de-backend"
    echo "  3. Monitor logs: journalctl -u n0de-backend -f"
    echo "  4. Run health checks: /home/sol/n0de-deploy/scripts/service-manager.sh health"
    
    log "Restore completed successfully"
}

# Run main function
main