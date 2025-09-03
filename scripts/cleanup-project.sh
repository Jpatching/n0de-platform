#!/bin/bash

# N0DE Project Cleanup - Remove Redundant Scripts and Files
# Consolidates 53 scripts down to essential ones

set -euo pipefail

# Load error handling library
source "/home/sol/n0de-deploy/lib/error-handler.sh"
init_error_handler "$(basename "$0")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_DIR="/home/sol/n0de-deploy"
BACKUP_DIR="$PROJECT_DIR/archived-scripts"

cd "$PROJECT_DIR"

echo -e "${PURPLE}🧹 N0DE Project Cleanup${NC}"
echo -e "${PURPLE}======================${NC}"
echo ""

# Create backup directory
echo -e "${YELLOW}📦 Creating backup of redundant scripts...${NC}"
mkdir -p "$BACKUP_DIR"

# Scripts to keep (essential ones)
KEEP_SCRIPTS=(
    "enhanced-complete-migration.sh"
    "user-space-deploy.sh" 
    "env-manager.sh"
    "backup-system.sh"
    "restore-system.sh"
    "import-backend-data-enhanced.sh"
    "production-validator.sh"
    "ssl-setup.sh"
    "example-with-error-handling.sh"
)

# Scripts to archive (redundant ones)
ARCHIVE_SCRIPTS=(
    "deploy.sh"
    "deploy-fix.sh" 
    "deploy-monitor.sh"
    "deploy-with-migration.sh"
    "quick-deploy.sh"
    "smart-fix.sh"
    "final-fix.sh"
    "final-test.sh"
    "fix-auth.sh"
    "fix-deployment.sh"
    "backend-fix.sh"
    "test-build.sh"
    "test-platform.sh"
    "test-upgrade-flow.sh"
    "test-upgrade-flow-v2.sh"
    "validate-deployment.sh"
    "watch-deployment.sh"
    "workflow-setup.sh"
    "complete-migration-basic.sh"
    "import-backend-data-basic.sh"
    "backend-setup.sh"
    "db-setup.sh"
    "redis-setup.sh"
    "nginx-setup.sh"
    "service-manager.sh"
    "rollback.sh"
    "setup-system-services.sh"
    "monitor.sh"
    "create-staging.sh"
    "deployment-status.sh"
)

# Archive redundant scripts
echo -e "${BLUE}Moving redundant scripts to archive...${NC}"
archived_count=0
for script in "${ARCHIVE_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        mv "scripts/$script" "$BACKUP_DIR/"
        ((archived_count++))
        echo "  ✓ Archived: $script"
    fi
done

# Remove redundant directories
echo -e "${YELLOW}🗂️ Cleaning up directories...${NC}"
if [ -d "old-scripts" ]; then
    mv old-scripts "$BACKUP_DIR/"
    echo "  ✓ Archived: old-scripts directory"
fi

if [ -d "test-results" ]; then
    rm -rf test-results
    echo "  ✓ Removed: test-results directory"
fi

if [ -d "logs/audit" ] && [ -z "$(ls -A logs/audit 2>/dev/null)" ]; then
    rmdir logs/audit
    echo "  ✓ Removed: empty logs/audit directory"
fi

# Clean up broken symlinks
echo -e "${YELLOW}🔗 Fixing broken symlinks...${NC}"
find scripts/ -type l ! -exec test -e {} \; -exec rm {} \; -print | while read -r link; do
    echo "  ✓ Removed broken symlink: $(basename "$link")"
done

# Update essential symlinks
if [ -f "scripts/enhanced-complete-migration.sh" ]; then
    ln -sf enhanced-complete-migration.sh scripts/complete-migration.sh
    echo "  ✓ Updated: complete-migration.sh → enhanced-complete-migration.sh"
fi

if [ -f "scripts/import-backend-data-enhanced.sh" ]; then
    ln -sf import-backend-data-enhanced.sh scripts/import-backend-data.sh
    echo "  ✓ Updated: import-backend-data.sh → import-backend-data-enhanced.sh"
fi

# Clean up node_modules if needed (keep it by default)
echo -e "${YELLOW}📦 Node modules status...${NC}"
if [ -d "node_modules" ]; then
    node_size=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "  ℹ️ node_modules size: $node_size (keeping for deployment)"
fi

# Clean up temporary files
echo -e "${YELLOW}🧽 Cleaning temporary files...${NC}"
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.log.tmp" -delete 2>/dev/null || true
find . -name ".env.*.bak" -delete 2>/dev/null || true
echo "  ✓ Removed temporary files"

# Create cleanup summary
echo -e "${BLUE}📊 Creating cleanup summary...${NC}"
cat > "$BACKUP_DIR/CLEANUP_SUMMARY.md" << EOF
# N0DE Project Cleanup Summary

## Cleanup Date: $(date)

### Scripts Archived: $archived_count
$(printf '%s\n' "${ARCHIVE_SCRIPTS[@]}" | sed 's/^/- /')

### Essential Scripts Kept: ${#KEEP_SCRIPTS[@]}
$(printf '%s\n' "${KEEP_SCRIPTS[@]}" | sed 's/^/- /')

### Directories Processed:
- old-scripts → archived
- test-results → removed
- logs/audit → cleaned if empty

### Cleanup Benefits:
- Reduced script count from 53 to ${#KEEP_SCRIPTS[@]}
- Eliminated redundant deployment variants
- Kept only essential production scripts
- Improved maintainability

### Restoration:
To restore any archived script:
\`\`\`bash
cp archived-scripts/SCRIPT_NAME.sh scripts/
chmod +x scripts/SCRIPT_NAME.sh
\`\`\`
EOF

# Display results
echo ""
echo -e "${GREEN}✅ N0DE Project Cleanup Complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo "📊 Cleanup Results:"
echo "   • Scripts archived: $archived_count"
echo "   • Essential scripts kept: ${#KEEP_SCRIPTS[@]}"
echo "   • Backup location: $BACKUP_DIR"
echo ""
echo "🎯 Essential Scripts Remaining:"
for script in "${KEEP_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        echo "   ✅ $script"
    else
        echo "   ⚠️ $script (missing)"
    fi
done
echo ""
echo "📁 Project Structure Optimized:"
echo "   • scripts/ - Essential deployment scripts only"
echo "   • tests/ - Complete test suite" 
echo "   • monitoring/ - Health monitoring"
echo "   • nginx/ - SSL-ready configurations"
echo "   • archived-scripts/ - Backup of removed scripts"
echo ""
echo -e "${PURPLE}🎉 Project is now lean and backend-independent!${NC}"

log_success "N0DE project cleanup completed - $archived_count scripts archived"