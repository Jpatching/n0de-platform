import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../common/redis-cache.service';

export interface SecurityEvent {
  playerId: string;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  matchId?: string;
}

export interface AuditStats {
  totalEvents: number;
  criticalEvents: number;
  bannedPlayers: number;
  topThreats: string[];
  recentEvents: SecurityEvent[];
}

@Injectable()
export class AntiCheatAuditService {
  private readonly logger = new Logger(AntiCheatAuditService.name);

  // 🛡️ AUDIT CONFIGURATION
  private readonly MAX_EVENTS_PER_PLAYER = 1000; // Max events to store per player
  private readonly AUDIT_RETENTION_DAYS = 30; // Keep audit logs for 30 days
  private readonly CRITICAL_EVENT_ALERT_THRESHOLD = 5; // Alert after 5 critical events

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🛡️ AUDIT: Security event logging initialized');
  }

  /**
   * 🛡️ CRITICAL: Log security event for analysis
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const enhancedEvent = { ...event, eventId };

      // Store player-specific events
      const playerKey = `audit:player:${event.playerId}`;
      const playerEvents = await this.redisCacheService.get<SecurityEvent[]>(playerKey) || [];
      playerEvents.push(enhancedEvent);
      
      // Keep only last 100 events per player
      if (playerEvents.length > 100) {
        playerEvents.shift();
      }
      
      await this.redisCacheService.set(playerKey, playerEvents, 2592000000); // 30 days

      // Log based on severity
      if (event.severity === 'critical') {
        this.logger.error(`🚨 CRITICAL: ${event.event} - Player: ${event.playerId}`, event.data);
      } else if (event.severity === 'high') {
        this.logger.warn(`⚠️ HIGH: ${event.event} - Player: ${event.playerId}`);
      }

    } catch (error) {
      this.logger.error('❌ Failed to log security event:', error);
    }
  }

  /**
   * 🛡️ Store event for specific player
   */
  private async storePlayerEvent(playerId: string, event: SecurityEvent): Promise<void> {
    const key = `audit:player:${playerId}`;
    const events = await this.redisCacheService.get<SecurityEvent[]>(key) || [];
    
    events.push(event);
    
    // Keep only recent events to prevent memory issues
    if (events.length > this.MAX_EVENTS_PER_PLAYER) {
      events.splice(0, events.length - this.MAX_EVENTS_PER_PLAYER);
    }
    
    // Store with 30-day TTL
    await this.redisCacheService.set(key, events, this.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }

  /**
   * 🛡️ Store in global event timeline
   */
  private async storeGlobalEvent(event: SecurityEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `audit:global:${today}`;
    
    const events = await this.redisCacheService.get<SecurityEvent[]>(key) || [];
    events.push(event);
    
    // Keep only last 10000 events per day
    if (events.length > 10000) {
      events.shift();
    }
    
    await this.redisCacheService.set(key, events, this.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }

  /**
   * 🛡️ Update event counters for statistics
   */
  private async updateEventCounters(event: SecurityEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const countersKey = `audit:counters:${today}`;
    
    const counters = await this.redisCacheService.get<any>(countersKey) || {
      total: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      byType: {}
    };
    
    counters.total++;
    counters[event.severity]++;
    counters.byType[event.event] = (counters.byType[event.event] || 0) + 1;
    
    await this.redisCacheService.set(countersKey, counters, this.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }

  /**
   * 🛡️ Check if event should trigger alerts
   */
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    if (event.severity !== 'critical') return;
    
    // Count recent critical events for this player
    const recentEventsKey = `audit:recent_critical:${event.playerId}`;
    const recentEvents = await this.redisCacheService.get<number[]>(recentEventsKey) || [];
    const oneHourAgo = Date.now() - 3600000;
    
    // Clean old events and add new one
    const validEvents = recentEvents.filter(timestamp => timestamp > oneHourAgo);
    validEvents.push(Date.now());
    
    await this.redisCacheService.set(recentEventsKey, validEvents, 3600000); // 1 hour TTL
    
    // Alert if threshold exceeded
    if (validEvents.length >= this.CRITICAL_EVENT_ALERT_THRESHOLD) {
      await this.triggerSecurityAlert(event.playerId, validEvents.length, event);
    }
  }

  /**
   * 🛡️ Trigger security alert for admin attention
   */
  private async triggerSecurityAlert(playerId: string, eventCount: number, lastEvent: SecurityEvent): Promise<void> {
    const alertData = {
      playerId,
      eventCount,
      lastEvent,
      timestamp: Date.now(),
      alertLevel: 'CRITICAL'
    };
    
    // Store alert for admin dashboard
    const alertKey = `alerts:security`;
    const alerts = await this.redisCacheService.get<any[]>(alertKey) || [];
    alerts.push(alertData);
    
    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.shift();
    }
    
    await this.redisCacheService.set(alertKey, alerts, 604800000); // 7 days TTL
    
    this.logger.error(`🚨🚨 SECURITY ALERT: Player ${playerId} has ${eventCount} critical events in 1 hour!`, alertData);
    
    // TODO: Integration with notification system
    // await this.notificationService.sendSecurityAlert(alertData);
  }

  /**
   * 🛡️ Get player audit history
   */
  async getPlayerAuditHistory(playerId: string, limit: number = 50): Promise<SecurityEvent[]> {
    const key = `audit:player:${playerId}`;
    const events = await this.redisCacheService.get<SecurityEvent[]>(key) || [];
    
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 🛡️ Get audit statistics for admin dashboard
   */
  async getAuditStats(days: number = 7): Promise<AuditStats> {
    const stats: AuditStats = {
      totalEvents: 0,
      criticalEvents: 0,
      bannedPlayers: 0,
      topThreats: [],
      recentEvents: []
    };

    try {
      // Get stats for last N days
      const today = new Date();
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        promises.push(
          this.redisCacheService.get(`audit:counters:${dateStr}`)
        );
      }
      
      const dailyStats = await Promise.all(promises);
      
      // Aggregate stats
      for (const dayStat of dailyStats) {
        if (dayStat) {
          stats.totalEvents += dayStat.total || 0;
          stats.criticalEvents += dayStat.critical || 0;
        }
      }
      
      // Get recent events (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      const [yesterdayEvents, todayEvents] = await Promise.all([
        this.redisCacheService.get<SecurityEvent[]>(`audit:global:${yesterdayStr}`) || [],
        this.redisCacheService.get<SecurityEvent[]>(`audit:global:${todayStr}`) || []
      ]);
      
      const allRecentEvents = [...yesterdayEvents, ...todayEvents]
        .filter(event => event.timestamp > Date.now() - 86400000) // Last 24 hours
        .sort((a, b) => b.timestamp - a.timestamp);
      
      stats.recentEvents = allRecentEvents.slice(0, 100);
      
      // Calculate top threats (players with most critical events)
      const threatMap = new Map<string, number>();
      allRecentEvents
        .filter(event => event.severity === 'critical')
        .forEach(event => {
          threatMap.set(event.playerId, (threatMap.get(event.playerId) || 0) + 1);
        });
      
      stats.topThreats = Array.from(threatMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([playerId, count]) => `${playerId} (${count})`);
      
      return stats;
      
    } catch (error) {
      this.logger.error('❌ Failed to get audit stats:', error);
      return stats;
    }
  }

  /**
   * 🛡️ Get security alerts for admin dashboard
   */
  async getSecurityAlerts(limit: number = 20): Promise<any[]> {
    const alertKey = `alerts:security`;
    const alerts = await this.redisCacheService.get<any[]>(alertKey) || [];
    
    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 🛡️ Clear audit data for specific player (GDPR compliance)
   */
  async clearPlayerAuditData(playerId: string): Promise<void> {
    const keys = [
      `audit:player:${playerId}`,
      `audit:recent_critical:${playerId}`
    ];
    
    await Promise.all(keys.map(key => this.redisCacheService.delete(key)));
    
    this.logger.log(`🗑️ Cleared audit data for player: ${playerId}`);
  }
} 