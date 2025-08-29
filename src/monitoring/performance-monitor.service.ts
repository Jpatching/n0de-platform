import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../common/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

interface PerformanceMetrics {
  latency: number;
  rps: number;
  uptime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  timestamp: number;
}

interface LatencyTarget {
  target: number; // 9ms target
  warning: number; // 7ms warning
  critical: number; // 15ms critical
}

interface RPSTarget {
  target: number; // 50K+ target
  warning: number; // 40K warning
  critical: number; // 20K critical
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly LATENCY_TARGET: LatencyTarget = {
    target: 9,
    warning: 7,
    critical: 15
  };
  private readonly RPS_TARGET: RPSTarget = {
    target: 50000,
    warning: 40000,
    critical: 20000
  };
  
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 1440; // 24 hours at 1-minute intervals
  private alertCooldowns = new Map<string, number>();
  private readonly ALERT_COOLDOWN = 300000; // 5 minutes

  constructor(
    private configService: ConfigService,
    private redis: RedisService,
    private prisma: PrismaService,
    private websocketGateway: WebsocketGateway
  ) {
    // Start monitoring interval
    this.startMonitoring();
  }

  private startMonitoring() {
    // Real-time metrics collection every 10 seconds
    setInterval(async () => {
      await this.collectMetrics();
    }, 10000);

    // Performance analysis every minute
    setInterval(async () => {
      await this.analyzePerformance();
    }, 60000);

    // Deep analysis every 5 minutes
    setInterval(async () => {
      await this.performDeepAnalysis();
    }, 300000);

    this.logger.log('Performance monitoring started - targeting 9ms latency & 50K+ RPS');
  }

  private async collectMetrics(): Promise<PerformanceMetrics> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Database health check with latency measurement
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      // Get active connections from various sources
      const activeConnections = await this.getActiveConnections();
      
      // Calculate current RPS from Redis metrics
      const currentRPS = await this.calculateCurrentRPS();
      
      // Get memory and CPU usage
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics: PerformanceMetrics = {
        latency: dbLatency,
        rps: currentRPS,
        uptime: process.uptime(),
        errorRate: await this.calculateErrorRate(),
        memoryUsage,
        cpuUsage: this.calculateCPUPercentage(cpuUsage),
        activeConnections,
        timestamp: Date.now()
      };

      // Store in Redis for real-time access
      await this.redis.recordMetric('latency', dbLatency);
      await this.redis.recordMetric('rps', currentRPS);
      await this.redis.recordMetric('memory_usage', memoryUsage.used / 1024 / 1024);
      
