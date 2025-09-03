#!/bin/bash
# N0DE Military-Grade Firewall Configuration

echo "🔥 Configuring UFW firewall..."

# Reset UFW to defaults
sudo ufw --force reset

# Default policies (DENY ALL incoming)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Essential services only
sudo ufw allow 22/tcp     # SSH (will restrict to specific IPs later)
sudo ufw allow 80/tcp     # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp    # HTTPS only

# Rate limiting for SSH (prevent brute force)
sudo ufw limit 22/tcp

# Advanced rules for specific protection
sudo ufw deny 3000/tcp    # Block direct backend access
sudo ufw deny 5432/tcp    # Block direct PostgreSQL access
sudo ufw deny 6379/tcp    # Block direct Redis access
sudo ufw deny 8899/tcp    # Block direct Solana RPC access

# Enable firewall
sudo ufw --force enable

# Show status
sudo ufw status verbose

echo "✅ Firewall configured with military-grade security"
