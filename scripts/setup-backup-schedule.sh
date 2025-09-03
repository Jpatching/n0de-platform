#!/bin/bash

# N0DE Automated Backup Schedule Setup
# Configures automated backups with cron

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⏰ Setting up automated backup schedule...${NC}"

# Configuration
BACKUP_SCRIPT="/home/sol/n0de-deploy/scripts/backup-system.sh"
LOG_FILE="/var/log/n0de/backup-schedule.log"

# Ensure log directory exists
sudo mkdir -p /var/log/n0de
sudo chown sol:sol /var/log/n0de

# Create backup scheduling wrapper
cat > /home/sol/n0de-deploy/scripts/automated-backup.sh << 'EOF'
#!/bin/bash

# Automated Backup Wrapper with Logging
# Called by cron to perform regular backups

LOG_FILE="/var/log/n0de/backup-schedule.log"
BACKUP_SCRIPT="/home/sol/n0de-deploy/scripts/backup-system.sh"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Ensure we're in the right directory
cd /home/sol/n0de-deploy

log "Starting automated backup"

# Run backup with timeout to prevent hanging
if timeout 3600 "$BACKUP_SCRIPT" >> "$LOG_FILE" 2>&1; then
    log "Automated backup completed successfully"
    
    # Send success notification if configured
    if [ -f "/home/sol/n0de-deploy/monitoring/monitor.conf" ]; then
        source /home/sol/n0de-deploy/monitoring/monitor.conf 2>/dev/null || true
        if [[ "${ALERT_METHODS:-}" == *"email"* ]] && [ -n "${ALERT_EMAIL:-}" ]; then
            echo "N0DE automated backup completed successfully at $(date)" | \
                mail -s "N0DE Backup Success" "$ALERT_EMAIL" 2>/dev/null || true
        fi
    fi
else
    EXIT_CODE=$?
    log "Automated backup failed with exit code $EXIT_CODE"
    
    # Send failure notification
    if [ -f "/home/sol/n0de-deploy/monitoring/monitor.conf" ]; then
        source /home/sol/n0de-deploy/monitoring/monitor.conf 2>/dev/null || true
        if [[ "${ALERT_METHODS:-}" == *"email"* ]] && [ -n "${ALERT_EMAIL:-}" ]; then
            echo "N0DE automated backup FAILED at $(date) with exit code $EXIT_CODE

Check logs: $LOG_FILE
Run manual backup: $BACKUP_SCRIPT" | \
                mail -s "N0DE Backup FAILED" "$ALERT_EMAIL" 2>/dev/null || true
        fi
    fi
fi

# Rotate log if it gets too large (>10MB)
if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt 10485760 ]; then
    mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d_%H%M%S)"
    gzip "$LOG_FILE.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi

log "Automated backup process finished"
EOF

chmod +x /home/sol/n0de-deploy/scripts/automated-backup.sh

echo -e "${GREEN}✅ Automated backup wrapper created${NC}"

# Ask user for backup schedule preference
echo ""
echo "Select backup schedule:"
echo "1) Daily at 2:00 AM (recommended)"  
echo "2) Twice daily (2:00 AM and 2:00 PM)"
echo "3) Weekly on Sunday at 1:00 AM"
echo "4) Custom schedule"
echo "5) Skip automated backups"
echo ""
read -p "Choose option (1-5): " schedule_choice

case $schedule_choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        SCHEDULE_DESC="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 2,14 * * *"  
        SCHEDULE_DESC="Twice daily at 2:00 AM and 2:00 PM"
        ;;
    3)
        CRON_SCHEDULE="0 1 * * 0"
        SCHEDULE_DESC="Weekly on Sunday at 1:00 AM"
        ;;
    4)
        echo ""
        echo "Enter custom cron schedule (format: minute hour day month weekday)"
        echo "Examples:"
        echo "  '0 3 * * *' = Daily at 3:00 AM"
        echo "  '30 1 * * 1' = Weekly on Monday at 1:30 AM"
        echo "  '0 */6 * * *' = Every 6 hours"
        read -p "Custom schedule: " CRON_SCHEDULE
        SCHEDULE_DESC="Custom: $CRON_SCHEDULE"
        ;;
    5)
        echo -e "${YELLOW}⏭️  Skipping automated backup setup${NC}"
        echo "You can run manual backups with: $BACKUP_SCRIPT"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Using daily backup as default.${NC}"
        CRON_SCHEDULE="0 2 * * *"
        SCHEDULE_DESC="Daily at 2:00 AM (default)"
        ;;
esac

# Install cron job
echo -e "${YELLOW}📅 Installing cron job...${NC}"

