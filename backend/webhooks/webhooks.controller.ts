import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WebhooksService } from "./webhooks.service";
import { CreateWebhookDto, UpdateWebhookDto } from "./dto/webhook.dto";

@ApiTags("webhooks")
@Controller("webhooks")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: "Get user webhooks" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiResponse({
    status: 200,
    description: "User webhooks retrieved successfully",
    schema: {
      type: "object",
      properties: {
        webhooks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              url: { type: "string" },
              events: { type: "array", items: { type: "string" } },
              isActive: { type: "boolean" },
              secret: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              lastTriggered: {
                type: "string",
                format: "date-time",
                nullable: true,
              },
            },
          },
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            pages: { type: "number" },
          },
        },
      },
    },
  })
  async getUserWebhooks(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.webhooksService.getUserWebhooks(req.user.userId, page, limit);
  }

  @Post()
  @ApiOperation({ summary: "Create a new webhook" })
  @ApiResponse({
    status: 201,
    description: "Webhook created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        url: { type: "string" },
        events: { type: "array", items: { type: "string" } },
        isActive: { type: "boolean" },
        secret: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid webhook data" })
  async createWebhook(
    @Request() req,
    @Body() createWebhookDto: CreateWebhookDto,
  ) {
    return this.webhooksService.createWebhook(
      req.user.userId,
      createWebhookDto,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get webhook by ID" })
  @ApiResponse({
    status: 200,
    description: "Webhook retrieved successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        url: { type: "string" },
        events: { type: "array", items: { type: "string" } },
        isActive: { type: "boolean" },
        secret: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        lastTriggered: { type: "string", format: "date-time", nullable: true },
        deliveries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              event: { type: "string" },
              status: { type: "string" },
              attempts: { type: "number" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async getWebhook(@Request() req, @Param("id") webhookId: string) {
    return this.webhooksService.getWebhook(webhookId, req.user.userId);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update webhook" })
  @ApiResponse({ status: 200, description: "Webhook updated successfully" })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async updateWebhook(
    @Request() req,
    @Param("id") webhookId: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ) {
    return this.webhooksService.updateWebhook(
      webhookId,
      req.user.userId,
      updateWebhookDto,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete webhook" })
  @ApiResponse({ status: 200, description: "Webhook deleted successfully" })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async deleteWebhook(@Request() req, @Param("id") webhookId: string) {
    return this.webhooksService.deleteWebhook(webhookId, req.user.userId);
  }

  @Get("events/available")
  @ApiOperation({ summary: "Get available webhook events" })
  @ApiResponse({
    status: 200,
    description: "Available events retrieved successfully",
    schema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
            },
          },
        },
      },
    },
  })
  async getAvailableEvents() {
    return this.webhooksService.getAvailableEvents();
  }

  @Post(":id/test")
  @ApiOperation({ summary: "Test webhook endpoint" })
  @ApiResponse({ status: 200, description: "Test webhook sent successfully" })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async testWebhook(@Request() req, @Param("id") webhookId: string) {
    return this.webhooksService.testWebhook(webhookId, req.user.userId);
  }
}