      // Store in memory for trend analysis
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.MAX_HISTORY) {
        this.metricsHistory.shift();
      }

      // Broadcast to WebSocket clients
      this.websocketGateway.server.emit('performance_metrics', {
        latency: Math.round(dbLatency * 100) / 100,
        rps: Math.round(currentRPS),
        uptime: Math.round(process.uptime()),
        status: this.getPerformanceStatus(dbLatency, currentRPS),
        timestamp: Date.now()
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect performance metrics:', error);
      throw error;
    }
  }

  private async getActiveConnections(): Promise<number> {
    try {
      // Count active user sessions
      const activeSessions = await this.prisma.userSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      // Add WebSocket connections
      const wsConnections = this.websocketGateway.getActiveUserCount();
      
      return activeSessions + wsConnections;
    } catch (error) {
      this.logger.warn('Failed to get active connections:', error);
      return 0;
    }
  }

  private async calculateCurrentRPS(): Promise<number> {
    try {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      // Get requests from the last minute
      const recentRequests = await this.redis.zrangebyscore(
        'metrics:requests',
        oneMinuteAgo,
        now
      );
      
      return recentRequests.length;
    } catch (error) {
      this.logger.warn('Failed to calculate RPS:', error);
      return 0;
    }
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      
      const stats = await this.prisma.usageStats.aggregate({
        where: {
          createdAt: { gte: oneMinuteAgo }
        },
        _sum: {
          requestCount: true,
          errorCount: true
        }
      });

      const totalRequests = stats._sum.requestCount || 0;
      const totalErrors = stats._sum.errorCount || 0;
      
      return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    } catch (error) {
      this.logger.warn('Failed to calculate error rate:', error);
      return 0;
    }
  }

  private calculateCPUPercentage(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified CPU calculation
    // In production, you'd use more sophisticated CPU monitoring
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert microseconds to percentage
  }

  private getPerformanceStatus(latency: number, rps: number): string {
    if (latency > this.LATENCY_TARGET.critical || rps < this.RPS_TARGET.critical) {
      return 'critical';
    }
    if (latency > this.LATENCY_TARGET.warning || rps < this.RPS_TARGET.warning) {
      return 'warning';
    }
    if (latency <= this.LATENCY_TARGET.target && rps >= this.RPS_TARGET.target) {
      return 'excellent';
    }
    return 'operational';
  }

  private async analyzePerformance(): Promise<void> {
    if (this.metricsHistory.length < 5) return;
    
    const recentMetrics = this.metricsHistory.slice(-5);
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
    const avgRPS = recentMetrics.reduce((sum, m) => sum + m.rps, 0) / recentMetrics.length;
    
    // Check for performance degradation
    if (avgLatency > this.LATENCY_TARGET.warning) {
      await this.sendAlert('latency_warning', {
        currentLatency: avgLatency,
        target: this.LATENCY_TARGET.target,
        trend: this.calculateLatencyTrend()
      });
    }
    
    if (avgRPS < this.RPS_TARGET.warning) {
      await this.sendAlert('rps_warning', {
        currentRPS: avgRPS,
        target: this.RPS_TARGET.target,
        trend: this.calculateRPSTrend()
      });
    }
    
    // Store metrics in database for historical analysis
    await this.storeHistoricalMetrics(avgLatency, avgRPS);
  }

  private async performDeepAnalysis(): Promise<void> {
    this.logger.log('Performing deep performance analysis...');
    
    const analysis = {
      latencyPercentiles: this.calculateLatencyPercentiles(),
      rpsCapacity: await this.assessRPSCapacity(),
      resourceUtilization: this.assessResourceUtilization(),
      bottlenecks: await this.identifyBottlenecks(),
      scalingRecommendations: this.generateScalingRecommendations()
    };
    
    // Store analysis results
    await this.redis.set(
      'performance_analysis',
      JSON.stringify(analysis),
      300 // 5 minutes TTL
    );
    
    this.logger.log('Deep analysis completed', analysis);
  }

  private calculateLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    if (this.metricsHistory.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }
    
    const latencies = this.metricsHistory.map(m => m.latency).sort((a, b) => a - b);
    const len = latencies.length;
    
    return {
      p50: latencies[Math.floor(len * 0.5)],
      p95: latencies[Math.floor(len * 0.95)],
      p99: latencies[Math.floor(len * 0.99)]
    };
  }

  private async assessRPSCapacity(): Promise<{ current: number; capacity: number; headroom: number }> {
    const recentRPS = this.metricsHistory.slice(-10).map(m => m.rps);
    const maxRPS = Math.max(...recentRPS);
    const avgRPS = recentRPS.reduce((sum, rps) => sum + rps, 0) / recentRPS.length;
    
    // Estimate capacity based on current performance
    const estimatedCapacity = this.estimateRPSCapacity(avgRPS);
    
    return {
      current: avgRPS,
      capacity: estimatedCapacity,
      headroom: (estimatedCapacity - avgRPS) / estimatedCapacity * 100
    };
  }

  private estimateRPSCapacity(currentRPS: number): number {
    // Conservative capacity estimation based on current metrics
    // This would be more sophisticated in production with load testing data
    const recentMetrics = this.metricsHistory.slice(-5);
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.used, 0) / recentMetrics.length;
    
    // Simple capacity model - more sophisticated modeling would use ML
    const latencyFactor = Math.max(0.1, (this.LATENCY_TARGET.target / avgLatency));
    const memoryFactor = Math.max(0.1, 1 - (avgMemory / (1024 * 1024 * 1024))); // 1GB threshold
    
    return Math.floor(currentRPS * Math.min(latencyFactor, memoryFactor) * 2);
  }

  private assessResourceUtilization(): { memory: number; cpu: number; connections: number } {
    if (this.metricsHistory.length === 0) {
      return { memory: 0, cpu: 0, connections: 0 };
    }
    
    const recent = this.metricsHistory[this.metricsHistory.length - 1];
    
    return {
      memory: (recent.memoryUsage.used / recent.memoryUsage.rss) * 100,
      cpu: recent.cpuUsage,
      connections: recent.activeConnections
    };
  }

  private async identifyBottlenecks(): Promise<string[]> {
    const bottlenecks: string[] = [];
    
    const latencyPercentiles = this.calculateLatencyPercentiles();
    if (latencyPercentiles.p95 > this.LATENCY_TARGET.target * 2) {
      bottlenecks.push('Database queries - P95 latency exceeds target');
    }
    
    const recent = this.metricsHistory[this.metricsHistory.length - 1];
    if (recent?.memoryUsage.used / recent?.memoryUsage.rss > 0.8) {
      bottlenecks.push('Memory usage - approaching limits');
    }
    
    const errorRate = await this.calculateErrorRate();
    if (errorRate > 1) {
      bottlenecks.push('High error rate detected');
    }
    
    return bottlenecks;
  }

  private generateScalingRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const capacity = this.estimateRPSCapacity(this.getCurrentRPS());
    if (capacity < this.RPS_TARGET.target) {
      recommendations.push('Scale horizontally - add more Railway instances');
      recommendations.push('Implement connection pooling optimization');
      recommendations.push('Add Redis caching for frequent queries');
    }
    
    const latencyPercentiles = this.calculateLatencyPercentiles();
    if (latencyPercentiles.p95 > this.LATENCY_TARGET.target) {
      recommendations.push('Optimize database queries and indexes');
      recommendations.push('Implement query result caching');
      recommendations.push('Consider read replicas for scaling reads');
    }
    
    return recommendations;
  }

  private getCurrentRPS(): number {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1].rps 
      : 0;
  }

  private calculateLatencyTrend(): string {
    if (this.metricsHistory.length < 5) return 'insufficient_data';
    
    const recent5 = this.metricsHistory.slice(-5).map(m => m.latency);
    const older5 = this.metricsHistory.slice(-10, -5).map(m => m.latency);
    
    const recentAvg = recent5.reduce((sum, l) => sum + l, 0) / recent5.length;
    const olderAvg = older5.reduce((sum, l) => sum + l, 0) / older5.length;
    
    if (recentAvg > olderAvg * 1.1) return 'degrading';
    if (recentAvg < olderAvg * 0.9) return 'improving';
    return 'stable';
  }

  private calculateRPSTrend(): string {
    if (this.metricsHistory.length < 5) return 'insufficient_data';
    
    const recent5 = this.metricsHistory.slice(-5).map(m => m.rps);
    const older5 = this.metricsHistory.slice(-10, -5).map(m => m.rps);
    
    const recentAvg = recent5.reduce((sum, r) => sum + r, 0) / recent5.length;
    const olderAvg = older5.reduce((sum, r) => sum + r, 0) / older5.length;
    
    if (recentAvg < olderAvg * 0.9) return 'degrading';
    if (recentAvg > olderAvg * 1.1) return 'improving';
    return 'stable';
  }

  private async sendAlert(type: string, data: any): Promise<void> {
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(type) || 0;
    
    if (now - lastAlert < this.ALERT_COOLDOWN) {
      return; // Still in cooldown
    }
    
    this.alertCooldowns.set(type, now);
    
    this.logger.warn(`Performance Alert: ${type}`, data);
    
    // Send to WebSocket clients
    this.websocketGateway.broadcastSystemAnnouncement(
      `Performance Alert: ${type} - ${JSON.stringify(data)}`,
      'warning'
    );
    
    // Store alert in database
    await this.prisma.systemMetrics.create({
      data: {
        metricType: `alert_${type}`,
        value: 1,
        unit: 'count',
        metadata: data
      }
    });
  }

  private async storeHistoricalMetrics(avgLatency: number, avgRPS: number): Promise<void> {
    try {
      await this.prisma.systemMetrics.createMany({
        data: [
          {
            metricType: 'latency',
            value: avgLatency,
            unit: 'ms',
            region: this.configService.get('RAILWAY_REGION') || 'unknown'
          },
          {
            metricType: 'throughput',
            value: avgRPS,
            unit: 'rps',
            region: this.configService.get('RAILWAY_REGION') || 'unknown'
          }
        ]
      });
    } catch (error) {
      this.logger.error('Failed to store historical metrics:', error);
    }
  }

  // Public API methods
  async getCurrentMetrics(): Promise<PerformanceMetrics | null> {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null;
  }

  async getPerformanceReport(): Promise<any> {
    const analysisData = await this.redis.get('performance_analysis');
    return analysisData ? JSON.parse(analysisData) : null;
  }

  async getLatencyStats(): Promise<{ target: number; current: number; p95: number; trend: string }> {
    const percentiles = this.calculateLatencyPercentiles();
    const current = this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1].latency 
      : 0;
    
    return {
      target: this.LATENCY_TARGET.target,
      current,
      p95: percentiles.p95,
      trend: this.calculateLatencyTrend()
    };
  }

  async getRPSStats(): Promise<{ target: number; current: number; capacity: number; trend: string }> {
    const capacity = await this.assessRPSCapacity();
    
    return {
      target: this.RPS_TARGET.target,
      current: this.getCurrentRPS(),
      capacity: capacity.capacity,
      trend: this.calculateRPSTrend()
    };
  }
}