# Remove any existing backup cron jobs
crontab -l 2>/dev/null | grep -v "n0de.*backup" | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE /home/sol/n0de-deploy/scripts/automated-backup.sh") | crontab -

echo -e "${GREEN}✅ Automated backup schedule installed${NC}"

# Create backup monitoring script
cat > /home/sol/n0de-deploy/scripts/backup-status.sh << 'EOF'
#!/bin/bash

# N0DE Backup Status Checker
# Shows backup history and status

LOG_FILE="/var/log/n0de/backup-schedule.log"
BACKUP_DIR="/home/sol/n0de-deploy/backups"

echo "N0DE Backup Status"
echo "=================="
echo ""

# Show cron schedule
echo "📅 Backup Schedule:"
crontab -l 2>/dev/null | grep "backup" | while read line; do
    echo "  $line"
done
echo ""

# Show recent backups
echo "💾 Available Backups:"
if ls -la "$BACKUP_DIR"/n0de-backup-*.tar.gz 2>/dev/null; then
    echo ""
    echo "Total backup space used: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "N/A")"
else
    echo "  No backups found"
fi
echo ""

# Show recent backup log entries
echo "📝 Recent Backup Activity:"
if [ -f "$LOG_FILE" ]; then
    tail -20 "$LOG_FILE" | grep -E "(Starting|completed|failed)" | tail -10
else
    echo "  No backup logs found"
fi
echo ""

# Check last backup status
echo "🔍 Last Backup Status:"
if [ -f "$LOG_FILE" ]; then
    LAST_BACKUP=$(grep "Starting automated backup" "$LOG_FILE" | tail -1)
    LAST_SUCCESS=$(grep "completed successfully" "$LOG_FILE" | tail -1)
    LAST_FAILURE=$(grep "backup failed" "$LOG_FILE" | tail -1)
    
    if [ -n "$LAST_BACKUP" ]; then
        echo "  Last backup started: $(echo "$LAST_BACKUP" | cut -d' ' -f1-2)"
        
        if [ -n "$LAST_SUCCESS" ]; then
            echo "  Last successful backup: $(echo "$LAST_SUCCESS" | cut -d' ' -f1-2)"
        fi
        
        if [ -n "$LAST_FAILURE" ]; then
            echo "  Last failed backup: $(echo "$LAST_FAILURE" | cut -d' ' -f1-2)"
        fi
    else
        echo "  No automated backups recorded yet"
    fi
else
    echo "  No backup log available"
fi

echo ""
echo "Commands:"
echo "  Manual backup: /home/sol/n0de-deploy/scripts/backup-system.sh"
echo "  View logs: tail -f $LOG_FILE"
echo "  Edit schedule: crontab -e"
EOF

chmod +x /home/sol/n0de-deploy/scripts/backup-status.sh

# Test cron service
echo -e "${YELLOW}🧪 Testing cron service...${NC}"
if systemctl is-active --quiet cron; then
    echo -e "${GREEN}✅ Cron service is active${NC}"
else
    echo -e "${YELLOW}⚠️  Starting cron service...${NC}"
    sudo systemctl start cron
    sudo systemctl enable cron
fi

# Create backup notification test
echo -e "${YELLOW}📧 Testing backup notification (if configured)...${NC}"
if [ -f "/home/sol/n0de-deploy/monitoring/monitor.conf" ]; then
    source /home/sol/n0de-deploy/monitoring/monitor.conf 2>/dev/null || true
    if [[ "${ALERT_METHODS:-}" == *"email"* ]] && [ -n "${ALERT_EMAIL:-}" ]; then
        echo "Test backup notification from N0DE system on $(hostname)" | \
            mail -s "N0DE Backup Test" "$ALERT_EMAIL" 2>/dev/null && \
            echo -e "${GREEN}✅ Test notification sent to $ALERT_EMAIL${NC}" || \
            echo -e "${YELLOW}⚠️  Failed to send test notification${NC}"
    else
        echo -e "${BLUE}ℹ️  Email notifications not configured${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  Monitoring configuration not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Backup schedule setup completed!${NC}"
echo ""
echo -e "${BLUE}Backup Configuration:${NC}"
echo "  📅 Schedule: $SCHEDULE_DESC"
echo "  🗂️  Backup directory: $BACKUP_DIR"
echo "  📝 Log file: $LOG_FILE"
echo "  🔧 Backup script: $BACKUP_SCRIPT"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo "  📊 Check status: /home/sol/n0de-deploy/scripts/backup-status.sh"
echo "  📝 View logs: tail -f $LOG_FILE"
echo "  ⚙️  Edit schedule: crontab -e"
echo "  🔧 Manual backup: $BACKUP_SCRIPT"
echo ""
echo -e "${YELLOW}Next scheduled backup will run: $SCHEDULE_DESC${NC}"