# N0DE Platform Project Structure

## Overview
This is the consolidated N0DE platform project with both frontend and backend components.

## Directory Structure

```
/root/n0de-deploy/
├── frontend/              # Frontend application (Next.js)
│   └── n0de-website/     # Main website deployed to Vercel
├── src/                  # Backend NestJS application (deployed to Railway)
│   ├── auth/            # Authentication module
│   ├── payments/        # Payment processing (Stripe)
│   ├── users/          # User management
│   └── main.ts         # Application entry point
├── prisma/              # Database schemas
├── dist/                # Backend build output
├── backend-archive/     # Archived/old backend files
└── .config/            # Configuration files

## Deployments

### Frontend (Vercel)
- Website: https://www.n0de.pro
- Directory: `/frontend/n0de-website/`
- Framework: Next.js
- Deploy: `vercel --prod` (from n0de-website directory)

### Backend (Railway)
- API: https://n0de-backend-production.up.railway.app
- Directory: `/src/` (NestJS backend)
- Framework: NestJS
- Deploy: `railway up` (from project root)

## Environment Variables

### Backend (.env)
- Database URLs (PostgreSQL, SQLite)
- Auth providers (Google, GitHub)
- Stripe API keys
- JWT secrets

### Frontend (.env.local in n0de-website)
- API endpoints
- Public keys
- Analytics IDs

## Development

### Backend
```bash
npm run start:dev     # Development server
npm run build        # Build for production
npm run start:prod   # Production server
```

### Frontend
```bash
cd frontend/n0de-website
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Production server
```

## Testing
```bash
npm test            # Run tests
npm run test:e2e    # End-to-end tests
```

## Database
```bash
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema to database
npx prisma studio       # Open Prisma Studio
```

## Key Files
- `/package.json` - Backend dependencies and scripts
- `/frontend/n0de-website/package.json` - Frontend dependencies
- `/prisma/schema.prisma` - Database schema
- `/railway.json` - Railway deployment config
- `/vercel.json` - Vercel deployment config (in frontend)