import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security
  app.use(helmet());
  app.use(compression());
  
  // CORS - Backend handles CORS, Nginx should not add duplicate headers
  app.enableCors({
    origin: [
      'https://n0de.pro',        // Frontend (Vercel)
      'https://www.n0de.pro',    // Frontend alias
      'https://api.n0de.pro',    // API domain
      'http://localhost:8899',   // Local Solana RPC
      'http://127.0.0.1:8899',   // Local Solana RPC
      'http://localhost:4000',   // Self-reference for internal calls
      'http://127.0.0.1:4000'    // Self-reference for internal calls
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-api-key',
      'stripe-signature',
      'x-csrf-token',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: [
      'Content-Range',
      'X-Content-Range',
      'Authorization',
      'Content-Length'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
  });
  
  // Global prefix
  app.setGlobalPrefix('api/v1');
  
  // Validation
  app.useGlobalPipes(new ValidationPipe());
  
  // Swagger
  const config = new DocumentBuilder()
    .setTitle('N0DE RPC API')
    .setDescription('Solana RPC Infrastructure API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  // Health check
  app.use('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`N0DE Backend running on port ${port}`);
}

bootstrap();
