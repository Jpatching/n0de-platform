#!/bin/bash
# Post-commit hook: Auto-deploy to production

current_branch=$(git branch --show-current)

if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
    echo "🚀 Deploying to production..."
    
    # Deploy frontend
    cd /home/sol/n0de-deploy/frontend
    vercel --prod
    
    # Restart backend
    pm2 restart n0de-backend
    
    echo "✅ Production deployment completed"
fi
