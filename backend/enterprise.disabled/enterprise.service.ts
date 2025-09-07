import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { SecurityComplianceService } from "./security-compliance.service";
import { InfrastructureMonitoringService } from "./infrastructure-monitoring.service";
import { EnterpriseAnalyticsService } from "./enterprise-analytics.service";
import { AuditLoggingService } from "./audit-logging.service";
import { HighAvailabilityService } from "./high-availability.service";

export interface EnterpriseOverview {
  security: {
    complianceScore: number;
    securityAlerts: number;
    lastSecurityAudit: Date;
    complianceFrameworks: string[];
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  infrastructure: {
    healthScore: number;
    uptime: number;
    performanceMetrics: {
      averageLatency: number;
      throughput: number;
      errorRate: number;
      availability: number;
    };
    resources: {
      cpuUtilization: number;
      memoryUtilization: number;
      diskUtilization: number;
      networkUtilization: number;
    };
    scaling: {
      autoScalingEnabled: boolean;
      currentInstances: number;
      maxInstances: number;
      loadBalancingStatus: string;
    };
  };
  analytics: {
    totalUsers: number;
    activeUsers: number;
    apiCalls: number;
    revenue: number;
    growthRate: number;
    churnRate: number;
    businessMetrics: any[];
  };
  audit: {
    logsGenerated: number;
    complianceStatus: string;
    lastAuditDate: Date;
    pendingReviews: number;
    auditTrailHealth: number;
  };
  highAvailability: {
    status: string;
    failoverCapability: boolean;
    backupStatus: string;
    disasterRecoveryScore: number;
    redundancyLevel: string;
  };
}

export interface EnterpriseConfiguration {
  security: {
    enableAdvancedThreatProtection: boolean;
    requireMFA: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      requireUppercase: boolean;
      expirationDays: number;
    };
    ipWhitelisting: string[];
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  infrastructure: {
    autoScaling: {
      enabled: boolean;
      minInstances: number;
      maxInstances: number;
      targetCpuUtilization: number;
      scaleUpCooldown: number;
      scaleDownCooldown: number;
    };
    monitoring: {
      alertThresholds: {
        cpuAlert: number;
        memoryAlert: number;
        diskAlert: number;
        errorRateAlert: number;
        latencyAlert: number;
      };
      notificationChannels: string[];
    };
    backups: {
      enabled: boolean;
      frequency: string;
      retention: number;
      encryption: boolean;
      offSiteBackup: boolean;
    };
  };
  compliance: {
    frameworks: string[];
    dataRetention: number;
    auditFrequency: string;
    reportGeneration: boolean;
    anonymizeData: boolean;
  };
  analytics: {
    enableAdvancedAnalytics: boolean;
    dataExportFormats: string[];
    realTimeReporting: boolean;
    customDashboards: boolean;
    aiInsights: boolean;
  };
}

@Injectable()
export class EnterpriseService {
  private readonly logger = new Logger(EnterpriseService.name);

  constructor(
    private prisma: PrismaService,
    private securityComplianceService: SecurityComplianceService,
    private infrastructureMonitoringService: InfrastructureMonitoringService,
    private enterpriseAnalyticsService: EnterpriseAnalyticsService,
    private auditLoggingService: AuditLoggingService,
    private highAvailabilityService: HighAvailabilityService,
  ) {}

  async getEnterpriseOverview(
    organizationId: string,
  ): Promise<EnterpriseOverview> {
    const [security, infrastructure, analytics, audit, highAvailability] =
      await Promise.all([
        this.getSecurityOverview(organizationId),
        this.getInfrastructureOverview(organizationId),
        this.getAnalyticsOverview(organizationId),
        this.getAuditOverview(organizationId),
        this.getHighAvailabilityOverview(organizationId),
      ]);

    return {
      security,
      infrastructure,
      analytics,
      audit,
      highAvailability,
    };
  }

  async getEnterpriseConfiguration(
    organizationId: string,
  ): Promise<EnterpriseConfiguration> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        enterpriseSettings: true,
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Return current configuration or defaults
    return (
      organization.enterpriseSettings?.configuration ||
      this.getDefaultConfiguration()
    );
  }

