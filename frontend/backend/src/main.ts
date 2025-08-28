import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
const cookieParser = require('cookie-parser');

// Ensure crypto is available globally for dependencies that might need it
if (typeof globalThis.crypto === 'undefined') {
  try {
    const nodeCrypto = require('crypto');
    // For Node.js 16+ with webcrypto support
    if (nodeCrypto.webcrypto) {
      globalThis.crypto = nodeCrypto.webcrypto;
    } else {
      // Fallback for older Node.js versions
      (globalThis as any).crypto = {
        getRandomValues: (arr: any) => {
          const bytes = nodeCrypto.randomBytes(arr.length);
          arr.set(bytes);
          return arr;
        },
        subtle: {} as any // Minimal polyfill
      };
    }
  } catch (error) {
    console.warn('Failed to setup crypto polyfill:', error);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // 🚀 PERFORMANCE: Enable compression for all responses
    app.use(compression({
      level: 6, // Good balance between compression and CPU usage
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        // Don't compress WebSocket upgrades
        if (req.headers.upgrade) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Security middleware
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
        },
      },
    }));

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    // Cookie parser middleware
    app.use(cookieParser());

    // 🚀 PERFORMANCE: Set cache headers for Railway edge caching
    app.use((req, res, next) => {
      // Cache static responses for 5 minutes
      if (req.path.includes('/api/v1/leaderboards') || 
          req.path.includes('/api/v1/analytics') ||
          req.path.includes('/api/v1/tournaments/schedule')) {
        res.set('Cache-Control', `public, max-age=${process.env.CACHE_CONTROL_MAX_AGE || 300}`);
      }
      next();
    });

    // CORS configuration - Updated for production
    app.enableCors({
      origin: [
        // Production domains
        'https://pv3-gaming.vercel.app',
        'https://pv3-frontend.vercel.app',
        'https://pv3.vercel.app',
        'https://pv3-git-main-alsk.vercel.app',
        'https://pv3-alsk.vercel.app',
        // Admin Dashboard domains
        'https://admin-dashboard-8v91f3qnq-lowreyal70-gmailcoms-projects.vercel.app',
        'https://admin-dashboard-cvax6gjw2-lowreyal70-gmailcoms-projects.vercel.app',
        'https://admin-dashboard-9kppo1xzl-lowreyal70-gmailcoms-projects.vercel.app',
        'https://admin-dashboard-7qyubb0ka-lowreyal70-gmailcoms-projects.vercel.app',
        // Development domains
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174',
        // Allow any Vercel preview deployments
        /https:\/\/pv3.*\.vercel\.app$/,
        /https:\/\/admin-dashboard.*\.vercel\.app$/,
        // Allow any localhost port for development
        /http:\/\/localhost:\d+$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'DNT',
        'Cache-Control',
        'X-Mx-ReqToken',
        'Keep-Alive',
        'X-Requested-With',
        'If-Modified-Since'
      ],
      credentials: true,
      optionsSuccessStatus: 200, // Some legacy browsers choke on 204
      preflightContinue: false,
    });

    // Global prefix for API routes
    app.setGlobalPrefix('api/v1');

    // Health check endpoint - Always responds quickly for Railway health checks
    app.use('/health', (req, res) => {
      // Simple health check that always responds quickly
      // This ensures Railway health checks pass even if database is slow/unavailable
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        app: 'healthy',
        message: 'Service is running'
      });
    });

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('PV3 Gaming Platform API')
      .setDescription('Web3 Gaming Platform with Solana Integration')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('SIGINT received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    // Start server
    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 PV3 Backend API running on port ${port}`);
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🌐 API Base URL: http://localhost:${port}/api/v1`);
    logger.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    logger.log(`💾 Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    logger.log(`🔴 Redis URL configured: ${process.env.REDIS_URL ? 'Yes' : 'No'}`);
    logger.log(`🔥 Performance optimizations: Compression enabled, Request timeouts configured`);
    logger.log(`📖 API Documentation: http://localhost:${port}/api`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 