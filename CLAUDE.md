# N0DE Platform - Project Configuration

## Deployment Architecture
- **Frontend**: Self-hosted Next.js on port 3000 (NOT Vercel)
- **Backend**: Self-hosted NestJS API 
- **Database**: PostgreSQL + Redis on this server
- **Web Server**: Nginx reverse proxy
- **Domain**: www.n0de.pro

## Key Project Details
- **Repository**: https://github.com/Jpatching/n0de-platform
- **Working Directory**: /home/sol/n0de-deploy/
- **Frontend Package Name**: "n0de-website" (not "frontend")
- **Backend Package Name**: "n0de-backend"

## ChatGPT Background Integration ✅
- **Images**: `ChatGPT Image Aug 7, 2025, 12_12_38 AM.png` (main)
- **Component**: InteractiveBackground.tsx with motion animations
- **Status**: Fully integrated and working

## Current Status ✅
- **Styling**: Complete restoration successful
- **Build**: Clean (36 static pages)
- **Authentication**: Working (GitHub/Google OAuth)
- **Database**: Connected and functional
- **SSL**: Configured and working

## Development Commands
```bash
# Frontend (Next.js)
cd /home/sol/n0de-deploy/frontend
npm start                 # Port 3000

# Backend (NestJS)
cd /home/sol/n0de-deploy
npm run start:prod       # API server
```

## Server Credentials
- **Password**: Aguero07! (for sudo operations)
- **Architecture**: Bare metal Linux server
- **No Railway dependency**: Fully independent deployment