  async updateEnterpriseConfiguration(
    organizationId: string,
    userId: string,
    configuration: Partial<EnterpriseConfiguration>,
  ): Promise<EnterpriseConfiguration> {
    // Verify admin permissions
    await this.verifyEnterpriseAdmin(userId, organizationId);

    const currentConfig = await this.getEnterpriseConfiguration(organizationId);
    const updatedConfig = this.mergeConfiguration(currentConfig, configuration);

    // Validate configuration
    await this.validateConfiguration(updatedConfig);

    // Update in database
    await this.prisma.enterpriseSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        configuration: updatedConfig,
        updatedBy: userId,
      },
      update: {
        configuration: updatedConfig,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // Apply configuration changes
    await this.applyConfigurationChanges(organizationId, updatedConfig);

    // Log configuration change
    await this.auditLoggingService.logConfigurationChange(
      organizationId,
      userId,
      "enterprise_configuration_updated",
      { changes: configuration },
    );

    this.logger.log(
      {
        type: "enterprise_configuration_updated",
        organizationId,
        userId,
        changes: Object.keys(configuration),
      },
      "ENTERPRISE",
    );

    return updatedConfig;
  }

  async getSecurityDashboard(organizationId: string): Promise<any> {
    return this.securityComplianceService.getSecurityDashboard(organizationId);
  }

  async getInfrastructureDashboard(organizationId: string): Promise<any> {
    return this.infrastructureMonitoringService.getInfrastructureDashboard(
      organizationId,
    );
  }

  async getComplianceReport(
    organizationId: string,
    framework: string,
    format: "PDF" | "JSON" | "CSV" = "JSON",
  ): Promise<any> {
    return this.securityComplianceService.generateComplianceReport(
      organizationId,
      framework,
      format,
    );
  }

