#!/bin/bash

echo "WSL Railway Deployment Helper"
echo "============================"

# Create a deployment directory in native Linux filesystem
DEPLOY_DIR="$HOME/railway-deploy/backend"
echo "Creating deployment directory in native Linux filesystem: $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy only necessary files (excluding node_modules)
echo "Copying project files (excluding node_modules)..."
rsync -av --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.log' \
  --exclude '.env' \
  --exclude 'coverage' \
  --exclude '.nyc_output' \
  --exclude '.vscode' \
  --exclude '.idea' \
  --exclude '*.swp' \
  --exclude '*.swo' \
  --exclude 'logs' \
  --exclude '*.mp4' \
  --exclude '*.mov' \
  --exclude '*.avi' \
  ./ "$DEPLOY_DIR/"

# Change to deployment directory
cd "$DEPLOY_DIR"

# Run Railway deployment from native Linux filesystem
echo "Running Railway deployment from native filesystem..."
railway up

echo "Deployment complete!"