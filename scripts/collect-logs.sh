#!/bin/bash

# N0DE Platform Log Collection Script for Claude
# This script gathers logs from backend, Vercel, and local systems
# Usage: ./collect-logs.sh [service] [timeframe]

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/home/sol/n0de-deploy/logs"
SERVICE=${1:-all}
TIMEFRAME=${2:-24h}

# Create log directories
mkdir -p "$LOG_DIR"/{backend,vercel,github,local,summary}

echo "🔍 N0DE Platform Log Collection - $TIMESTAMP"
echo "📊 Service: $SERVICE | Timeframe: $TIMEFRAME"
echo "📁 Logs will be saved to: $LOG_DIR"
echo ""

# Function to collect backend logs
collect_backend_logs() {
    echo "🚂 Collecting backend logs..."
    
    # backend status
    backend status --json > "$LOG_DIR/backend/status-$TIMESTAMP.json" 2>/dev/null || echo '{"error": "Could not get backend status"}' > "$LOG_DIR/backend/status-$TIMESTAMP.json"
    
    # backend logs
    backend logs --limit 500 > "$LOG_DIR/backend/logs-$TIMESTAMP.txt" 2>/dev/null || echo "Could not get backend logs" > "$LOG_DIR/backend/logs-$TIMESTAMP.txt"
    
    # backend variables (sanitized)
    backend variables --json 2>/dev/null | jq 'del(.[] | select(.name | test("SECRET|KEY|TOKEN|PASSWORD")))' > "$LOG_DIR/backend/variables-$TIMESTAMP.json" 2>/dev/null || echo '{"error": "Could not get variables"}' > "$LOG_DIR/backend/variables-$TIMESTAMP.json"
    
    echo "✅ backend logs collected"
}

# Function to collect Vercel logs  
collect_vercel_logs() {
    echo "🌐 Collecting Vercel logs..."
    
    # Change to frontend directory
    cd frontend/n0de-website 2>/dev/null || {
        echo "❌ Could not access frontend directory"
        return 1
    }
    
    # Vercel deployments
    vercel ls --json > "../../$LOG_DIR/vercel/deployments-$TIMESTAMP.json" 2>/dev/null || echo '{"error": "Could not get Vercel deployments"}' > "../../$LOG_DIR/vercel/deployments-$TIMESTAMP.json"
    
    # Return to root directory
    cd - >/dev/null
    
    echo "✅ Vercel logs collected"
}

# Function to collect GitHub Actions logs
collect_github_logs() {
    echo "🐙 Collecting GitHub logs..."
    
    # Get recent git commits
    git log --oneline -20 --format='{"commit": "%H", "message": "%s", "author": "%an", "date": "%ad"}' --date=iso > "$LOG_DIR/github/recent-commits-$TIMESTAMP.jsonl" 2>/dev/null || echo "Could not get git log" > "$LOG_DIR/github/recent-commits-$TIMESTAMP.txt"
    
    # Git status
    git status --porcelain > "$LOG_DIR/github/git-status-$TIMESTAMP.txt" 2>/dev/null || echo "Could not get git status" > "$LOG_DIR/github/git-status-$TIMESTAMP.txt"
    
    echo "✅ GitHub logs collected"
}

# Function to collect local system logs
collect_local_logs() {
    echo "💻 Collecting local system logs..."
    
    # System health
    cat << EOF > "$LOG_DIR/local/system-info-$TIMESTAMP.json"
{
    "timestamp": "$TIMESTAMP",
    "pwd": "$(pwd)",
    "disk_usage": "$(df -h . | tail -1)",
    "memory": "$(free -h | head -2)",
    "node_version": "$(node --version 2>/dev/null || echo 'not installed')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'not installed')",
    "processes": "$(ps aux | grep -E 'node|backend|vercel' | grep -v grep || echo 'no processes found')"
}
EOF
    
    # Check service connectivity
    echo "🔗 Testing service connectivity..." > "$LOG_DIR/local/connectivity-$TIMESTAMP.txt"
    
    # Backend health
    curl -s -w "HTTP %{http_code} in %{time_total}s\n" https://api.n0de.pro/health >> "$LOG_DIR/local/connectivity-$TIMESTAMP.txt" 2>&1 || echo "Backend: Connection failed" >> "$LOG_DIR/local/connectivity-$TIMESTAMP.txt"
    
    # Frontend
    curl -s -w "HTTP %{http_code} in %{time_total}s\n" https://www.n0de.pro >> "$LOG_DIR/local/connectivity-$TIMESTAMP.txt" 2>&1 || echo "Frontend: Connection failed" >> "$LOG_DIR/local/connectivity-$TIMESTAMP.txt"
    
    echo "✅ Local logs collected"
}

# Function to create summary
create_summary() {
    echo "📋 Creating deployment summary..."
    
    # Count log files
    backend_LOGS=$(find "$LOG_DIR/backend" -name "*$TIMESTAMP*" | wc -l)
    VERCEL_LOGS=$(find "$LOG_DIR/vercel" -name "*$TIMESTAMP*" | wc -l)
    GITHUB_LOGS=$(find "$LOG_DIR/github" -name "*$TIMESTAMP*" | wc -l)
    LOCAL_LOGS=$(find "$LOG_DIR/local" -name "*$TIMESTAMP*" | wc -l)
    
    cat << EOF > "$LOG_DIR/summary/collection-summary-$TIMESTAMP.json"
{
    "timestamp": "$TIMESTAMP",
    "service_requested": "$SERVICE",
    "timeframe": "$TIMEFRAME",
    "logs_collected": {
        "backend": $backend_LOGS,
        "vercel": $VERCEL_LOGS,
        "github": $GITHUB_LOGS,
        "local": $LOCAL_LOGS,
        "total": $((backend_LOGS + VERCEL_LOGS + GITHUB_LOGS + LOCAL_LOGS))
    },
    "log_directory": "$LOG_DIR",
    "claude_access_commands": [
        "cat $LOG_DIR/summary/collection-summary-$TIMESTAMP.json",
        "ls -la $LOG_DIR/*/",
        "tail -50 $LOG_DIR/backend/logs-$TIMESTAMP.txt",
        "cat $LOG_DIR/vercel/deployments-$TIMESTAMP.json | jq .",
        "cat $LOG_DIR/local/connectivity-$TIMESTAMP.txt"
    ]
}
EOF
    
    echo "✅ Summary created: $LOG_DIR/summary/collection-summary-$TIMESTAMP.json"
}

# Main execution
case $SERVICE in
    "backend")
        collect_backend_logs
        ;;
    "vercel") 
        collect_vercel_logs
        ;;
    "github")
        collect_github_logs
        ;;
    "local")
        collect_local_logs
        ;;
    "all"|*)
        collect_backend_logs
        collect_vercel_logs  
        collect_github_logs
        collect_local_logs
        ;;
esac

create_summary

echo ""
echo "🎉 Log collection completed!"
echo "📊 Summary available at: $LOG_DIR/summary/collection-summary-$TIMESTAMP.json"
echo ""
echo "🤖 Claude can access logs with:"
echo "   cat $LOG_DIR/summary/collection-summary-$TIMESTAMP.json"
echo "   ls -la $LOG_DIR/*/"
echo ""

# Keep only last 5 log collections to prevent disk filling
find "$LOG_DIR" -name "*-????????_??????.*" | sort | head -n -15 | xargs rm -f 2>/dev/null

exit 0