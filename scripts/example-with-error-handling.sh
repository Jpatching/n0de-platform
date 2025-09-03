#!/bin/bash

# Example N0DE Script with Enhanced Error Handling
# Template for other scripts to follow

# Load error handling library
source "/home/sol/n0de-deploy/lib/error-handler.sh"

# Initialize error handler for this script
init_error_handler "$(basename "$0")"

# Script configuration
SCRIPT_NAME="Example Script"
REQUIRED_COMMANDS=("curl" "jq" "systemctl")
REQUIRED_FILES=("/etc/passwd")  # Example required file
WORK_DIR="/home/sol/n0de-deploy"

main() {
    log_info "Starting $SCRIPT_NAME"
    
    # Validate prerequisites
    log_info "Validating prerequisites..."
    
    # Check required commands
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        require_command "$cmd" || return 1
    done
    
    # Check required files
    for file in "${REQUIRED_FILES[@]}"; do
        require_file "$file" || return 1
    done
    
    # Check required directory
    require_directory "$WORK_DIR" false "Working directory" || return 1
    
    # Example: Safe command execution with retry
    safe_execute "curl -s https://api.github.com" "GitHub API test" 3 2 10
    
    # Example: Service management
    safe_systemctl "status" "nginx" "nginx web server"
    
    # Example: Test connectivity
    check_connectivity "8.8.8.8" "53" 5 || log_warning "DNS connectivity issue"
    
    # Example: HTTP endpoint test
    test_http_endpoint "http://localhost/health" 200 5 "Health endpoint"
    
    # Example: Progress tracking
    for i in {1..5}; do
        show_progress $i 5 "Processing items"
        sleep 1
    done
    
    # Example: User confirmation
    if confirm_action "Proceed with next step?" "y" 10; then
        log_info "User confirmed proceeding"
    else
        log_info "User cancelled operation"
        return 0
    fi
    
    # Example: Temporary file handling
    local temp_file
    temp_file=$(create_temp_file "example" ".tmp")
    echo "test content" > "$temp_file"
    log_debug "Created temporary file: $temp_file"
    
    log_success "$SCRIPT_NAME completed successfully"
}

# Example usage with custom error handling
custom_operation() {
    log_info "Performing custom operation"
    
    # This will be caught by error handler if it fails
    some_command_that_might_fail || {
        log_error "Custom operation failed"
        return 1
    }
    
    log_success "Custom operation completed"
}

# Run main function
main "$@"