import { PrismaClient } from '@prisma/client';

// Production-ready Prisma client with connection pooling
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connection pooling configuration
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = Date.now();
          const result = await query(args);
          const end = Date.now();
          
          // Log slow queries in production
          if (end - start > 1000) {
            console.warn(`Slow query detected: ${model}.${operation} took ${end - start}ms`);
          }
          
          return result;
        },
      },
    },
  });

  return client;
};

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for production
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Handle connection cleanup
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma; 