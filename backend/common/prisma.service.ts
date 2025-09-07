import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly connectionPoolConfig = {
    // Optimized connection pool settings for high performance
    connection_limit: parseInt(process.env.DB_POOL_MAX || "100"),
    pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || "2"),
    idle_in_transaction_session_timeout: parseInt(
      process.env.DB_IDLE_TIMEOUT || "10",
    ),
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "30000"),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10"),
  };

  constructor() {
    // Build optimized connection URL with pool parameters
    const baseUrl = process.env.DATABASE_URL;
    const poolParams = new URLSearchParams({
      connection_limit: String(process.env.DB_POOL_MAX || "100"),
      pool_timeout: String(process.env.DB_POOL_TIMEOUT || "2"),
      pgbouncer: process.env.USE_PGBOUNCER === "true" ? "true" : "false",
      schema: process.env.DB_SCHEMA || "public",
      connect_timeout: String(process.env.DB_CONNECT_TIMEOUT || "10"),
    });

    const optimizedUrl = baseUrl.includes("?")
      ? `${baseUrl}&${poolParams.toString()}`
      : `${baseUrl}?${poolParams.toString()}`;

    super({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["warn", "error"],
      errorFormat:
        process.env.NODE_ENV === "development" ? "pretty" : "minimal",
      datasources: {
        db: {
          url: optimizedUrl,
        },
      },
    });

    // Configure connection pool monitoring
    if (process.env.NODE_ENV === "development") {
      this.setupPoolMonitoring();
    }
  }

  private setupPoolMonitoring() {
    // Monitor connection pool health every 30 seconds in development
    setInterval(async () => {
      try {
        const result = await this.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections,
            count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
            max(EXTRACT(EPOCH FROM (now() - state_change))) as max_idle_time
          FROM pg_stat_activity
          WHERE datname = current_database()
          AND pid != pg_backend_pid()
        `;

        console.log("📊 Connection Pool Status:", result[0]);
      } catch (error) {
        // Silently fail in case monitoring query fails
      }
    }, 30000);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // Verify connection pool is working
      await this.$queryRaw`SELECT 1 as connection_test`;
      console.log("🗄️  Database connected with optimized connection pool");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log("🗄️  Database disconnected");
  }

  async enableShutdownHooks(app: INestApplication) {
    // Handle shutdown hooks properly
    process.on("beforeExit", async () => {
      await app.close();
    });
  }

  // Helper method for health checks
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
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
  async paginate(
    model: string,
    params: {
      where?: any;
      orderBy?: any;
      select?: any;
      include?: any;
      page?: number;
      limit?: number;
    },
  ) {
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
