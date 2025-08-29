import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

// Core Billing Services
import { BillingSyncService } from './billing-sync.service';
import { StripeMCPService } from './stripe-mcp.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { UsageAnalyticsService } from './usage-analytics.service';
import { ModernPatternsService } from './modern-patterns.service';
import { BillingTestAutomationService } from './billing-test-automation.service';

// Controllers
import { BillingController } from './billing.controller';
// import { WebhookController } from './webhook.controller';
// import { AnalyticsController } from './analytics.controller';

/**
 * BillingModule: Enterprise-Grade Billing Infrastructure
 * 
 * This module represents the culmination of N0DE's billing evolution:
 * - Real-time usage tracking and synchronization
 * - Deep Stripe MCP integration for payments
 * - Advanced analytics with pattern recognition
 * - Comprehensive webhook processing
 * - Context7 integration for modern patterns
 * - Automated E2E testing with browser MCPs
 * 
 * ARCHITECTURE PHILOSOPHY:
 * - MCP-first: Every external interaction goes through MCP servers
 * - Real-time: Usage tracking happens in milliseconds, not minutes
 * - Intelligent: Machine learning patterns guide pricing and optimization
 * - Secure: Every payment operation is verified and audited
 * - Observable: Complete visibility into billing operations
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core Infrastructure
    PrismaService,
    RedisService,
    
    // Real-Time Billing Engine
    BillingSyncService,
    
    // MCP-Integrated Services
    StripeMCPService,          // Deep Stripe integration via MCP
    ModernPatternsService,     // Context7 MCP for latest patterns
    BillingTestAutomationService, // Browser MCPs for E2E testing
    
    // Advanced Analytics
    UsageAnalyticsService,     // Pattern recognition and cost optimization
    
    // Event Processing
    WebhookProcessorService,   // Mission-critical webhook handling
  ],
  controllers: [
    BillingController,         // Main billing API endpoints
    // WebhookController,         // Stripe webhook processing
    // AnalyticsController,       // Usage analytics and insights
  ],
  exports: [
    BillingSyncService,        // Export for use in RPC modules
    StripeMCPService,          // Export for subscription management
    UsageAnalyticsService,     // Export for dashboard
    WebhookProcessorService,   // Export for webhook handling
  ],
})
export class BillingModule {}