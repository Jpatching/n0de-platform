import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getHealthStatus() {
    const startTime = Date.now();

    const dbHealth = await this.checkDatabase();
    const responseTime = Date.now() - startTime;

    return {
      status: dbHealth ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      region: process.env.backend_REGION || "local",
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbHealth ? "healthy" : "unhealthy",
        },
      },
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
          100,
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      return await this.prisma.isHealthy();
    } catch (error) {
      return false;
    }
  }
}
