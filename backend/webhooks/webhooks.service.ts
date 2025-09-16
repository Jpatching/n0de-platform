import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { CreateWebhookDto, UpdateWebhookDto } from "./dto/webhook.dto";
import { Logger } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async getUserWebhooks(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [webhooks, total] = await Promise.all([
        this.prisma.webhook.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            url: true,
            events: true,
            isActive: true,
            secret: true,
            createdAt: true,
            lastTriggered: true,
            _count: {
              select: { deliveries: true },
            },
          },
        }),
        this.prisma.webhook.count({ where: { userId } }),
      ]);

      return {
        webhooks: webhooks.map((webhook) => ({
          ...webhook,
          totalDeliveries: webhook._count.deliveries,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get webhooks for user ${userId}:`, error);
      throw error;
    }
  }

  async createWebhook(userId: string, createWebhookDto: CreateWebhookDto) {
    try {
      // Generate a secure secret for webhook verification
      const secret = crypto.randomBytes(32).toString("hex");

      const webhook = await this.prisma.webhook.create({
        data: {
          userId,
          url: createWebhookDto.url,
          events: createWebhookDto.events,
          isActive: true,
          secret,
        },
      });

      return {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        secret: webhook.secret,
        createdAt: webhook.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create webhook for user ${userId}:`, error);
      throw error;
    }
  }

  async getWebhook(webhookId: string, userId: string) {
    try {
      const webhook = await this.prisma.webhook.findFirst({
        where: { id: webhookId, userId },
        include: {
          deliveries: {
            orderBy: { createdAt: "desc" },
            take: 10, // Last 10 deliveries
            select: {
              id: true,
              event: true,
              status: true,
              attempts: true,
              createdAt: true,
            },
          },
        },
      });

      if (!webhook) {
        throw new NotFoundException("Webhook not found");
      }

      return webhook;
    } catch (error) {
      this.logger.error(
        `Failed to get webhook ${webhookId} for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateWebhook(
    webhookId: string,
    userId: string,
    updateWebhookDto: UpdateWebhookDto,
  ) {
    try {
      const webhook = await this.prisma.webhook.findFirst({
        where: { id: webhookId, userId },
      });

      if (!webhook) {
        throw new NotFoundException("Webhook not found");
      }

      const updatedWebhook = await this.prisma.webhook.update({
        where: { id: webhookId },
        data: {
          ...updateWebhookDto,
          updatedAt: new Date(),
        },
      });

      return updatedWebhook;
    } catch (error) {
      this.logger.error(
        `Failed to update webhook ${webhookId} for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteWebhook(webhookId: string, userId: string) {
    try {
      const webhook = await this.prisma.webhook.findFirst({
        where: { id: webhookId, userId },
      });

      if (!webhook) {
        throw new NotFoundException("Webhook not found");
      }

      await this.prisma.webhook.delete({
        where: { id: webhookId },
      });

      return { message: "Webhook deleted successfully" };
    } catch (error) {
      this.logger.error(
        `Failed to delete webhook ${webhookId} for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getAvailableEvents() {
    // Define available webhook events for N0DE platform
    return {
      events: [
        {
          name: "api_key.created",
          description: "Triggered when a new API key is created",
          category: "API Keys",
        },
        {
          name: "api_key.deleted",
          description: "Triggered when an API key is deleted",
          category: "API Keys",
        },
        {
          name: "usage.limit_reached",
          description: "Triggered when usage limit is reached",
          category: "Usage",
        },
        {
          name: "usage.overage",
          description: "Triggered when usage exceeds plan limits",
          category: "Usage",
        },
        {
          name: "subscription.created",
          description: "Triggered when a subscription is created",
          category: "Billing",
        },
        {
          name: "subscription.updated",
          description: "Triggered when a subscription is updated",
          category: "Billing",
        },
        {
          name: "subscription.cancelled",
          description: "Triggered when a subscription is cancelled",
          category: "Billing",
        },
        {
          name: "payment.succeeded",
          description: "Triggered when a payment is successful",
          category: "Billing",
        },
        {
          name: "payment.failed",
          description: "Triggered when a payment fails",
          category: "Billing",
        },
        {
          name: "rpc.error",
          description: "Triggered when RPC errors occur",
          category: "RPC",
        },
      ],
    };
  }

  async testWebhook(webhookId: string, userId: string) {
    try {
      const webhook = await this.prisma.webhook.findFirst({
        where: { id: webhookId, userId },
      });

      if (!webhook) {
        throw new NotFoundException("Webhook not found");
      }

      // Create a test delivery record
      const testPayload = {
        event: "webhook.test",
        data: {
          message: "This is a test webhook from N0DE platform",
          timestamp: new Date().toISOString(),
          webhook_id: webhookId,
        },
      };

      // In a real implementation, you would send the actual HTTP request here
      // For now, we'll just create a delivery record
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event: "webhook.test",
          payload: testPayload,
          status: "PENDING",
          attempts: 0,
        },
      });

      return {
        message: "Test webhook queued for delivery",
        payload: testPayload,
      };
    } catch (error) {
      this.logger.error(
        `Failed to test webhook ${webhookId} for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
