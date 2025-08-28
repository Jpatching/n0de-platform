# N0DE Platform

A comprehensive Node.js-based platform providing backend services, web interface, and verification tools.

## Components

### 🚀 n0de-backend
A NestJS-based backend service with the following features:
- **Authentication & Authorization**: JWT and local strategy authentication
- **API Management**: API key management and rate limiting
- **Health Monitoring**: Health checks and metrics collection
- **WebSocket Support**: Real-time communication capabilities
- **Database Integration**: Prisma ORM with PostgreSQL
- **Redis Integration**: Caching and session management
- **RPC Services**: Remote procedure call endpoints
- **Support System**: Customer support and ticketing
- **Usage Analytics**: API usage tracking and analytics

### 🌐 n0de-website
A modern Next.js web application featuring:
- **Modern UI/UX**: Glassmorphism design with interactive elements
- **Performance Optimization**: Client-side optimizations and lazy loading
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Components**: Performance charts, forms, and animations
- **Developer Experience**: API playground and documentation
- **Enterprise Features**: Pricing, support, and competitive analysis

### 🔍 verifier
A TypeScript-based verification tool for:
- **Data Validation**: Input verification and sanitization
- **Security Checks**: Authentication and authorization validation
- **API Verification**: Endpoint testing and validation

## Tech Stack

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL, Redis
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Authentication**: JWT, Passport.js
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Deployment**: Railway (backend), Vercel (frontend)

## Getting Started

### Backend Setup
```bash
cd n0de-backend
npm install
cp env.example .env
# Configure your environment variables
npm run start:dev
```

### Frontend Setup
```bash
cd n0de-website
npm install
npm run dev
```

### Verifier Setup
```bash
cd verifier
npm install
npm run build
```

## Environment Variables

Create `.env` files in each component directory based on the provided `env.example` files.

## Contributing

This is a private repository. Please contact the maintainers for access and contribution guidelines.

## License

Private - All rights reserved. 