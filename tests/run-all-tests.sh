#!/bin/bash

# N0DE Complete Test Suite Runner
# Runs all available test suites and generates comprehensive report

# Load error handling library
source "/home/sol/n0de-deploy/lib/error-handler.sh"
init_error_handler "$(basename "$0")"

# Configuration
TEST_DIR="/home/sol/n0de-deploy/tests"
REPORT_FILE="$TEST_DIR/complete-test-report.html"
JSON_REPORT="$TEST_DIR/complete-test-report.json"

# Test suite definitions
declare -A TEST_SUITES=(
    ["migration"]="$TEST_DIR/test-migration.sh:Migration Component Tests"
    ["integration"]="$TEST_DIR/integration-test.sh:Integration Tests"  
    ["production"]="/home/sol/n0de-deploy/scripts/production-validator.sh:Production Readiness"
)

# Results tracking
SUITE_RESULTS=()
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

run_test_suite() {
    local suite_key=$1
    local suite_info="${TEST_SUITES[$suite_key]}"
    IFS=':' read -r suite_script suite_name <<< "$suite_info"
    
    ((TOTAL_SUITES++))
    
    echo -e "${PURPLE}📋 Running: $suite_name${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
    
    local start_time=$(date +%s)
    local temp_log
    temp_log=$(create_temp_file "test-suite-$suite_key")
    
    if [ -f "$suite_script" ] && [ -x "$suite_script" ]; then
        if timeout 600 "$suite_script" > "$temp_log" 2>&1; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            echo -e "${GREEN}✅ PASSED: $suite_name (${duration}s)${NC}"
            log_success "Test suite passed: $suite_name"
            
            SUITE_RESULTS+=("$suite_key:PASS:$duration:$suite_name")
            ((PASSED_SUITES++))
        else
            local exit_code=$?
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            echo -e "${RED}❌ FAILED: $suite_name (exit code: $exit_code, ${duration}s)${NC}"
            log_error "Test suite failed: $suite_name"
            
            # Show last few lines of output for debugging
            echo -e "${YELLOW}Last 10 lines of output:${NC}"
            tail -10 "$temp_log"
            
            SUITE_RESULTS+=("$suite_key:FAIL:$duration:$suite_name:$exit_code")
            ((FAILED_SUITES++))
        fi
    else
        echo -e "${RED}❌ FAILED: $suite_name (script not found or not executable)${NC}"
        log_error "Test suite script not found: $suite_script"
        
        SUITE_RESULTS+=("$suite_key:FAIL:0:$suite_name:Script not found")
        ((FAILED_SUITES++))
    fi
    
    echo ""
}

generate_json_report() {
    log_info "Generating JSON test report"
    
    local json_data="{"
    json_data+="\"timestamp\":\"$(date -Iseconds)\","
    json_data+="\"hostname\":\"$(hostname)\","
    json_data+="\"total_suites\":$TOTAL_SUITES,"
    json_data+="\"passed_suites\":$PASSED_SUITES,"
    json_data+="\"failed_suites\":$FAILED_SUITES,"
    json_data+="\"success_rate\":$((PASSED_SUITES * 100 / TOTAL_SUITES)),"
    json_data+="\"suites\":["
    
    local first=true
    for result in "${SUITE_RESULTS[@]}"; do
        IFS=':' read -r suite_key status duration name error <<< "$result"
        
        if [ "$first" = "true" ]; then
            first=false
        else
            json_data+=","
        fi
        
        json_data+="{\"suite\":\"$suite_key\",\"name\":\"$name\",\"status\":\"$status\",\"duration\":$duration"
        if [ -n "$error" ]; then
            json_data+=",\"error\":\"$error\""
        fi
        json_data+="}"
    done
    
    json_data+="]}"
    
    echo "$json_data" > "$JSON_REPORT"
    log_success "JSON report generated: $JSON_REPORT"
}

