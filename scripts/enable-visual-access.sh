#!/bin/bash

# N0DE Visual Access Enabler
# Run this script to enable firewall with visual access ports

echo "🔥 N0DE Visual Access Setup"
echo "=========================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo: sudo ./enable-visual-access.sh"
    exit 1
fi

echo "🔧 Configuring UFW firewall..."

# Reset UFW to clean state
ufw --force reset

# Set secure defaults
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
echo "Allowing SSH (port 22)..."
ufw allow ssh

echo "Allowing N0DE Backend (port 3001)..."
ufw allow 3001/tcp

echo "Allowing N0DE Frontend (port 3000)..."
ufw allow 3000/tcp

echo "Allowing HTTP (port 80)..."
ufw allow 80/tcp

echo "Allowing HTTPS (port 443)..."
ufw allow 443/tcp

# Enable firewall
echo "Enabling UFW firewall..."
ufw --force enable

# Show status
echo ""
echo "✅ Firewall Status:"
ufw status

echo ""
echo "🌐 Visual Access URLs:"
echo "======================"
echo "• API Documentation: http://212.108.83.175:3001/docs"
echo "• Health Dashboard:  http://212.108.83.175:3001/health"
echo "• Frontend App:      http://212.108.83.175:3000"
echo ""
echo "✅ Firewall configured for visual access!"