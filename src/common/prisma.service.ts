import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Optimize connection pooling for Railway
      __internal: {
        engine: {
          connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
          poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '60'),
          idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300'),
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // Verify connection pool is working
      await this.$queryRaw`SELECT 1 as connection_test`;
      console.log('🗄️  Database connected with optimized connection pool');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🗄️  Database disconnected');
  }

  async enableShutdownHooks(app: INestApplication) {
    // Handle shutdown hooks properly
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  // Helper method for health checks
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Helper method for soft deletes
  async softDelete(model: string, id: string) {
    return this[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Helper method for pagination
  async paginate(model: string, params: {
    where?: any;
    orderBy?: any;
    select?: any;
    include?: any;
    page?: number;
    limit?: number;
  }) {
    const { where, orderBy, select, include, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this[model].findMany({
        where,
        orderBy,
        select,
        include,
        skip,
        take: limit,
      }),
      this[model].count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}