import { PrismaClient } from '@prisma/client';

// Production-ready Prisma client with connection pooling
const createPrismaClient = () => {
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    // During build time, DATABASE_URL might not be available
    // Return a mock client that will fail gracefully
    console.warn('DATABASE_URL not found - creating fallback Prisma client');
    return new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
        },
      },
    });
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connection pooling configuration - only add if we have a real connection
  if (process.env.DATABASE_URL) {
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
  }

  return client;
};

// Module-level singleton using a closure pattern
class PrismaManager {
  private static instance: PrismaClient | null = null;
  
  static getInstance(): PrismaClient {
    if (PrismaManager.instance === null) {
      PrismaManager.instance = createPrismaClient();
      
      // Setup cleanup handler - only if we have a real database connection
      if (typeof process !== 'undefined' && process.env.DATABASE_URL) {
        process.on('beforeExit', async () => {
          if (PrismaManager.instance) {
            try {
              await PrismaManager.instance.$disconnect();
            } catch (error) {
              console.warn('Error disconnecting Prisma client:', error);
            }
            PrismaManager.instance = null;
          }
        });
      }
    }
    
    return PrismaManager.instance;
  }
  
  static reset() {
    if (PrismaManager.instance) {
      try {
        PrismaManager.instance.$disconnect();
      } catch (error) {
        console.warn('Error disconnecting Prisma client during reset:', error);
      }
      PrismaManager.instance = null;
    }
  }
}

// Export the singleton instance
export const prisma = PrismaManager.getInstance(); 