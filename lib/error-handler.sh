#!/bin/bash

# N0DE Error Handling Library
# Common error handling functions for all scripts

# Global error handling configuration
declare -g ERROR_HANDLER_LOG="/home/sol/n0de-deploy/error-handler.log"
declare -g ERROR_HANDLER_DEBUG="${DEBUG:-false}"
declare -g ERROR_HANDLER_SILENT="${SILENT:-false}"

# Colors (global)
declare -g RED='\033[0;31m'
declare -g GREEN='\033[0;32m'
declare -g YELLOW='\033[1;33m'
declare -g BLUE='\033[0;34m'
declare -g PURPLE='\033[0;35m'
declare -g NC='\033[0m'

# Initialize error handler
init_error_handler() {
    local script_name="${1:-$(basename "$0")}"
    
    # Create lib directory if it doesn't exist
    mkdir -p "$(dirname "$ERROR_HANDLER_LOG")"
    
    # Set up trap for clean exit
    trap 'error_exit $? $LINENO' ERR
    trap 'cleanup_on_exit $?' EXIT
    
    # Log script start
    log_info "Script started: $script_name (PID: $$)"
    
    # Enable strict mode
    set -euo pipefail
    
    if [ "$ERROR_HANDLER_DEBUG" = "true" ]; then
        set -x
        log_debug "Debug mode enabled for $script_name"
    fi
}

# Logging functions with levels
log_debug() {
    [ "$ERROR_HANDLER_DEBUG" = "true" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') [DEBUG] [$(basename "$0")] $1" | tee -a "$ERROR_HANDLER_LOG" >&2
}

log_info() {
    if [ "$ERROR_HANDLER_SILENT" != "true" ]; then
        echo -e "${BLUE}$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1${NC}" | tee -a "$ERROR_HANDLER_LOG"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] [$(basename "$0")] $1" >> "$ERROR_HANDLER_LOG"
    fi
}

log_success() {
    if [ "$ERROR_HANDLER_SILENT" != "true" ]; then
        echo -e "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1${NC}" | tee -a "$ERROR_HANDLER_LOG"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] [$(basename "$0")] $1" >> "$ERROR_HANDLER_LOG"
    fi
}

log_warning() {
    if [ "$ERROR_HANDLER_SILENT" != "true" ]; then
        echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1${NC}" | tee -a "$ERROR_HANDLER_LOG" >&2
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] [$(basename "$0")] $1" >> "$ERROR_HANDLER_LOG"
    fi
}

log_error() {
    echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') [ERROR] [$(basename "$0")] $1${NC}" | tee -a "$ERROR_HANDLER_LOG" >&2
}

log_critical() {
    echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') [CRITICAL] [$(basename "$0")] $1${NC}" | tee -a "$ERROR_HANDLER_LOG" >&2
    # Send critical errors to syslog as well
    logger -p user.crit "N0DE-$(basename "$0"): $1"
}

# Error exit handler
error_exit() {
    local exit_code=${1:-1}
    local line_number=${2:-"unknown"}
    local script_name=$(basename "$0")
    
    log_critical "Script failed with exit code $exit_code at line $line_number"
    
    # Capture environment information
    {
        echo "=== Error Context ==="
        echo "Script: $script_name"
        echo "Exit Code: $exit_code"
        echo "Line: $line_number"
        echo "User: $(whoami)"
        echo "Working Directory: $(pwd)"
        echo "Timestamp: $(date -Iseconds)"
        echo "Process ID: $$"
        echo "Parent Process ID: $PPID"
        
        echo ""
        echo "=== System Information ==="
        echo "Hostname: $(hostname)"
        echo "OS: $(uname -a)"
        echo "Memory: $(free -h | head -2)"
        echo "Disk: $(df -h / | tail -1)"
        
        echo ""
        echo "=== Recent Commands ==="
        history | tail -5 2>/dev/null || echo "Command history not available"
        
    } >> "$ERROR_HANDLER_LOG"
    
    # Clean up temporary files
    cleanup_temp_files
    
    # Show user-friendly error message
    echo ""
    echo -e "${RED}💥 An error occurred in $script_name${NC}"
    echo -e "${YELLOW}Error details logged to: $ERROR_HANDLER_LOG${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check the error log: tail -20 $ERROR_HANDLER_LOG"
    echo "  2. Enable debug mode: DEBUG=true $script_name"
    echo "  3. Check system resources: df -h && free -h"
    echo "  4. Verify service status: systemctl status"
    
    # Exit with original error code
    exit "$exit_code"
}

# Cleanup function
cleanup_on_exit() {
    local exit_code=${1:-0}
    
    if [ $exit_code -eq 0 ]; then
        log_info "Script completed successfully"
    fi
    
    cleanup_temp_files
}

# Cleanup temporary files
cleanup_temp_files() {
    # Clean up any temp files created by the script
    if [ -n "${TEMP_FILES:-}" ]; then
        for temp_file in $TEMP_FILES; do
            if [ -f "$temp_file" ]; then
                rm -f "$temp_file"
                log_debug "Cleaned up temp file: $temp_file"
            fi
        done
    fi
    
    # Clean up any temp directories
    if [ -n "${TEMP_DIRS:-}" ]; then
        for temp_dir in $TEMP_DIRS; do
            if [ -d "$temp_dir" ]; then
                rm -rf "$temp_dir"
                log_debug "Cleaned up temp directory: $temp_dir"
            fi
        done
    fi
}

