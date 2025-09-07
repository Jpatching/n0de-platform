import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../common/prisma.service";
import { LoggerService } from "../common/logger.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreateApiKeyDto, UpdateApiKeyDto } from "./dto/api-keys.dto";

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto) {
    // Check subscription limits
    const canCreate = await this.subscriptionsService.checkApiKeyLimit(userId);
    if (!canCreate) {
      throw new BadRequestException(
        "API key limit reached for your subscription plan. Please upgrade to create more keys.",
      );
    }

    const { name, permissions = ["read"], rateLimit = 1000 } = createApiKeyDto;

    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);
    const keyPreview = apiKey.substring(0, 8) + "...";

    // Create API key in database
    const createdKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyPreview,
        permissions,
        rateLimit,
      },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        totalRequests: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log API key creation
    this.logger.log(
      {
        type: "api_key_created",
        userId,
        apiKeyId: createdKey.id,
        name,
        permissions,
      },
      "API_KEYS",
    );

    return {
      ...createdKey,
      key: apiKey, // Only return the full key on creation
    };
  }

  async getUserApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        totalRequests: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getApiKeyById(userId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        totalRequests: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    return apiKey;
  }

  async updateApiKey(
    userId: string,
    keyId: string,
    updateApiKeyDto: UpdateApiKeyDto,
  ) {
    const { name, permissions, rateLimit, isActive } = updateApiKeyDto;

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    const updatedKey = await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        totalRequests: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Note: API key cache cleared (Redis removed)

    // Log API key update
    this.logger.log(
      {
        type: "api_key_updated",
        userId,
        apiKeyId: keyId,
        changes: updateApiKeyDto,
      },
      "API_KEYS",
    );

    return updatedKey;
  }

  async deleteApiKey(userId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    // Note: API key cache cleared (Redis removed)

    // Log API key deletion
    this.logger.log(
      {
        type: "api_key_deleted",
        userId,
        apiKeyId: keyId,
        name: apiKey.name,
      },
      "API_KEYS",
    );

    return { message: "API key deleted successfully" };
  }

  async validateApiKey(apiKey: string): Promise<{
    userId: string;
    id: string;
    apiKeyId: string;
    permissions: string[];
    rateLimit: number;
    isValid: boolean;
  } | null> {
    if (!apiKey || !apiKey.startsWith("n0de_")) {
      return null;
    }

    // Direct database lookup (Redis cache removed)
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Find in database
    const keys = await this.prisma.apiKey.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        keyHash: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
      },
    });

    for (const key of keys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);
      if (isMatch) {
        // Check if expired
        if (key.expiresAt && key.expiresAt < new Date()) {
          return {
            userId: key.userId,
            id: key.id,
            apiKeyId: key.id,
            permissions: [],
            rateLimit: 0,
            isValid: false,
          };
        }

        const result = {
          userId: key.userId,
          id: key.id,
          apiKeyId: key.id,
          permissions: key.permissions,
          rateLimit: key.rateLimit,
          isValid: true,
        };

        // Note: Result cached (Redis removed)

        // Update last used
        await this.prisma.apiKey.update({
          where: { id: key.id },
          data: {
            lastUsedAt: new Date(),
            totalRequests: { increment: 1 },
          },
        });

        return result;
      }
    }

    return null;
  }

  private generateApiKey(): string {
    const prefix = "n0de_";
    const environment =
      process.env.NODE_ENV === "production" ? "live_" : "test_";
    const randomBytes = crypto.randomBytes(32).toString("hex");
    return `${prefix}${environment}${randomBytes}`;
  }
}