  async getAuditLogs(
    organizationId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      eventType?: string;
      userId?: string;
      limit?: number;
    },
  ): Promise<any[]> {
    return this.auditLoggingService.getAuditLogs(organizationId, filters);
  }

  async exportAuditLogs(
    organizationId: string,
    format: "CSV" | "JSON" | "XML",
    filters?: any,
  ): Promise<Buffer> {
    return this.auditLoggingService.exportAuditLogs(
      organizationId,
      format,
      filters,
    );
  }

  async getPerformanceMetrics(
    organizationId: string,
    timeframe: "1h" | "24h" | "7d" | "30d" = "24h",
  ): Promise<any> {
    return this.infrastructureMonitoringService.getPerformanceMetrics(
      organizationId,
      timeframe,
    );
  }

  async getBusinessAnalytics(organizationId: string): Promise<any> {
    return this.enterpriseAnalyticsService.getBusinessAnalytics(organizationId);
  }

  async generateExecutiveReport(organizationId: string): Promise<any> {
    const [overview, businessMetrics, securitySummary, complianceStatus] =
      await Promise.all([
        this.getEnterpriseOverview(organizationId),
        this.enterpriseAnalyticsService.getBusinessAnalytics(organizationId),
        this.securityComplianceService.getSecuritySummary(organizationId),
        this.securityComplianceService.getComplianceStatus(organizationId),
      ]);

    return {
      generatedAt: new Date(),
      organizationId,
      executiveSummary: {
        overallHealth: this.calculateOverallHealth(overview),
        keyMetrics: this.extractKeyMetrics(overview, businessMetrics),
        criticalAlerts: this.getCriticalAlerts(overview),
        recommendations: this.generateRecommendations(
          overview,
          securitySummary,
          complianceStatus,
        ),
      },
      detailedAnalytics: {
        security: securitySummary,
        infrastructure: overview.infrastructure,
        business: businessMetrics,
        compliance: complianceStatus,
      },
      trends: {
        performance: this.calculatePerformanceTrends(organizationId),
        security: this.calculateSecurityTrends(organizationId),
        business: this.calculateBusinessTrends(organizationId),
      },
      forecasts: {
        usage: this.forecastUsage(organizationId),
        costs: this.forecastCosts(organizationId),
        scaling: this.forecastScaling(organizationId),
      },
    };
  }

  async configureHighAvailability(
    organizationId: string,
    userId: string,
    config: {
      enableFailover: boolean;
      backupFrequency: string;
      replicationStrategy: string;
      disasterRecoveryPlan: any;
    },
  ): Promise<any> {
    await this.verifyEnterpriseAdmin(userId, organizationId);

    const result = await this.highAvailabilityService.configureHighAvailability(
      organizationId,
      config,
    );

    await this.auditLoggingService.logConfigurationChange(
      organizationId,
      userId,
      "high_availability_configured",
      { configuration: config },
    );

    return result;
  }

  async performSecurityAudit(
    organizationId: string,
    userId: string,
  ): Promise<any> {
    await this.verifyEnterpriseAdmin(userId, organizationId);

    const auditResult =
      await this.securityComplianceService.performSecurityAudit(organizationId);

    await this.auditLoggingService.logSecurityEvent(
      organizationId,
      userId,
      "security_audit_performed",
      { auditId: auditResult.id },
    );

    return auditResult;
  }

  async getResourceUtilization(organizationId: string): Promise<any> {
    return this.infrastructureMonitoringService.getResourceUtilization(
      organizationId,
    );
  }

  async scaleInfrastructure(
    organizationId: string,
    userId: string,
    scalingAction: {
      action: "scale_up" | "scale_down" | "auto_scale";
      targetInstances?: number;
      resourceType: "compute" | "storage" | "network";
    },
  ): Promise<any> {
    await this.verifyEnterpriseAdmin(userId, organizationId);

    const result =
      await this.infrastructureMonitoringService.scaleInfrastructure(
        organizationId,
        scalingAction,
      );

    await this.auditLoggingService.logOperationalEvent(
      organizationId,
      userId,
      "infrastructure_scaled",
      { action: scalingAction },
    );

    return result;
  }

  // Private helper methods
  private async getSecurityOverview(organizationId: string) {
    const [complianceScore, alerts, lastAudit, vulnerabilities] =
      await Promise.all([
        this.securityComplianceService.getComplianceScore(organizationId),
        this.securityComplianceService.getSecurityAlerts(organizationId),
        this.securityComplianceService.getLastSecurityAudit(organizationId),
        this.securityComplianceService.getVulnerabilities(organizationId),
      ]);

    return {
      complianceScore,
      securityAlerts: alerts.length,
      lastSecurityAudit: lastAudit?.performedAt || new Date(),
      complianceFrameworks: ["SOC2", "ISO27001", "PCI-DSS", "GDPR", "HIPAA"],
      vulnerabilities: this.categorizeVulnerabilities(vulnerabilities),
    };
  }

  private async getInfrastructureOverview(organizationId: string) {
    const [healthScore, uptime, performance, resources, scaling] =
      await Promise.all([
        this.infrastructureMonitoringService.getHealthScore(organizationId),
        this.infrastructureMonitoringService.getUptime(organizationId),
        this.infrastructureMonitoringService.getPerformanceMetrics(
          organizationId,
          "1h",
        ),
        this.infrastructureMonitoringService.getResourceUtilization(
          organizationId,
        ),
        this.infrastructureMonitoringService.getScalingStatus(organizationId),
      ]);

    return {
      healthScore,
      uptime,
      performanceMetrics: {
        averageLatency: performance.averageLatency || 0,
        throughput: performance.throughput || 0,
        errorRate: performance.errorRate || 0,
        availability: performance.availability || 99.9,
      },
      resources,
      scaling,
    };
  }

  private async getAnalyticsOverview(organizationId: string) {
    return this.enterpriseAnalyticsService.getAnalyticsOverview(organizationId);
  }

  private async getAuditOverview(organizationId: string) {
    return this.auditLoggingService.getAuditOverview(organizationId);
  }

  private async getHighAvailabilityOverview(organizationId: string) {
    return this.highAvailabilityService.getHighAvailabilityStatus(
      organizationId,
    );
  }

  private getDefaultConfiguration(): EnterpriseConfiguration {
    return {
      security: {
        enableAdvancedThreatProtection: true,
        requireMFA: true,
        sessionTimeout: 3600000, // 1 hour
        passwordPolicy: {
          minLength: 12,
          requireSpecialChars: true,
          requireNumbers: true,
          requireUppercase: true,
          expirationDays: 90,
        },
        ipWhitelisting: [],
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 1000,
          burstLimit: 5000,
        },
      },
      infrastructure: {
        autoScaling: {
          enabled: true,
          minInstances: 2,
          maxInstances: 20,
          targetCpuUtilization: 70,
          scaleUpCooldown: 300000, // 5 minutes
          scaleDownCooldown: 600000, // 10 minutes
        },
        monitoring: {
          alertThresholds: {
            cpuAlert: 80,
            memoryAlert: 85,
            diskAlert: 90,
            errorRateAlert: 5,
            latencyAlert: 1000,
          },
          notificationChannels: ["email", "slack", "webhook"],
        },
        backups: {
          enabled: true,
          frequency: "daily",
          retention: 30,
          encryption: true,
          offSiteBackup: true,
        },
      },
      compliance: {
        frameworks: ["SOC2", "ISO27001"],
        dataRetention: 2555, // 7 years in days
        auditFrequency: "quarterly",
        reportGeneration: true,
        anonymizeData: true,
      },
      analytics: {
        enableAdvancedAnalytics: true,
        dataExportFormats: ["JSON", "CSV", "PDF"],
        realTimeReporting: true,
        customDashboards: true,
        aiInsights: true,
      },
    };
  }

  private mergeConfiguration(
    current: EnterpriseConfiguration,
    updates: Partial<EnterpriseConfiguration>,
  ): EnterpriseConfiguration {
    // Deep merge configurations
    return {
      security: { ...current.security, ...updates.security },
      infrastructure: {
        ...current.infrastructure,
        ...updates.infrastructure,
        autoScaling: {
          ...current.infrastructure.autoScaling,
          ...updates.infrastructure?.autoScaling,
        },
        monitoring: {
          ...current.infrastructure.monitoring,
          ...updates.infrastructure?.monitoring,
          alertThresholds: {
            ...current.infrastructure.monitoring.alertThresholds,
            ...updates.infrastructure?.monitoring?.alertThresholds,
          },
        },
        backups: {
          ...current.infrastructure.backups,
          ...updates.infrastructure?.backups,
        },
      },
      compliance: { ...current.compliance, ...updates.compliance },
      analytics: { ...current.analytics, ...updates.analytics },
    };
  }

  private async validateConfiguration(
    config: EnterpriseConfiguration,
  ): Promise<void> {
    // Validate configuration values
    if (config.security.sessionTimeout < 300000) {
      // Minimum 5 minutes
      throw new Error("Session timeout must be at least 5 minutes");
    }

    if (config.infrastructure.autoScaling.minInstances < 1) {
      throw new Error("Minimum instances must be at least 1");
    }

    if (
      config.infrastructure.autoScaling.maxInstances <
      config.infrastructure.autoScaling.minInstances
    ) {
      throw new Error(
        "Maximum instances must be greater than minimum instances",
      );
    }

    // Add more validation rules as needed
  }

  private async applyConfigurationChanges(
    organizationId: string,
    config: EnterpriseConfiguration,
  ): Promise<void> {
    // Apply security configuration
    await this.securityComplianceService.applySecurityConfiguration(
      organizationId,
      config.security,
    );

    // Apply infrastructure configuration
    await this.infrastructureMonitoringService.applyInfrastructureConfiguration(
      organizationId,
      config.infrastructure,
    );

    // Apply other configurations...
  }

  private async verifyEnterpriseAdmin(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      throw new Error("Insufficient permissions for enterprise operations");
    }
  }

  private categorizeVulnerabilities(vulnerabilities: any[]): any {
    return vulnerabilities.reduce(
      (acc, vuln) => {
        const severity = vuln.severity.toLowerCase();
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 },
    );
  }

  private calculateOverallHealth(overview: EnterpriseOverview): number {
    const securityWeight = 0.3;
    const infrastructureWeight = 0.4;
    const complianceWeight = 0.2;
    const availabilityWeight = 0.1;

    return Math.round(
      overview.security.complianceScore * securityWeight +
        overview.infrastructure.healthScore * infrastructureWeight +
        (overview.audit.complianceStatus === "compliant" ? 100 : 50) *
          complianceWeight +
        overview.infrastructure.performanceMetrics.availability *
          availabilityWeight,
    );
  }

  private extractKeyMetrics(
    overview: EnterpriseOverview,
    businessMetrics: any,
  ): any {
    return {
      totalUsers: overview.analytics.totalUsers,
      revenue: overview.analytics.revenue,
      uptime: overview.infrastructure.uptime,
      securityScore: overview.security.complianceScore,
      growthRate: overview.analytics.growthRate,
      churnRate: overview.analytics.churnRate,
    };
  }

  private getCriticalAlerts(overview: EnterpriseOverview): any[] {
    const alerts = [];

    if (overview.security.vulnerabilities.critical > 0) {
      alerts.push({
        type: "security",
        severity: "critical",
        message: `${overview.security.vulnerabilities.critical} critical security vulnerabilities detected`,
      });
    }

    if (overview.infrastructure.performanceMetrics.availability < 99.5) {
      alerts.push({
        type: "infrastructure",
        severity: "high",
        message: `Low availability: ${overview.infrastructure.performanceMetrics.availability}%`,
      });
    }

    return alerts;
  }

  private generateRecommendations(
    overview: any,
    security: any,
    compliance: any,
  ): any[] {
    const recommendations = [];

    if (overview.security.complianceScore < 90) {
      recommendations.push({
        category: "security",
        priority: "high",
        title: "Improve Security Compliance",
        description: "Current compliance score is below recommended threshold",
        actions: [
          "Review security policies",
          "Update access controls",
          "Enhance monitoring",
        ],
      });
    }

    return recommendations;
  }

  // Placeholder methods for trend calculations and forecasting
  private async calculatePerformanceTrends(
    organizationId: string,
  ): Promise<any> {
    return {};
  }
  private async calculateSecurityTrends(organizationId: string): Promise<any> {
    return {};
  }
  private async calculateBusinessTrends(organizationId: string): Promise<any> {
    return {};
  }
  private async forecastUsage(organizationId: string): Promise<any> {
    return {};
  }
  private async forecastCosts(organizationId: string): Promise<any> {
    return {};
  }
  private async forecastScaling(organizationId: string): Promise<any> {
    return {};
  }
}