# Register temp file for cleanup
register_temp_file() {
    local temp_file=$1
    TEMP_FILES="${TEMP_FILES:-} $temp_file"
}

register_temp_dir() {
    local temp_dir=$1
    TEMP_DIRS="${TEMP_DIRS:-} $temp_dir"
}

# Safe command execution with retry
safe_execute() {
    local command="$1"
    local description="${2:-$command}"
    local max_retries="${3:-1}"
    local delay="${4:-1}"
    local timeout="${5:-0}"
    
    local attempt=1
    while [ $attempt -le $max_retries ]; do
        log_info "Executing: $description (attempt $attempt/$max_retries)"
        
        if [ $attempt -gt 1 ]; then
            log_warning "Retrying: $description"
            sleep $delay
        fi
        
        # Execute with timeout if specified
        if [ $timeout -gt 0 ]; then
            if timeout $timeout bash -c "$command"; then
                log_success "$description completed"
                return 0
            fi
        else
            if bash -c "$command"; then
                log_success "$description completed"
                return 0
            fi
        fi
        
        local exit_code=$?
        log_warning "$description failed (exit code: $exit_code)"
        
        if [ $attempt -eq $max_retries ]; then
            log_error "$description failed after $max_retries attempts"
            return $exit_code
        fi
        
        ((attempt++))
    done
}

# Validate command exists
require_command() {
    local command=$1
    local package=${2:-$command}
    
    if ! command -v "$command" >/dev/null 2>&1; then
        log_critical "Required command '$command' not found"
        echo -e "${RED}❌ Missing required command: $command${NC}"
        echo "Install with: sudo apt install $package"
        return 1
    fi
    
    log_debug "Command available: $command"
    return 0
}

# Validate file exists and is readable
require_file() {
    local file_path=$1
    local description="${2:-$file_path}"
    
    if [ ! -f "$file_path" ]; then
        log_error "Required file not found: $description ($file_path)"
        return 1
    fi
    
    if [ ! -r "$file_path" ]; then
        log_error "Cannot read required file: $description ($file_path)"
        return 1
    fi
    
    log_debug "File available: $file_path"
    return 0
}

# Validate directory exists and is writable
require_directory() {
    local dir_path=$1
    local create_if_missing="${2:-false}"
    local description="${3:-$dir_path}"
    
    if [ ! -d "$dir_path" ]; then
        if [ "$create_if_missing" = "true" ]; then
            log_info "Creating directory: $description"
            mkdir -p "$dir_path" || {
                log_error "Failed to create directory: $description ($dir_path)"
                return 1
            }
        else
            log_error "Required directory not found: $description ($dir_path)"
            return 1
        fi
    fi
    
    if [ ! -w "$dir_path" ]; then
        log_error "Cannot write to directory: $description ($dir_path)"
        return 1
    fi
    
    log_debug "Directory available: $dir_path"
    return 0
}

# Service management with error handling
safe_systemctl() {
    local action=$1
    local service=$2
    local description="${3:-$service service}"
    local max_wait="${4:-30}"
    
    log_info "$action $description"
    
    case $action in
        "start")
            if systemctl is-active --quiet "$service"; then
                log_info "$description is already running"
                return 0
            fi
            
            systemctl start "$service" || {
                log_error "Failed to start $description"
                return 1
            }
            
            # Wait for service to become active
            local wait_time=0
            while [ $wait_time -lt $max_wait ]; do
                if systemctl is-active --quiet "$service"; then
                    log_success "$description started successfully"
                    return 0
                fi
                sleep 1
                ((wait_time++))
            done
            
            log_error "$description failed to start within ${max_wait}s"
            return 1
            ;;
            
        "stop")
            if ! systemctl is-active --quiet "$service"; then
                log_info "$description is already stopped"
                return 0
            fi
            
            systemctl stop "$service" || {
                log_error "Failed to stop $description"
                return 1
            }
            
            log_success "$description stopped successfully"
            ;;
            
        "restart")
            systemctl restart "$service" || {
                log_error "Failed to restart $description"
                return 1
            }
            
            # Wait for service to become active
            local wait_time=0
            while [ $wait_time -lt $max_wait ]; do
                if systemctl is-active --quiet "$service"; then
                    log_success "$description restarted successfully"
                    return 0
                fi
                sleep 1
                ((wait_time++))
            done
            
            log_error "$description failed to restart within ${max_wait}s"
            return 1
            ;;
            
        *)
            log_error "Unknown systemctl action: $action"
            return 1
            ;;
    esac
}

# Network connectivity check
check_connectivity() {
    local host=${1:-"8.8.8.8"}
    local port=${2:-"53"}
    local timeout=${3:-5}
    
    if timeout $timeout bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        log_debug "Network connectivity OK ($host:$port)"
        return 0
    else
        log_warning "Network connectivity failed ($host:$port)"
        return 1
    fi
}

