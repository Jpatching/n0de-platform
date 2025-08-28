# N0DE Platform - Claude Code Instructions

## Project Overview
- Website: https://www.n0de.pro
- Backend API: https://n0de-backend-production.up.railway.app
- Frontend: Next.js application in `/frontend/n0de-website/`
- Backend: NestJS application in `/src/`

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use async/await instead of promises
- Implement proper error handling
- Add TypeScript types for all functions

### File Organization
- Frontend code goes in `/frontend/n0de-website/`
- Backend code goes in `/src/`
- Database schemas in `/prisma/`
- Configuration files in project root

### Testing
- Write tests for new features
- Run tests before committing
- Ensure all tests pass

### Deployment
- Frontend: Deploy to Vercel using `vercel --prod`
- Backend: Deploy to Railway using `railway up`
- Always test locally before deploying

### Security
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper authentication checks

### Important Commands
```bash
# Backend
npm run start:dev       # Start development server
npm run build          # Build for production
npx prisma db push     # Update database schema

# Frontend (from n0de-website directory)
npm run dev            # Start development server
npm run build          # Build for production
vercel --prod          # Deploy to production
```

## Current Architecture
- Authentication: JWT with Google/GitHub OAuth
- Database: PostgreSQL (production) / SQLite (development)
- Payments: Stripe integration
- Hosting: Vercel (frontend) + Railway (backend)