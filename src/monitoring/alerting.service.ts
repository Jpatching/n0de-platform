import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../common/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

interface Alert {
  id: string;
  type: 'latency' | 'rps' | 'error_rate' | 'uptime' | 'resource' | 'security';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  trend: 'improving' | 'stable' | 'degrading';
  metadata?: any;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  severity: Alert['severity'];
  threshold: number;
  condition: 'greater_than' | 'less_than' | 'equals';
  windowMinutes: number;
  enabled: boolean;
  cooldownMinutes: number;
  actions: AlertAction[];
}

interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'websocket' | 'auto_scale';
  config: any;
  enabled: boolean;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertCooldowns = new Map<string, number>();
  
  // Default alert rules for N0DE enterprise performance
  private readonly defaultRules: AlertRule[] = [
    {
      id: 'latency_critical',
      name: 'Critical Latency Alert',
      type: 'latency',
      severity: 'critical',
      threshold: 20, // 20ms
      condition: 'greater_than',
      windowMinutes: 2,
      enabled: true,
      cooldownMinutes: 5,
      actions: [
        { type: 'websocket', config: {}, enabled: true },
        { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL }, enabled: true }
      ]
    },
    {
      id: 'latency_warning',
      name: 'High Latency Warning',
      type: 'latency',
      severity: 'warning',
      threshold: 12, // 12ms
      condition: 'greater_than',
      windowMinutes: 5,
      enabled: true,
      cooldownMinutes: 10,
      actions: [
        { type: 'websocket', config: {}, enabled: true }
      ]
    },
    {
      id: 'rps_critical',
      name: 'Low RPS Critical',
      type: 'rps',
      severity: 'critical',
      threshold: 25000,
      condition: 'less_than',
      windowMinutes: 3,
      enabled: true,
      cooldownMinutes: 5,
      actions: [
        { type: 'websocket', config: {}, enabled: true },
        { type: 'auto_scale', config: { action: 'scale_up' }, enabled: true }
      ]
    },
    {
      id: 'rps_target',
      name: 'RPS Below Target',
      type: 'rps',
      severity: 'warning',
      threshold: 50000,
      condition: 'less_than',
      windowMinutes: 10,
      enabled: true,
      cooldownMinutes: 15,
      actions: [
        { type: 'websocket', config: {}, enabled: true }
      ]
    },
    {
      id: 'error_rate_high',
      name: 'High Error Rate',
      type: 'error_rate',
      severity: 'critical',
      threshold: 5, // 5%
      condition: 'greater_than',
      windowMinutes: 2,
      enabled: true,
      cooldownMinutes: 10,
      actions: [
        { type: 'websocket', config: {}, enabled: true },
        { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL }, enabled: true }
      ]
    },
    {
      id: 'uptime_critical',
      name: 'Uptime Critical',
      type: 'uptime',
      severity: 'emergency',
      threshold: 99.0, // 99%
      condition: 'less_than',
      windowMinutes: 1,
      enabled: true,
      cooldownMinutes: 1,
      actions: [
        { type: 'websocket', config: {}, enabled: true },
        { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL }, enabled: true }
      ]
    }
  ];

  constructor(
    private configService: ConfigService,
    private redis: RedisService,
    private prisma: PrismaService,
    private websocketGateway: WebsocketGateway
  ) {
    this.initializeAlerting();
  }

  private async initializeAlerting(): Promise<void> {
    // Load alert rules from database or use defaults
    await this.loadAlertRules();
    
    // Start alert monitoring loop
    setInterval(() => {
      this.processAlerts();
    }, 30000); // Check every 30 seconds

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);

    this.logger.log('Alerting system initialized with enterprise performance targets');
  }

  private async loadAlertRules(): Promise<void> {
    try {
      // In production, load from database
      // For now, use default rules
      for (const rule of this.defaultRules) {
        await this.redis.set(
          `alert_rule:${rule.id}`,
          JSON.stringify(rule),
          86400 // 24 hours TTL
        );
      }
      this.logger.log(`Loaded ${this.defaultRules.length} alert rules`);
    } catch (error) {
      this.logger.error('Failed to load alert rules:', error);
    }
  }

  private async processAlerts(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      if (!metrics) return;

      for (const rule of this.defaultRules) {
        if (!rule.enabled) continue;

        const shouldAlert = await this.evaluateRule(rule, metrics);
        if (shouldAlert) {
          await this.triggerAlert(rule, metrics);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process alerts:', error);
    }
  }

  private async getCurrentMetrics(): Promise<any> {
    try {
      // Get metrics from Redis cache
      const latencyData = await this.redis.getMetrics('latency', Date.now() - 300000); // Last 5 minutes
      const rpsData = await this.redis.getMetrics('rps', Date.now() - 300000);
      
      if (latencyData.length === 0 || rpsData.length === 0) {
        return null;
      }

      const avgLatency = latencyData.reduce((sum, m) => sum + m.value, 0) / latencyData.length;
      const avgRPS = rpsData.reduce((sum, m) => sum + m.value, 0) / rpsData.length;
      
      // Calculate uptime from process uptime
      const uptimePercent = Math.min(100, (process.uptime() / 86400) * 100); // Daily uptime approximation
      
      // Get error rate from recent usage stats
      const errorRate = await this.calculateErrorRate();

      return {
        latency: avgLatency,
        rps: avgRPS,
        uptime: uptimePercent,
        error_rate: errorRate,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to get current metrics:', error);
      return null;
    }
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 300000);
      
      const stats = await this.prisma.usageStats.aggregate({
        where: {
          createdAt: { gte: fiveMinutesAgo }
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

  private async evaluateRule(rule: AlertRule, metrics: any): Promise<boolean> {
    const metricValue = metrics[rule.type];
    if (metricValue === undefined) return false;

    // Check if alert is in cooldown
    const cooldownKey = `alert_cooldown:${rule.id}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    
    if (now - lastAlert < rule.cooldownMinutes * 60000) {
      return false;
    }

    // Evaluate condition
    let conditionMet = false;
    switch (rule.condition) {
      case 'greater_than':
        conditionMet = metricValue > rule.threshold;
        break;
      case 'less_than':
        conditionMet = metricValue < rule.threshold;
        break;
      case 'equals':
        conditionMet = Math.abs(metricValue - rule.threshold) < 0.01;
        break;
    }

    return conditionMet;
  }

  private async triggerAlert(rule: AlertRule, metrics: any): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    const metricValue = metrics[rule.type];
    
    const alert: Alert = {
      id: alertId,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, metricValue),
      threshold: rule.threshold,
      currentValue: metricValue,
      trend: await this.calculateTrend(rule.type),
      metadata: { rule: rule.id, metrics },
      timestamp: Date.now(),
      resolved: false
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    await this.redis.set(`alert:${alertId}`, JSON.stringify(alert), 86400);

    // Set cooldown
    this.alertCooldowns.set(`alert_cooldown:${rule.id}`, Date.now());

    // Execute alert actions
    for (const action of rule.actions) {
      if (action.enabled) {
        await this.executeAlertAction(action, alert);
      }
    }

    // Log alert
    this.logger.warn(`Alert triggered: ${alert.title} - ${alert.message}`);

    // Store in database for historical tracking
    await this.storeAlertInDatabase(alert, rule);
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const direction = rule.condition === 'greater_than' ? 'exceeds' : 'below';
    const unit = this.getUnitForMetricType(rule.type);
    
    return `${rule.name}: Current value ${currentValue}${unit} ${direction} threshold ${rule.threshold}${unit}`;
  }

  private getUnitForMetricType(type: Alert['type']): string {
    switch (type) {
      case 'latency': return 'ms';
      case 'rps': return ' RPS';
      case 'error_rate': return '%';
      case 'uptime': return '%';
      default: return '';
    }
  }

  private async calculateTrend(metricType: Alert['type']): Promise<Alert['trend']> {
    try {
      const now = Date.now();
      const recent = await this.redis.getMetrics(metricType, now - 300000, now); // Last 5 minutes
      const older = await this.redis.getMetrics(metricType, now - 600000, now - 300000); // 5-10 minutes ago

      if (recent.length === 0 || older.length === 0) return 'stable';

      const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (Math.abs(changePercent) < 5) return 'stable';
      
      // For latency and error_rate, lower is better
      if (metricType === 'latency' || metricType === 'error_rate') {
        return changePercent < 0 ? 'improving' : 'degrading';
      } else {
        // For RPS and uptime, higher is better
        return changePercent > 0 ? 'improving' : 'degrading';
      }
    } catch (error) {
      this.logger.warn('Failed to calculate trend:', error);
      return 'stable';
    }
  }

  private async executeAlertAction(action: AlertAction, alert: Alert): Promise<void> {
    try {
      switch (action.type) {
        case 'websocket':
          this.websocketGateway.broadcastSystemAnnouncement(
            `Performance Alert: ${alert.title} - ${alert.message}`,
            alert.severity === 'critical' || alert.severity === 'emergency' ? 'error' : 'warning'
          );
          break;

        case 'webhook':
          if (action.config.url) {
            await this.sendWebhookAlert(action.config.url, alert);
          }
          break;

        case 'email':
          await this.sendEmailAlert(action.config, alert);
          break;

        case 'slack':
          await this.sendSlackAlert(action.config, alert);
          break;

        case 'auto_scale':
          await this.executeAutoScale(action.config, alert);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to execute alert action ${action.type}:`, error);
    }
  }

  private async sendWebhookAlert(url: string, alert: Alert): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'n0de-performance-monitor'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      this.logger.log(`Webhook alert sent successfully to ${url}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook alert:`, error);
    }
  }

  private async sendEmailAlert(config: any, alert: Alert): Promise<void> {
    // Email implementation would go here
    this.logger.log(`Email alert would be sent: ${alert.title}`);
  }

  private async sendSlackAlert(config: any, alert: Alert): Promise<void> {
    // Slack implementation would go here
    this.logger.log(`Slack alert would be sent: ${alert.title}`);
  }

  private async executeAutoScale(config: any, alert: Alert): Promise<void> {
    this.logger.log(`Auto-scaling action triggered: ${config.action} for alert: ${alert.title}`);
    
    // In production, this would integrate with Railway API or container orchestration
    // For now, we'll log the action and store it for manual review
    await this.redis.set(
      'autoscale_action',
      JSON.stringify({
        action: config.action,
        trigger: alert,
        timestamp: Date.now(),
        status: 'pending_manual_review'
      }),
      1800 // 30 minutes TTL
    );
  }

  private async storeAlertInDatabase(alert: Alert, rule: AlertRule): Promise<void> {
    try {
      await this.prisma.systemMetrics.create({
        data: {
          metricType: `alert_${alert.type}`,
          value: alert.currentValue,
          unit: this.getUnitForMetricType(alert.type),
          metadata: {
            alertId: alert.id,
            severity: alert.severity,
            threshold: alert.threshold,
            trend: alert.trend,
            rule: rule.id
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to store alert in database:', error);
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    const now = Date.now();
    const fourHoursAgo = now - (4 * 60 * 60 * 1000);

    // Clean up active alerts map
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < fourHoursAgo) {
        this.activeAlerts.delete(alertId);
      }
    }

    // Clean up Redis alert keys
    const alertKeys = await this.redis.keys('alert:*');
    for (const key of alertKeys) {
      const alertData = await this.redis.get(key);
      if (alertData) {
        const alert = JSON.parse(alertData);
        if (alert.timestamp < fourHoursAgo) {
          await this.redis.del(key);
        }
      }
    }

    this.logger.debug('Cleaned up old alerts');
  }

  // Public API methods
  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      await this.redis.set(`alert:${alertId}`, JSON.stringify(alert), 86400);
      this.activeAlerts.delete(alertId);
      
      this.logger.log(`Alert resolved: ${alert.title}`);
    }
  }

  async getAlertHistory(hours: number = 24): Promise<Alert[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const alertKeys = await this.redis.keys('alert:*');
    const alerts: Alert[] = [];

    for (const key of alertKeys) {
      const alertData = await this.redis.get(key);
      if (alertData) {
        const alert = JSON.parse(alertData);
        if (alert.timestamp >= cutoff) {
          alerts.push(alert);
        }
      }
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const ruleData = await this.redis.get(`alert_rule:${ruleId}`);
    if (ruleData) {
      const rule = { ...JSON.parse(ruleData), ...updates };
      await this.redis.set(`alert_rule:${ruleId}`, JSON.stringify(rule), 86400);
      this.logger.log(`Alert rule updated: ${ruleId}`);
    }
  }

  async getAlertRules(): Promise<AlertRule[]> {
    const ruleKeys = await this.redis.keys('alert_rule:*');
    const rules: AlertRule[] = [];

    for (const key of ruleKeys) {
      const ruleData = await this.redis.get(key);
      if (ruleData) {
        rules.push(JSON.parse(ruleData));
      }
    }

    return rules.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAlertStats(): Promise<{
    activeCount: number;
    totalToday: number;
    criticalCount: number;
    mostTriggeredType: string;
  }> {
    const activeCount = this.activeAlerts.size;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    const todayAlerts = await this.getAlertHistory(24);
    const totalToday = todayAlerts.filter(a => a.timestamp >= todayStart).length;
    const criticalCount = todayAlerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length;
    
    // Find most triggered alert type
    const typeCounts = todayAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostTriggeredType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      activeCount,
      totalToday,
      criticalCount,
      mostTriggeredType
    };
  }
}