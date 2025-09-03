#!/bin/bash
# N0DE Intrusion Detection and Response System

# Install Fail2Ban for automated response
sudo apt update
sudo apt install -y fail2ban

# Configure Fail2Ban for N0DE
sudo tee /etc/fail2ban/jail.local << 'FAIL2BAN_EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = auto

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
action = iptables-multiport[name=NoAuthFailures, port="80,443"]
logpath = /var/log/nginx/error.log
bantime = 600
maxretry = 3

[nginx-badbots]
enabled = true
port = http,https
filter = apache-badbots
logpath = /var/log/nginx/access.log
bantime = 86400
maxretry = 1

[nginx-dos]
enabled = true
filter = nginx-dos
action = iptables-multiport[name=NoScript, port="80,443"]
logpath = /var/log/nginx/access.log
maxretry = 300
findtime = 300
bantime = 600
FAIL2BAN_EOF

# Create custom filters
sudo tee /etc/fail2ban/filter.d/nginx-dos.conf << 'FILTER_EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST).*HTTP.*" 200
ignoreregex =
FILTER_EOF

# Start and enable Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "✅ Intrusion detection system configured"