generate_html_report() {
    log_info "Generating HTML test report"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>N0DE Migration Test Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin: 0; }
        .header .subtitle { color: #666; margin: 10px 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .summary-card.success { border-left-color: #28a745; }
        .summary-card.danger { border-left-color: #dc3545; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 2em; color: #333; }
        .summary-card p { margin: 0; color: #666; }
        .test-suites { margin: 30px 0; }
        .suite { margin: 20px 0; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; }
        .suite.passed { background: #d4edda; border-color: #c3e6cb; }
        .suite.failed { background: #f8d7da; border-color: #f5c6cb; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .suite-title { font-weight: bold; font-size: 1.1em; }
        .suite-status { padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; }
        .suite-status.passed { background: #28a745; }
        .suite-status.failed { background: #dc3545; }
        .suite-details { color: #666; font-size: 0.9em; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 N0DE Migration Test Report</h1>
            <div class="subtitle">Generated on $(date) | Host: $(hostname)</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>$TOTAL_SUITES</h3>
                <p>Total Test Suites</p>
            </div>
            <div class="summary-card success">
                <h3>$PASSED_SUITES</h3>
                <p>Passed Suites</p>
            </div>
            <div class="summary-card danger">
                <h3>$FAILED_SUITES</h3>
                <p>Failed Suites</p>
            </div>
            <div class="summary-card">
                <h3>$((PASSED_SUITES * 100 / TOTAL_SUITES))%</h3>
                <p>Success Rate</p>
            </div>
        </div>
        
        <div class="test-suites">
            <h2>Test Suite Results</h2>
EOF

    # Add individual suite results
    for result in "${SUITE_RESULTS[@]}"; do
        IFS=':' read -r suite_key status duration name error <<< "$result"
        
        local suite_class="passed"
        local status_class="passed"
        local status_text="PASSED"
        
        if [ "$status" = "FAIL" ]; then
            suite_class="failed"
            status_class="failed"
            status_text="FAILED"
        fi
        
        cat >> "$REPORT_FILE" << EOF
            <div class="suite $suite_class">
                <div class="suite-header">
                    <div class="suite-title">$name</div>
                    <div class="suite-status $status_class">$status_text</div>
                </div>
                <div class="suite-details">
                    Duration: ${duration}s | Suite: $suite_key
EOF

        if [ -n "$error" ]; then
            echo "                    | Error: $error" >> "$REPORT_FILE"
        fi
        
        cat >> "$REPORT_FILE" << EOF
                </div>
            </div>
EOF
    done
    
    cat >> "$REPORT_FILE" << EOF
        </div>
        
        <div class="footer">
            <p>N0DE Migration Testing Framework | Generated by run-all-tests.sh</p>
            <p>For detailed logs, check individual test suite outputs</p>
        </div>
    </div>
</body>
</html>
EOF

    log_success "HTML report generated: $REPORT_FILE"
}

show_summary() {
    echo ""
    echo -e "${PURPLE}📊 Complete Test Suite Results${NC}"
    echo -e "${PURPLE}===============================${NC}"
    echo ""
    echo -e "${BLUE}Total Suites: $TOTAL_SUITES${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_SUITES${NC}"
    echo -e "${RED}❌ Failed: $FAILED_SUITES${NC}"
    echo -e "${BLUE}📈 Success Rate: $((PASSED_SUITES * 100 / TOTAL_SUITES))%${NC}"
    echo ""
    
    if [ $FAILED_SUITES -eq 0 ]; then
        echo -e "${GREEN}🎉 All test suites passed!${NC}"
        echo -e "${GREEN}The N0DE migration system is fully validated and ready for production.${NC}"
    else
        echo -e "${RED}⚠️  $FAILED_SUITES test suite(s) failed.${NC}"
        echo -e "${RED}Review failed tests and address issues before migration.${NC}"
    fi
    
    echo ""
    echo "Reports generated:"
    echo "  📄 HTML Report: $REPORT_FILE"
    echo "  📋 JSON Report: $JSON_REPORT"
    echo ""
    echo "View HTML report: open $REPORT_FILE (or use web browser)"
}

main() {
    echo -e "${PURPLE}🧪 N0DE Complete Test Suite Runner${NC}"
    echo -e "${PURPLE}===================================${NC}"
    echo ""
    
    log_info "Starting complete test suite execution"
    
    # Ensure test directory exists
    require_directory "$TEST_DIR" true
    
    # Run all test suites
    for suite_key in "${!TEST_SUITES[@]}"; do
        run_test_suite "$suite_key"
    done
    
    # Generate reports
    generate_json_report
    generate_html_report
    
    # Show summary
    show_summary
    
    # Return appropriate exit code
    [ $FAILED_SUITES -eq 0 ] || return 1
}

# Command line interface
case "${1:-run}" in
    "run"|"test")
        main
        ;;
    "report")
        if [ -f "$JSON_REPORT" ] && command -v jq >/dev/null 2>&1; then
            jq . "$JSON_REPORT"
        elif [ -f "$JSON_REPORT" ]; then
            cat "$JSON_REPORT"
        else
            echo "No test report found. Run tests first."
        fi
        ;;
    "html")
        if [ -f "$REPORT_FILE" ]; then
            echo "HTML report: $REPORT_FILE"
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "$REPORT_FILE"
            elif command -v open >/dev/null 2>&1; then
                open "$REPORT_FILE"
            else
                echo "Open the file in a web browser to view the report"
            fi
        else
            echo "No HTML report found. Run tests first."
        fi
        ;;
    *)
        echo "N0DE Complete Test Suite Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  run     - Run all test suites (default)"
        echo "  report  - Show JSON test report"
        echo "  html    - Open HTML test report"
        ;;
esac