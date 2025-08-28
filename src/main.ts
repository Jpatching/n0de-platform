import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // Enhanced CORS configuration
  const corsOrigins = configService.get('CORS_ORIGINS')?.split(',') || [
    'https://n0de.pro',
    'https://www.n0de.pro',
  ];

  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'Origin', 
      'X-Requested-With',
      'X-CC-Webhook-Signature',
      'x-nowpayments-sig',
      'stripe-signature'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  }));

  // Additional preflight handler for complex requests
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', corsOrigins.includes(req.get('origin')) ? req.get('origin') : corsOrigins[0]);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, X-CC-Webhook-Signature, x-nowpayments-sig, stripe-signature');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      return res.sendStatus(204);
    }
    next();
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('n0de RPC API')
    .setDescription('The fastest, most reliable Solana RPC infrastructure API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('api-keys', 'API key management')
    .addTag('usage', 'Usage statistics and analytics')
    .addTag('support', 'Support ticket system')
    .addTag('rpc', 'RPC proxy and testing')
    .addTag('metrics', 'Performance metrics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'n0de API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .topbar-wrapper { display: none }
      .swagger-ui .topbar { display: none }
    `,
  });

  // Prisma service
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Health check endpoint
  app.use('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: configService.get('NODE_ENV'),
      region: configService.get('RAILWAY_REGION') || 'local',
    });
  });

  const port = configService.get('PORT') || configService.get('API_PORT') || 3000;
  
  await app.listen(port, '0.0.0.0');
  
  const baseUrl = configService.get('NODE_ENV') === 'production' 
    ? configService.get('BASE_URL') || `https://n0de-backend-production-4e34.up.railway.app`
    : `http://localhost:${port}`;
    
  console.log(`
🚀 n0de RPC Backend is running!
📍 Server: ${baseUrl}
📚 API Docs: ${baseUrl}/api/docs
🏥 Health: ${baseUrl}/health
🌍 Environment: ${configService.get('NODE_ENV')}
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start n0de backend:', error);
  process.exit(1);
});