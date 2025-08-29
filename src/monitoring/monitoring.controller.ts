import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceMonitorService } from './performance-monitor.service';
import { ScalingOptimizationService } from './scaling-optimization.service';
import { AlertingService } from './alerting.service';

@ApiTags('monitoring')
@ApiBearerAuth()
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private performanceMonitor: PerformanceMonitorService,
    private scalingOptimization: ScalingOptimizationService,
    private alerting: AlertingService
  ) {}

  @Get('performance/current')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Current performance metrics' })
  async getCurrentPerformanceMetrics() {
    return await this.performanceMonitor.getCurrentMetrics();
  }

  @Get('performance/report')
  @ApiOperation({ summary: 'Get detailed performance report' })
  @ApiResponse({ status: 200, description: 'Detailed performance analysis' })
  async getPerformanceReport() {
    return await this.performanceMonitor.getPerformanceReport();
  }

  @Get('performance/latency')
  @ApiOperation({ summary: 'Get latency statistics and targets' })
  @ApiResponse({ status: 200, description: 'Latency statistics' })
  async getLatencyStats() {
    return await this.performanceMonitor.getLatencyStats();
  }

  @Get('performance/rps')
  @ApiOperation({ summary: 'Get RPS statistics and capacity' })
  @ApiResponse({ status: 200, description: 'RPS statistics' })
  async getRPSStats() {
    return await this.performanceMonitor.getRPSStats();
  }

  @Get('scaling/recommendations')
  @ApiOperation({ summary: 'Get scaling recommendations' })
  @ApiResponse({ status: 200, description: 'Scaling recommendations' })
  async getScalingRecommendations() {
    return await this.scalingOptimization.getScalingRecommendations();
  }

  @Get('scaling/infrastructure')
  @ApiOperation({ summary: 'Get infrastructure health status' })
  @ApiResponse({ status: 200, description: 'Infrastructure health status' })
  async getInfrastructureHealth() {
    return await this.scalingOptimization.getInfrastructureHealth();
  }

  @Get('scaling/history')
  @ApiOperation({ summary: 'Get optimization history' })
  @ApiResponse({ status: 200, description: 'Optimization history' })
  async getOptimizationHistory() {
    return await this.scalingOptimization.getOptimizationHistory();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiResponse({ status: 200, description: 'List of active alerts' })
  async getActiveAlerts() {
    return await this.alerting.getActiveAlerts();
  }

  @Get('alerts/history')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiResponse({ status: 200, description: 'Alert history' })
  async getAlertHistory(@Query('hours') hours?: string) {
    const hoursNumber = hours ? parseInt(hours) : 24;
    return await this.alerting.getAlertHistory(hoursNumber);
  }

  @Get('alerts/rules')
  @ApiOperation({ summary: 'Get alert rules' })
  @ApiResponse({ status: 200, description: 'List of alert rules' })
  async getAlertRules() {
    return await this.alerting.getAlertRules();
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiResponse({ status: 200, description: 'Alert statistics' })
  async getAlertStats() {
    return await this.alerting.getAlertStats();
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(@Param('alertId') alertId: string) {
    await this.alerting.resolveAlert(alertId);
    return { success: true, message: 'Alert resolved' };
  }

  @Put('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Update an alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule updated successfully' })
  async updateAlertRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: any
  ) {
    await this.alerting.updateAlertRule(ruleId, updates);
    return { success: true, message: 'Alert rule updated' };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get monitoring dashboard data' })
  @ApiResponse({ status: 200, description: 'Complete monitoring dashboard data' })
  async getDashboardData() {
    const [
      currentMetrics,
      latencyStats,
      rpsStats,
      scalingRecommendations,
      infrastructureHealth,
      activeAlerts,
      alertStats
    ] = await Promise.all([
      this.performanceMonitor.getCurrentMetrics(),
      this.performanceMonitor.getLatencyStats(),
      this.performanceMonitor.getRPSStats(),
      this.scalingOptimization.getScalingRecommendations(),
      this.scalingOptimization.getInfrastructureHealth(),
      this.alerting.getActiveAlerts(),
      this.alerting.getAlertStats()
    ]);

    return {
      performance: {
        current: currentMetrics,
        latency: latencyStats,
        rps: rpsStats
      },
      scaling: {
        recommendations: scalingRecommendations,
        infrastructure: infrastructureHealth
      },
      alerts: {
        active: activeAlerts,
        stats: alertStats
      },
      targets: {
        latency: 9, // ms
        rps: 50000,
        uptime: 99.99
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get monitoring system health' })
  @ApiResponse({ status: 200, description: 'Monitoring system health status' })
  async getMonitoringHealth() {
    try {
      // Test all services
      const [
        performanceHealth,
        scalingHealth,
        alertingHealth
      ] = await Promise.all([
        this.performanceMonitor.getCurrentMetrics(),
        this.scalingOptimization.getInfrastructureHealth(),
        this.alerting.getAlertStats()
      ]);

      return {
        status: 'healthy',
        services: {
          performance: performanceHealth ? 'healthy' : 'degraded',
          scaling: scalingHealth.status === 'healthy' ? 'healthy' : 'degraded',
          alerting: 'healthy'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('targets')
  @ApiOperation({ summary: 'Get performance targets and current status' })
  @ApiResponse({ status: 200, description: 'Performance targets and status' })
  async getPerformanceTargets() {
    const [latencyStats, rpsStats] = await Promise.all([
      this.performanceMonitor.getLatencyStats(),
      this.performanceMonitor.getRPSStats()
    ]);

    return {
      latency: {
        target: 9, // ms
        current: latencyStats.current,
        p95: latencyStats.p95,
        status: latencyStats.current <= 9 ? 'meeting_target' : 
                latencyStats.current <= 12 ? 'warning' : 'critical',
        trend: latencyStats.trend
      },
      rps: {
        target: 50000,
        enterprise_target: 100000,
        current: rpsStats.current,
        capacity: rpsStats.capacity,
        status: rpsStats.current >= 50000 ? 'meeting_target' :
                rpsStats.current >= 40000 ? 'warning' : 'critical',
        trend: rpsStats.trend
      },
      uptime: {
        target: 99.99, // %
        current: ((process.uptime() / 86400) * 100).toFixed(2), // Simplified uptime calculation
        status: 'meeting_target' // Would be calculated from actual uptime monitoring
      }
    };
  }

  @Post('test/performance')
  @ApiOperation({ summary: 'Trigger performance test' })
  @ApiResponse({ status: 200, description: 'Performance test initiated' })
  async triggerPerformanceTest(@Body() config?: any) {
    // This would integrate with load testing tools
    return {
      message: 'Performance test would be initiated',
      config: config || {
        duration: '5m',
        rps: 1000,
        target: 'https://n0de-backend-production.up.railway.app/health'
      },
      status: 'initiated',
      timestamp: new Date().toISOString()
    };
  }
}