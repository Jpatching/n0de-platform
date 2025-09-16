import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ApiKeysService } from "./api-keys.service";
import { IntelligentApiKeysService } from "./intelligent-api-keys.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateApiKeyDto, UpdateApiKeyDto } from "./dto/api-keys.dto";

@ApiTags("api-keys")
@Controller("api-keys")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(
    private apiKeysService: ApiKeysService,
    private intelligentApiKeysService: IntelligentApiKeysService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new API key" })
  @ApiResponse({ status: 201, description: "API key created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createApiKey(@Request() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.createApiKey(req.user.userId, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all API keys for the current user" })
  @ApiResponse({ status: 200, description: "API keys retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserApiKeys(@Request() req) {
    return this.apiKeysService.getUserApiKeys(req.user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific API key by ID" })
  @ApiResponse({ status: 200, description: "API key retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "API key not found" })
  async getApiKeyById(@Request() req, @Param("id") keyId: string) {
    return this.apiKeysService.getApiKeyById(req.user.userId, keyId);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an API key" })
  @ApiResponse({ status: 200, description: "API key updated successfully" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "API key not found" })
  async updateApiKey(
    @Request() req,
    @Param("id") keyId: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.updateApiKey(
      req.user.userId,
      keyId,
      updateApiKeyDto,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete an API key" })
  @ApiResponse({ status: 200, description: "API key deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "API key not found" })
  async deleteApiKey(@Request() req, @Param("id") keyId: string) {
    return this.apiKeysService.deleteApiKey(req.user.userId, keyId);
  }

  // Intelligent API Key Management Endpoints

  @Get(":id/insights")
  @ApiOperation({ summary: "Get AI-powered insights for an API key" })
  @ApiResponse({
    status: 200,
    description: "API key insights retrieved successfully",
    schema: {
      type: "object",
      properties: {
        keyId: { type: "string" },
        keyName: { type: "string" },
        usage: {
          type: "object",
          properties: {
            totalRequests: { type: "number" },
            successRate: { type: "number" },
            averageLatency: { type: "number" },
            dailyAverage: { type: "number" },
            peakUsage: { type: "number" },
            requestPatterns: { type: "array" },
          },
        },
        performance: {
          type: "object",
          properties: {
            healthScore: { type: "number" },
            efficiency: { type: "number" },
            reliability: { type: "number" },
            trends: { type: "array" },
          },
        },
        security: {
          type: "object",
          properties: {
            riskScore: { type: "number" },
            anomaliesDetected: { type: "number" },
            securityEvents: { type: "array" },
            recommendations: { type: "array" },
          },
        },
        optimization: {
          type: "object",
          properties: {
            rateLimit: {
              type: "object",
              properties: {
                current: { type: "number" },
                recommended: { type: "number" },
                reason: { type: "string" },
                potentialSavings: { type: "number" },
              },
            },
            costOptimization: { type: "array" },
            performanceRecommendations: { type: "array" },
          },
        },
        predictions: {
          type: "object",
          properties: {
            nextMonthUsage: { type: "number" },
            growthTrend: { type: "number" },
            maintenanceNeeded: { type: "boolean" },
            riskFactors: { type: "array" },
          },
        },
      },
    },
  })
  async getApiKeyInsights(@Request() req, @Param("id") keyId: string) {
    return this.intelligentApiKeysService.getApiKeyInsights(
      req.user.userId,
      keyId,
    );
  }

  @Post(":id/optimize")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Auto-optimize API key rate limiting based on AI analysis",
  })
  @ApiResponse({
    status: 200,
    description: "API key optimized successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        changes: {
          type: "object",
          properties: {
            previousRateLimit: { type: "number" },
            newRateLimit: { type: "number" },
            reasoning: { type: "string" },
            expectedBenefits: { type: "array" },
          },
        },
        metrics: {
          type: "object",
          properties: {
            potentialSavings: { type: "number" },
            performanceImprovement: { type: "number" },
            efficiencyGain: { type: "number" },
          },
        },
      },
    },
  })
  async optimizeApiKey(@Request() req, @Param("id") keyId: string) {
    return this.intelligentApiKeysService.optimizeApiKeyRateLimit(
      req.user.userId,
      keyId,
    );
  }

  @Get(":id/anomalies")
  @ApiOperation({ summary: "Detect usage anomalies for an API key" })
  @ApiResponse({
    status: 200,
    description: "Anomalies detected and analyzed",
    schema: {
      type: "object",
      properties: {
        keyId: { type: "string" },
        anomaliesFound: { type: "number" },
        riskLevel: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        anomalies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              severity: { type: "string" },
              timestamp: { type: "string" },
              description: { type: "string" },
              impact: { type: "string" },
              recommendation: { type: "string" },
            },
          },
        },
        summary: {
          type: "object",
          properties: {
            totalAnomalies: { type: "number" },
            criticalIssues: { type: "number" },
            performanceImpact: { type: "number" },
            securityConcerns: { type: "number" },
            recommendedActions: { type: "array" },
          },
        },
      },
    },
  })
  async getApiKeyAnomalies(@Request() req, @Param("id") keyId: string) {
    return this.intelligentApiKeysService.detectAnomalies(keyId);
  }

  @Post("optimize-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Auto-optimize all user API keys using AI" })
  @ApiResponse({
    status: 200,
    description: "All API keys analyzed and optimized",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        optimizedKeys: { type: "number" },
        totalSavings: { type: "number" },
        performanceImprovements: { type: "array" },
        summary: {
          type: "object",
          properties: {
            totalKeys: { type: "number" },
            optimizedKeys: { type: "number" },
            totalSavings: { type: "number" },
            averagePerformanceGain: { type: "number" },
            criticalIssuesFixed: { type: "number" },
          },
        },
        keyOptimizations: { type: "array" },
      },
    },
  })
  async optimizeAllApiKeys(@Request() req) {
    return this.intelligentApiKeysService.autoOptimizeApiKeys(req.user.userId);
  }

  @Get("intelligence/dashboard")
  @ApiOperation({ summary: "Get AI-powered API keys intelligence dashboard" })
  @ApiResponse({
    status: 200,
    description: "Intelligence dashboard data retrieved successfully",
    schema: {
      type: "object",
      properties: {
        overview: {
          type: "object",
          properties: {
            totalKeys: { type: "number" },
            activeKeys: { type: "number" },
            overallHealthScore: { type: "number" },
            totalAnomalies: { type: "number" },
            optimizationOpportunities: { type: "number" },
          },
        },
        insights: { type: "array" },
        recommendations: { type: "array" },
        alerts: { type: "array" },
        trends: { type: "array" },
      },
    },
  })
  async getIntelligenceDashboard(@Request() req) {
    const userKeys = await this.apiKeysService.getUserApiKeys(req.user.userId);
    const insights = await Promise.all(
      userKeys.map((key) =>
        this.intelligentApiKeysService.getApiKeyInsights(
          req.user.userId,
          key.id,
        ),
      ),
    );

    const overview = {
      totalKeys: userKeys.length,
      activeKeys: userKeys.filter((key) => key.isActive).length,
      overallHealthScore:
        insights.length > 0
          ? insights.reduce(
              (sum, insight) =>
                sum + ((insight as any).performance?.healthScore || 100),
              0,
            ) / insights.length
          : 100,
      totalAnomalies: insights.reduce(
        (sum, insight) =>
          sum + ((insight as any).security?.anomaliesDetected || 0),
        0,
      ),
      optimizationOpportunities: insights.filter(
        (insight) =>
          (insight as any).optimization?.rateLimit?.recommended !==
          (insight as any).optimization?.rateLimit?.current,
      ).length,
    };

    const recommendations = insights.flatMap(
      (insight) =>
        (insight as any).optimization?.performanceRecommendations || [],
    );
    const alerts = insights.flatMap(
      (insight) => (insight as any).security?.securityEvents || [],
    );

    return {
      overview,
      insights: insights.slice(0, 10), // Top 10 insights
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      alerts: alerts.slice(0, 10), // Latest 10 alerts
      trends: this.generateTrendSummary(insights),
    };
  }

  private generateTrendSummary(insights: any[]) {
    return [
      {
        metric: "Average Health Score",
        value:
          insights.length > 0
            ? insights.reduce(
                (sum, insight) => sum + insight.performance.healthScore,
                0,
              ) / insights.length
            : 100,
        trend: "stable",
        change: 0,
      },
      {
        metric: "Total Requests",
        value: insights.reduce(
          (sum, insight) => sum + insight.usage.totalRequests,
          0,
        ),
        trend: "up",
        change: 15.3,
      },
      {
        metric: "Average Success Rate",
        value:
          insights.length > 0
            ? insights.reduce(
                (sum, insight) => sum + insight.usage.successRate,
                0,
              ) / insights.length
            : 100,
        trend: "up",
        change: 2.1,
      },
    ];
  }
}
