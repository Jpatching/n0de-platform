import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface SharedResource {
  id: string;
  resourceType: 'API_KEY' | 'USAGE_DATA' | 'DASHBOARD' | 'ANALYTICS' | 'BILLING_DATA';
  resourceId: string;
  ownerId: string;
  targetType: 'USER' | 'TEAM' | 'WORKSPACE';
  targetId: string;
  permissions: string[];
  expiresAt?: Date;
  isActive: boolean;
  accessCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareResourceDto {
  resourceType: 'API_KEY' | 'USAGE_DATA' | 'DASHBOARD' | 'ANALYTICS' | 'BILLING_DATA';
  resourceId: string;
  ownerId: string;
  targetType: 'USER' | 'TEAM' | 'WORKSPACE';
  targetId: string;
  permissions: string[];
  expiresAt?: Date;
  settings?: {
    allowDownload?: boolean;
    allowExport?: boolean;
    watermark?: boolean;
    trackAccess?: boolean;
    notifyOwner?: boolean;
  };
}

export interface AccessLog {
  id: string;
  sharedResourceId: string;
  accessedBy: string;
  accessType: 'VIEW' | 'DOWNLOAD' | 'EXPORT' | 'MODIFY';
  ipAddress?: string;
  userAgent?: string;
  accessedAt: Date;
  duration?: number;
  metadata?: any;
}

@Injectable()
export class SharedResourcesService {
  private readonly logger = new Logger(SharedResourcesService.name);

  constructor(private prisma: PrismaService) {}

  async shareResource(shareResourceDto: ShareResourceDto): Promise<SharedResource> {
    const {
      resourceType,
      resourceId,
      ownerId,
      targetType,
      targetId,
      permissions,
      expiresAt,
      settings = {},
    } = shareResourceDto;

    // Verify resource ownership
    await this.verifyResourceOwnership(resourceType, resourceId, ownerId);

    // Check if already shared with same target
    const existingShare = await this.prisma.sharedResource.findFirst({
      where: {
        resourceType,
        resourceId,
        targetType,
        targetId,
        isActive: true,
      },
    });

    if (existingShare) {
      // Update existing share
      const updatedShare = await this.prisma.sharedResource.update({
        where: { id: existingShare.id },
        data: {
          permissions,
          expiresAt,
          settings,
          updatedAt: new Date(),
        },
      });

      this.logger.log({
        type: 'resource_share_updated',
        shareId: updatedShare.id,
        resourceType,
        resourceId,
        ownerId,
        targetType,
        targetId,
      }, 'SHARED_RESOURCES');

      return updatedShare;
    }

    // Create new share
    const sharedResource = await this.prisma.sharedResource.create({
      data: {
        resourceType,
        resourceId,
        ownerId,
        targetType,
        targetId,
        permissions,
        expiresAt,
        settings,
        isActive: true,
        accessCount: 0,
      },
    });

    // Send notification if enabled
    if (settings.notifyOwner !== false) {
      await this.sendShareNotification(sharedResource);
    }

    // Log activity
    this.logger.log({
      type: 'resource_shared',
      shareId: sharedResource.id,
      resourceType,
      resourceId,
      ownerId,
      targetType,
      targetId,
      permissions,
    }, 'SHARED_RESOURCES');

    return sharedResource;
  }

  async getSharedResourcesForUser(
    userId: string,
    resourceType?: string,
  ): Promise<SharedResource[]> {
    const whereClause: any = {
      isActive: true,
      OR: [
        // Resources shared directly with user
        { targetType: 'USER', targetId: userId },
        // Resources shared with user's teams
        {
          targetType: 'TEAM',
          targetId: {
            in: await this.getUserTeamIds(userId),
          },
        },
        // Resources shared with user's workspaces
        {
          targetType: 'WORKSPACE',
          targetId: {
            in: await this.getUserWorkspaceIds(userId),
          },
        },
      ],
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (resourceType) {
      whereClause.resourceType = resourceType;
    }

    const sharedResources = await this.prisma.sharedResource.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sharedResources;
  }

  async getSharedResourcesOwned(
    ownerId: string,
    resourceType?: string,
  ): Promise<SharedResource[]> {
    const whereClause: any = {
      ownerId,
      isActive: true,
    };

    if (resourceType) {
      whereClause.resourceType = resourceType;
    }

    return await this.prisma.sharedResource.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accessSharedResource(
    shareId: string,
    userId: string,
    accessType: 'VIEW' | 'DOWNLOAD' | 'EXPORT' | 'MODIFY',
    metadata?: any,
  ): Promise<{
    success: boolean;
    resourceData?: any;
    message?: string;
  }> {
    const sharedResource = await this.prisma.sharedResource.findUnique({
      where: { id: shareId },
    });

    if (!sharedResource) {
      return { success: false, message: 'Shared resource not found' };
    }

    if (!sharedResource.isActive) {
      return { success: false, message: 'Shared resource is no longer active' };
    }

    if (sharedResource.expiresAt && sharedResource.expiresAt < new Date()) {
      return { success: false, message: 'Shared resource has expired' };
    }

    // Verify user has access
    const hasAccess = await this.verifyUserAccess(sharedResource, userId);
    if (!hasAccess) {
      return { success: false, message: 'You do not have access to this resource' };
    }

    // Check permissions
    const hasPermission = this.checkPermission(sharedResource.permissions, accessType);
    if (!hasPermission) {
      return { success: false, message: `You do not have permission to ${accessType.toLowerCase()} this resource` };
    }

    // Log access
    await this.logResourceAccess(shareId, userId, accessType, metadata);

    // Update access count and timestamp
    await this.prisma.sharedResource.update({
      where: { id: shareId },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    // Get resource data
    const resourceData = await this.getResourceData(
      sharedResource.resourceType,
      sharedResource.resourceId,
      userId,
      sharedResource.permissions,
    );

    return {
      success: true,
      resourceData,
      message: 'Resource accessed successfully',
    };
  }

  async revokeResourceShare(shareId: string, userId: string): Promise<void> {
    const sharedResource = await this.prisma.sharedResource.findUnique({
      where: { id: shareId },
    });

    if (!sharedResource) {
      throw new Error('Shared resource not found');
    }

    if (sharedResource.ownerId !== userId) {
      throw new Error('You do not have permission to revoke this share');
    }

    await this.prisma.sharedResource.update({
      where: { id: shareId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Log activity
    this.logger.log({
      type: 'resource_share_revoked',
      shareId,
      resourceType: sharedResource.resourceType,
      resourceId: sharedResource.resourceId,
      ownerId: userId,
    }, 'SHARED_RESOURCES');
  }

  async getResourceAccessLogs(
    shareId: string,
    userId: string,
    limit: number = 50,
  ): Promise<AccessLog[]> {
    // Verify ownership
    const sharedResource = await this.prisma.sharedResource.findUnique({
      where: { id: shareId },
    });

    if (!sharedResource) {
      throw new Error('Shared resource not found');
    }

    if (sharedResource.ownerId !== userId) {
      throw new Error('You do not have permission to view access logs');
    }

    return await this.prisma.resourceAccessLog.findMany({
      where: { sharedResourceId: shareId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { accessedAt: 'desc' },
      take: limit,
    });
  }

  async getResourceSharingAnalytics(ownerId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalShares, activeShares, recentAccesses, popularResources] = await Promise.all([
      this.prisma.sharedResource.count({
        where: { ownerId },
      }),
      this.prisma.sharedResource.count({
        where: {
          ownerId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      this.prisma.resourceAccessLog.count({
        where: {
          sharedResource: { ownerId },
          accessedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.sharedResource.findMany({
        where: {
          ownerId,
          isActive: true,
        },
        orderBy: { accessCount: 'desc' },
        take: 5,
        select: {
          id: true,
          resourceType: true,
          resourceId: true,
          accessCount: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      overview: {
        totalShares,
        activeShares,
        expiredShares: totalShares - activeShares,
        monthlyAccesses: recentAccesses,
      },
      popularResources,
      insights: {
        sharingActivity: Math.min(100, recentAccesses * 2),
        collaborationScore: Math.min(100, activeShares * 5),
        resourceUtilization: totalShares > 0 ? (recentAccesses / totalShares) * 100 : 0,
      },
    };
  }

  async bulkShareResources(
    resources: Array<{
      resourceType: string;
      resourceId: string;
    }>,
    ownerId: string,
    targetType: 'USER' | 'TEAM' | 'WORKSPACE',
    targetId: string,
    permissions: string[],
    expiresAt?: Date,
  ): Promise<SharedResource[]> {
    const sharedResources = [];

    for (const resource of resources) {
      try {
        const share = await this.shareResource({
          resourceType: resource.resourceType as any,
          resourceId: resource.resourceId,
          ownerId,
          targetType,
          targetId,
          permissions,
          expiresAt,
        });
        sharedResources.push(share);
      } catch (error) {
        this.logger.warn(
          `Failed to share resource ${resource.resourceId}: ${error.message}`,
          'SHARED_RESOURCES'
        );
      }
    }

    this.logger.log({
      type: 'bulk_resources_shared',
      ownerId,
      targetType,
      targetId,
      resourceCount: resources.length,
      successCount: sharedResources.length,
    }, 'SHARED_RESOURCES');

    return sharedResources;
  }

  // Private helper methods
  private async verifyResourceOwnership(
    resourceType: string,
    resourceId: string,
    ownerId: string,
  ): Promise<void> {
    let ownsResource = false;

    switch (resourceType) {
      case 'API_KEY':
        const apiKey = await this.prisma.apiKey.findFirst({
          where: { id: resourceId, userId: ownerId },
        });
        ownsResource = !!apiKey;
        break;
      case 'DASHBOARD':
      case 'ANALYTICS':
        // These are user-specific, so ownership is implicit
        ownsResource = true;
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    if (!ownsResource) {
      throw new Error('You do not own this resource');
    }
  }

  private async verifyUserAccess(
    sharedResource: SharedResource,
    userId: string,
  ): Promise<boolean> {
    switch (sharedResource.targetType) {
      case 'USER':
        return sharedResource.targetId === userId;
      case 'TEAM':
        const teamMember = await this.prisma.teamMember.findFirst({
          where: {
            teamId: sharedResource.targetId,
            userId,
          },
        });
        return !!teamMember;
      case 'WORKSPACE':
        const workspaceAccess = await this.prisma.workspaceAccess.findFirst({
          where: {
            workspaceId: sharedResource.targetId,
            userId,
          },
        });
        return !!workspaceAccess;
      default:
        return false;
    }
  }

  private checkPermission(permissions: string[], accessType: string): boolean {
    const permissionMap = {
      VIEW: ['read', 'view', 'access'],
      DOWNLOAD: ['download', 'export'],
      EXPORT: ['export', 'download'],
      MODIFY: ['write', 'modify', 'edit'],
    };

    const requiredPerms = permissionMap[accessType] || [];
    return requiredPerms.some(perm => 
      permissions.includes(perm) || permissions.includes('all')
    );
  }

  private async logResourceAccess(
    shareId: string,
    userId: string,
    accessType: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.resourceAccessLog.create({
      data: {
        sharedResourceId: shareId,
        accessedBy: userId,
        accessType,
        metadata,
        accessedAt: new Date(),
      },
    });
  }

  private async getResourceData(
    resourceType: string,
    resourceId: string,
    userId: string,
    permissions: string[],
  ): Promise<any> {
    switch (resourceType) {
      case 'API_KEY':
        return await this.getApiKeyData(resourceId, permissions);
      case 'USAGE_DATA':
        return await this.getUsageData(resourceId, userId, permissions);
      case 'DASHBOARD':
        return await this.getDashboardData(resourceId, userId, permissions);
      case 'ANALYTICS':
        return await this.getAnalyticsData(resourceId, userId, permissions);
      default:
        return null;
    }
  }

  private async getApiKeyData(resourceId: string, permissions: string[]): Promise<any> {
    const selectFields: any = {
      id: true,
      name: true,
      keyPreview: true,
      permissions: permissions.includes('read') || permissions.includes('all'),
      rateLimit: true,
      isActive: true,
      totalRequests: true,
      lastUsedAt: true,
      createdAt: true,
    };

    // Never include the actual key hash in shared data
    return await this.prisma.apiKey.findUnique({
      where: { id: resourceId },
      select: selectFields,
    });
  }

  private async getUsageData(resourceId: string, userId: string, permissions: string[]): Promise<any> {
    // Implementation would depend on your usage data structure
    return { message: 'Usage data sharing not yet implemented' };
  }

  private async getDashboardData(resourceId: string, userId: string, permissions: string[]): Promise<any> {
    // Implementation would depend on your dashboard structure
    return { message: 'Dashboard sharing not yet implemented' };
  }

  private async getAnalyticsData(resourceId: string, userId: string, permissions: string[]): Promise<any> {
    // Implementation would depend on your analytics structure
    return { message: 'Analytics sharing not yet implemented' };
  }

  private async getUserTeamIds(userId: string): Promise<string[]> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    return teamMembers.map(tm => tm.teamId);
  }

  private async getUserWorkspaceIds(userId: string): Promise<string[]> {
    const workspaceAccess = await this.prisma.workspaceAccess.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    return workspaceAccess.map(wa => wa.workspaceId);
  }

  private async sendShareNotification(sharedResource: SharedResource): Promise<void> {
    // Implementation would integrate with your notification system
    this.logger.log('Sending share notification', {
      shareId: sharedResource.id,
      resourceType: sharedResource.resourceType,
    });
  }
}