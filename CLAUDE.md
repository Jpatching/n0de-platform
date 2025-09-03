# N0DE Platform - Project Configuration

## Deployment Architecture
- **Frontend**: Vercel deployment at www.n0de.pro
- **Backend**: Self-hosted NestJS API at api.n0de.pro 
- **Database**: PostgreSQL + Redis on bare metal server
- **Web Server**: Nginx reverse proxy for API
- **Main Domain**: n0de.pro (frontend: www.n0de.pro, API: api.n0de.pro)

## Key Project Details
- **Repository**: https://github.com/Jpatching/n0de-platform
- **Working Directory**: /home/sol/n0de-deploy/
- **Frontend Package Name**: "n0de-website" (not "frontend")
- **Backend Package Name**: "n0de-backend"
- **No Railway**: Complete Railway independence achieved - fully self-hosted backend

## Environment Configuration
- **Production Config**: `.env` (main environment file)
- **Backend URL**: https://api.n0de.pro
- **Frontend URL**: https://www.n0de.pro  
- **API Endpoints**: https://api.n0de.pro/api/v1
- **Database**: PostgreSQL on localhost:5432/n0de_production
- **Cache**: Redis on localhost:6379

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
- **No backend dependency**: Fully independent deployment