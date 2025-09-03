#!/usr/bin/env python3

"""
N0DE Environment Analysis Script
Comprehensive analysis of environment variables and platform data integrity
"""

import json
import subprocess
import requests
import re
from datetime import datetime
from typing import Dict, List, Tuple, Any

class N0DEEnvironmentAnalyzer:
    def __init__(self):
        self.backend_vars = {}
        self.issues = []
        self.recommendations = []
        self.critical_issues = []
        
    def get_backend_variables(self) -> Dict[str, str]:
        """Fetch Backend environment variables via MCP"""
        try:
            result = subprocess.run(
                ['backend', 'variables', '--json'],
                capture_output=True, text=True, check=True
            )
            return json.loads(result.stdout)
        except Exception as e:
            print(f"❌ Failed to fetch Backend variables: {e}")
            return {}
    
    def validate_variable_patterns(self) -> None:
        """Validate environment variables against expected patterns"""
        
        patterns = {
            # Core variables
            'NODE_ENV': r'^(production|development|staging)$',
            'PORT': r'^\d+$',
            'DATABASE_URL': r'^postgresql://.*',
            'REDIS_URL': r'^redis://.*',
            
            # URLs
            'FRONTEND_URL': r'^https://.*\.n0de\.pro$',
            'BASE_URL': r'^https://.*\.backend\.app$',
            'SERVER_URL': r'^https://.*\.backend\.app$',
            
            # JWT & Auth
            'JWT_SECRET': r'^.{20,}$',
            'JWT_EXPIRES_IN': r'^\d+[hmd]$',
            'JWT_REFRESH_SECRET': r'^.{20,}$',
            'SESSION_SECRET': r'^.{20,}$',
            
            # OAuth
            'GOOGLE_CLIENT_ID': r'^\d+-.*\.apps\.googleusercontent\.com$',
            'GOOGLE_CLIENT_SECRET': r'^GOCSPX-.*',
            'GITHUB_CLIENT_ID': r'^Ov[0-9A-Za-z]+$',
            'GITHUB_CLIENT_SECRET': r'^[0-9a-f]{40}$',
            
            # Payment providers
            'STRIPE_SECRET_KEY': r'^sk_(live|test)_[0-9A-Za-z]+$',
            'STRIPE_WEBHOOK_SECRET': r'^whsec_.*',
            'COINBASE_COMMERCE_API_KEY': r'^[0-9a-f-]{36}$',
            'NOWPAYMENTS_API_KEY': r'^[A-Z0-9-]+$',
            
            # Security
            'RATE_LIMIT_MAX': r'^\d+$',
            'RATE_LIMIT_TTL': r'^\d+$',
        }
        
        for var_name, pattern in patterns.items():
            value = self.backend_vars.get(var_name, '')
            
            if not value:
                self.critical_issues.append(f"Missing critical variable: {var_name}")
            elif not re.match(pattern, value):
                self.issues.append(f"Invalid format for {var_name}: {value[:20]}...")
            
    def check_oauth_configuration(self) -> None:
        """Validate OAuth configuration consistency"""
        
        # Check redirect URI consistency
        google_redirect = self.backend_vars.get('GOOGLE_OAUTH_REDIRECT_URI', '')
        github_redirect = self.backend_vars.get('GITHUB_OAUTH_REDIRECT_URI', '')
        base_url = self.backend_vars.get('BASE_URL', '')
        
        expected_google = f"{base_url}/api/v1/auth/google/callback"
        expected_github = f"{base_url}/api/v1/auth/github/callback"
        
        if google_redirect != expected_google:
            self.issues.append(f"Google OAuth redirect mismatch. Expected: {expected_google}, Got: {google_redirect}")
            
        if github_redirect != expected_github:
            self.issues.append(f"GitHub OAuth redirect mismatch. Expected: {expected_github}, Got: {github_redirect}")
    
    def check_cors_configuration(self) -> None:
        """Validate CORS configuration"""
        
        cors_origins = self.backend_vars.get('CORS_ORIGINS', '')
        frontend_url = self.backend_vars.get('FRONTEND_URL', '')
        
        if frontend_url not in cors_origins:
            self.critical_issues.append(f"Frontend URL not in CORS origins: {frontend_url}")
            
        # Check for common CORS issues
        if 'localhost' in cors_origins:
            self.recommendations.append("Remove localhost from CORS origins in production")
    
    def test_service_connectivity(self) -> None:
        """Test actual service endpoints"""
        
        base_url = self.backend_vars.get('BASE_URL', '')
        if not base_url:
            return
            
        endpoints_to_test = [
            ('/health', 'Health check'),
            ('/api/v1/auth/google', 'Google OAuth'),
            ('/api/v1/auth/github', 'GitHub OAuth'),
        ]
        
        for endpoint, description in endpoints_to_test:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=10, allow_redirects=False)
                
                if endpoint == '/health':
                    if response.status_code == 200:
                        health_data = response.json()
                        print(f"✅ {description}: OK (Environment: {health_data.get('environment', 'unknown')})")
                    else:
                        self.critical_issues.append(f"Health check failed: HTTP {response.status_code}")
                        
                elif 'auth' in endpoint:
                    if response.status_code == 302:
                        print(f"✅ {description}: Redirecting correctly")
                    else:
                        self.issues.append(f"{description} not redirecting properly: HTTP {response.status_code}")
                        
            except Exception as e:
                self.critical_issues.append(f"Failed to test {description}: {str(e)}")
    
    def check_stripe_configuration(self) -> None:
        """Validate Stripe configuration"""
        
        stripe_key = self.backend_vars.get('STRIPE_SECRET_KEY', '')
        stripe_webhook = self.backend_vars.get('STRIPE_WEBHOOK_SECRET', '')
        
        # Check if using test vs live keys
        if stripe_key.startswith('sk_test_'):
            self.recommendations.append("Using Stripe test keys - ensure this is intentional for production")
        elif stripe_key.startswith('sk_live_'):
            print("✅ Using Stripe live keys")
        else:
            self.critical_issues.append("Invalid Stripe secret key format")
            
        # Check webhook secret
        if 'test_your_webhook_secret_here' in stripe_webhook or '1234567890' in stripe_webhook:
            self.critical_issues.append("Stripe webhook secret appears to be placeholder")
    
    def analyze_security_posture(self) -> None:
        """Analyze overall security configuration"""
        
        security_checks = [
            ('JWT_SECRET', 'JWT signing secret'),
            ('JWT_REFRESH_SECRET', 'JWT refresh secret'),  
            ('SESSION_SECRET', 'Session secret'),
            ('GOOGLE_CLIENT_SECRET', 'Google OAuth secret'),
            ('GITHUB_CLIENT_SECRET', 'GitHub OAuth secret'),
        ]
        
        for var_name, description in security_checks:
            value = self.backend_vars.get(var_name, '')
            
            if len(value) < 32:
                self.issues.append(f"{description} may be too short (security risk)")
                
            if 'test' in value.lower() or 'placeholder' in value.lower():
                self.critical_issues.append(f"{description} appears to be placeholder")
    
    def check_payment_provider_integration(self) -> None:
        """Validate payment provider configurations"""
        
        providers = {
            'Stripe': ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
            'Coinbase': ['COINBASE_COMMERCE_API_KEY', 'COINBASE_COMMERCE_WEBHOOK_SECRET'],
            'NOWPayments': ['NOWPAYMENTS_API_KEY', 'NOWPAYMENTS_IPN_SECRET']
        }
        
        for provider, required_vars in providers.items():
            missing_vars = [var for var in required_vars if not self.backend_vars.get(var)]
            
            if missing_vars:
                self.issues.append(f"{provider} incomplete: missing {', '.join(missing_vars)}")
            else:
                print(f"✅ {provider}: All required variables present")
    
    def generate_action_plan(self) -> List[str]:
        """Generate prioritized action plan"""
        
        actions = []
        
        if self.critical_issues:
            actions.append("🚨 IMMEDIATE ACTION REQUIRED:")
            actions.extend([f"   • {issue}" for issue in self.critical_issues])
            actions.append("")
            
        if self.issues:
            actions.append("⚠️ ISSUES TO ADDRESS:")
            actions.extend([f"   • {issue}" for issue in self.issues])
            actions.append("")
            
        if self.recommendations:
            actions.append("💡 RECOMMENDATIONS:")
            actions.extend([f"   • {rec}" for rec in self.recommendations])
            
        return actions
    
    def run_comprehensive_analysis(self) -> None:
        """Run complete environment analysis"""
        
        print("🔍 N0DE COMPREHENSIVE ENVIRONMENT ANALYSIS")
        print("=" * 50)
        print(f"Analysis Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Fetch variables
        print("📋 Fetching Backend environment variables...")
        self.backend_vars = self.get_backend_variables()
        
        if not self.backend_vars:
            print("❌ Could not fetch Backend variables. Analysis aborted.")
            return
            
        print(f"✅ Retrieved {len(self.backend_vars)} variables")
        print()
        
        # Run all checks
        print("🔍 Running validation checks...")
        self.validate_variable_patterns()
        self.check_oauth_configuration()
        self.check_cors_configuration()
        self.check_stripe_configuration()
        self.analyze_security_posture()
        self.check_payment_provider_integration()
        
        print()
        print("🌐 Testing service connectivity...")
        self.test_service_connectivity()
        
        print()
        print("📊 ANALYSIS RESULTS")
        print("=" * 30)
        
        total_issues = len(self.critical_issues) + len(self.issues)
        
        if total_issues == 0:
            print("🎉 EXCELLENT: No issues detected!")
            print("✅ Environment is properly configured for production")
        else:
            print(f"Found {len(self.critical_issues)} critical issues and {len(self.issues)} warnings")
            
        print()
        print("🎯 ACTION PLAN")
        print("=" * 20)
        
        action_plan = self.generate_action_plan()
        for action in action_plan:
            print(action)
            
        # Return appropriate exit code
        if self.critical_issues:
            exit(2)  # Critical issues
        elif self.issues:
            exit(1)  # Warnings
        else:
            exit(0)  # All good

if __name__ == "__main__":
    analyzer = N0DEEnvironmentAnalyzer()
    analyzer.run_comprehensive_analysis()