# Port availability check
check_port_available() {
    local port=$1
    local host="${2:-localhost}"
    
    if ss -tlnp | grep -q ":$port "; then
        log_debug "Port $port is in use"
        return 1
    else
        log_debug "Port $port is available"
        return 0
    fi
}

# Wait for port to be available
wait_for_port() {
    local host=$1
    local port=$2
    local max_wait=${3:-30}
    local description="${4:-$host:$port}"
    
    log_info "Waiting for $description to be available"
    
    local wait_time=0
    while [ $wait_time -lt $max_wait ]; do
        if timeout 1 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            log_success "$description is available"
            return 0
        fi
        sleep 1
        ((wait_time++))
    done
    
    log_error "$description not available after ${max_wait}s"
    return 1
}

# Database connection test
test_database_connection() {
    local db_url=$1
    local description="${2:-database}"
    
    if psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "$description connection successful"
        return 0
    else
        log_error "$description connection failed"
        return 1
    fi
}

# Redis connection test
test_redis_connection() {
    local host=${1:-localhost}
    local port=${2:-6379}
    local description="${3:-Redis}"
    
    if redis-cli -h "$host" -p "$port" ping | grep -q "PONG"; then
        log_success "$description connection successful"
        return 0
    else
        log_error "$description connection failed"
        return 1
    fi
}

# HTTP endpoint test
test_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-10}
    local description="${4:-$url}"
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" || echo "000")
    
    if [ "$response_code" = "$expected_status" ]; then
        log_success "$description responding (HTTP $response_code)"
        return 0
    else
        log_error "$description not responding (HTTP $response_code, expected $expected_status)"
        return 1
    fi
}

# Progress tracking
show_progress() {
    local current=$1
    local total=$2
    local description="${3:-Progress}"
    local width=${4:-50}
    
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))
    
    local progress_bar
    progress_bar=$(printf "%-${width}s" "$(printf '#%.0s' $(seq 1 $filled))")
    progress_bar="${progress_bar// /-}"
    
    echo -ne "\r${BLUE}$description: [$progress_bar] $percentage% ($current/$total)${NC}"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Confirmation prompt with timeout
confirm_action() {
    local message=$1
    local default="${2:-n}"
    local timeout="${3:-0}"
    
    local prompt
    if [ "$default" = "y" ]; then
        prompt="$message (Y/n): "
    else
        prompt="$message (y/N): "
    fi
    
    if [ $timeout -gt 0 ]; then
        log_info "$message (timeout: ${timeout}s)"
        if timeout $timeout bash -c "read -p '$prompt' -n 1 -r REPLY; echo \$REPLY" 2>/dev/null; then
            local reply=$?
        else
            log_info "Timeout reached, using default: $default"
            local reply=$default
        fi
    else
        read -p "$prompt" -n 1 -r
        local reply=$REPLY
        echo
    fi
    
    case $reply in
        [Yy]) return 0 ;;
        [Nn]) return 1 ;;
        "") [ "$default" = "y" ] && return 0 || return 1 ;;
        *) return 1 ;;
    esac
}

# Create secure temporary file
create_temp_file() {
    local prefix="${1:-tmp}"
    local suffix="${2:-}"
    
    local temp_file
    temp_file=$(mktemp "/tmp/${prefix}.XXXXXX${suffix}")
    chmod 600 "$temp_file"
    
    register_temp_file "$temp_file"
    echo "$temp_file"
}

# Create secure temporary directory
create_temp_dir() {
    local prefix="${1:-tmpdir}"
    
    local temp_dir
    temp_dir=$(mktemp -d "/tmp/${prefix}.XXXXXX")
    chmod 700 "$temp_dir"
    
    register_temp_dir "$temp_dir"
    echo "$temp_dir"
}

# Validate environment variable
require_env_var() {
    local var_name=$1
    local description="${2:-$var_name}"
    
    if [ -z "${!var_name:-}" ]; then
        log_error "Required environment variable not set: $description ($var_name)"
        return 1
    fi
    
    log_debug "Environment variable set: $var_name"
    return 0
}

# Load environment file safely
load_env_file() {
    local env_file=$1
    local required="${2:-true}"
    
    if [ ! -f "$env_file" ]; then
        if [ "$required" = "true" ]; then
            log_error "Required environment file not found: $env_file"
            return 1
        else
            log_warning "Optional environment file not found: $env_file"
            return 0
        fi
    fi
    
    # Source the file in a subshell to avoid polluting current environment
    set -a
    source "$env_file"
    set +a
    
    log_info "Loaded environment file: $env_file"
    return 0
}

# Export error handling functions for use in other scripts
export -f init_error_handler log_debug log_info log_success log_warning log_error log_critical
export -f error_exit cleanup_on_exit cleanup_temp_files register_temp_file register_temp_dir
export -f safe_execute require_command require_file require_directory
export -f safe_systemctl check_connectivity wait_for_port
export -f test_database_connection test_redis_connection test_http_endpoint
export -f show_progress confirm_action create_temp_file create_temp_dir
export -f require_env_var load_env_file