import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  teamId?: string;
  isShared: boolean;
  settings: any;
  apiKeyCount?: number;
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceAccess {
  userId: string;
  workspaceId: string;
  accessLevel: 'READ' | 'READ_WRITE' | 'ADMIN';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  ownerId: string;
  teamId?: string;
  isShared?: boolean;
  settings?: {
    allowApiKeySharing?: boolean;
    allowUsageSharing?: boolean;
    allowBillingAccess?: boolean;
    collaborationLevel?: 'READ' | 'READ_WRITE' | 'ADMIN';
    autoShareWithTeam?: boolean;
    requireApproval?: boolean;
  };
}

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private prisma: PrismaService) {}

  async createWorkspace(createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    const {
      name,
      description,
      ownerId,
      teamId,
      isShared = false,
      settings = {},
    } = createWorkspaceDto;

    const defaultSettings = {
      allowApiKeySharing: true,
      allowUsageSharing: true,
      allowBillingAccess: false,
      collaborationLevel: 'READ_WRITE',
      autoShareWithTeam: teamId ? true : false,
      requireApproval: false,
      ...settings,
    };

    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        description,
        ownerId,
        teamId,
        isShared,
        settings: defaultSettings,
      },
      include: {
        _count: {
          select: {
            apiKeys: true,
            members: true,
          },
        },
      },
    });

    // Auto-share with team members if enabled
    if (teamId && defaultSettings.autoShareWithTeam) {
      await this.autoShareWithTeamMembers(workspace.id, teamId, ownerId);
    }

    // Log activity
    this.logger.log({
      type: 'workspace_created',
      workspaceId: workspace.id,
      ownerId,
      teamId,
      name,
      isShared,
    }, 'WORKSPACE');

    return {
      ...workspace,
      apiKeyCount: workspace._count.apiKeys,
      memberCount: workspace._count.members,
    };
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          {
            teamId: {
              in: await this.getUserTeamIds(userId),
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            apiKeys: true,
            members: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return workspaces.map(workspace => ({
      ...workspace,
      apiKeyCount: workspace._count.apiKeys,
      memberCount: workspace._count.members,
    }));
  }

  async getWorkspaceById(workspaceId: string, userId?: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            apiKeys: true,
            members: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        ...(userId && {
          members: {
            where: { userId },
            select: {
              accessLevel: true,
              grantedAt: true,
            },
          },
        }),
      },
    });

    if (!workspace) return null;

    return {
      ...workspace,
      apiKeyCount: workspace._count.apiKeys,
      memberCount: workspace._count.members,
    };
  }

  async shareWorkspace(
    workspaceId: string,
    ownerId: string,
    targetUserId: string,
    accessLevel: 'READ' | 'READ_WRITE' | 'ADMIN',
    expiresAt?: Date,
  ): Promise<WorkspaceAccess> {
    // Verify ownership or admin access
    const hasPermission = await this.hasWorkspacePermission(ownerId, workspaceId, 'ADMIN');
    if (!hasPermission) {
      throw new Error('You do not have permission to share this workspace');
    }

    // Check if already shared
    const existingAccess = await this.prisma.workspaceAccess.findFirst({
      where: { workspaceId, userId: targetUserId },
    });

    if (existingAccess) {
      // Update existing access
      const updatedAccess = await this.prisma.workspaceAccess.update({
        where: { id: existingAccess.id },
        data: { accessLevel, expiresAt },
      });

      this.logger.log({
        type: 'workspace_access_updated',
        workspaceId,
        targetUserId,
        accessLevel,
        grantedBy: ownerId,
      }, 'WORKSPACE');

      return updatedAccess;
    }

    // Create new access
    const workspaceAccess = await this.prisma.workspaceAccess.create({
      data: {
        workspaceId,
        userId: targetUserId,
        accessLevel,
        grantedBy: ownerId,
        expiresAt,
      },
    });

    // Log activity
    this.logger.log({
      type: 'workspace_shared',
      workspaceId,
      targetUserId,
      accessLevel,
      grantedBy: ownerId,
    }, 'WORKSPACE');

    return workspaceAccess;
  }

  async getWorkspaceMembers(workspaceId: string, userId: string): Promise<any[]> {
    // Verify access
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new Error('You do not have access to this workspace');
    }

    const members = await this.prisma.workspaceAccess.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        grantedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [
        { accessLevel: 'asc' },
        { grantedAt: 'desc' },
      ],
    });

    // Also include workspace owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const allMembers = [
      {
        id: 'owner',
        userId: workspace.ownerId,
        workspaceId,
        accessLevel: 'ADMIN',
        grantedBy: workspace.ownerId,
        grantedAt: workspace.createdAt,
        user: workspace.owner,
        isOwner: true,
      },
      ...members.map(member => ({
        ...member,
        isOwner: false,
      })),
    ];

    return allMembers;
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      settings?: any;
    },
  ): Promise<Workspace> {
    // Verify permission
    const hasPermission = await this.hasWorkspacePermission(userId, workspaceId, 'ADMIN');
    if (!hasPermission) {
      throw new Error('You do not have permission to update this workspace');
    }

    const updatedWorkspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: updates,
      include: {
        _count: {
          select: {
            apiKeys: true,
            members: true,
          },
        },
      },
    });

    // Log activity
    this.logger.log({
      type: 'workspace_updated',
      workspaceId,
      userId,
      changes: updates,
    }, 'WORKSPACE');

    return {
      ...updatedWorkspace,
      apiKeyCount: updatedWorkspace._count.apiKeys,
      memberCount: updatedWorkspace._count.members,
    };
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Verify ownership
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can delete the workspace');
    }

    // Delete workspace and all related data
    await this.prisma.$transaction([
      this.prisma.workspaceAccess.deleteMany({ where: { workspaceId } }),
      this.prisma.workspaceApiKey.deleteMany({ where: { workspaceId } }),
      this.prisma.workspace.delete({ where: { id: workspaceId } }),
    ]);

    // Log activity
    this.logger.log({
      type: 'workspace_deleted',
      workspaceId,
      userId,
      workspaceName: workspace.name,
    }, 'WORKSPACE');
  }

  async addApiKeyToWorkspace(
    workspaceId: string,
    apiKeyId: string,
    userId: string,
    accessLevel: 'READ' | 'READ_WRITE' = 'READ',
  ): Promise<void> {
    // Verify workspace access
    const hasAccess = await this.hasWorkspacePermission(userId, workspaceId, 'READ_WRITE');
    if (!hasAccess) {
      throw new Error('You do not have permission to add API keys to this workspace');
    }

    // Verify API key ownership
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new Error('API key not found or you do not have permission to share it');
    }

    // Add to workspace
    await this.prisma.workspaceApiKey.create({
      data: {
        workspaceId,
        apiKeyId,
        addedBy: userId,
        accessLevel,
      },
    });

    // Log activity
    this.logger.log({
      type: 'api_key_added_to_workspace',
      workspaceId,
      apiKeyId,
      userId,
      accessLevel,
    }, 'WORKSPACE');
  }

  async removeApiKeyFromWorkspace(
    workspaceId: string,
    apiKeyId: string,
    userId: string,
  ): Promise<void> {
    // Verify permission
    const hasPermission = await this.hasWorkspacePermission(userId, workspaceId, 'READ_WRITE');
    if (!hasPermission) {
      throw new Error('You do not have permission to remove API keys from this workspace');
    }

    await this.prisma.workspaceApiKey.delete({
      where: {
        workspaceId_apiKeyId: {
          workspaceId,
          apiKeyId,
        },
      },
    });

    // Log activity
    this.logger.log({
      type: 'api_key_removed_from_workspace',
      workspaceId,
      apiKeyId,
      userId,
    }, 'WORKSPACE');
  }

  async getWorkspaceApiKeys(workspaceId: string, userId: string): Promise<any[]> {
    // Verify access
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new Error('You do not have access to this workspace');
    }

    const workspaceApiKeys = await this.prisma.workspaceApiKey.findMany({
      where: { workspaceId },
      include: {
        apiKey: {
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
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        addedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return workspaceApiKeys;
  }

  async getWorkspaceAnalytics(workspaceId: string, userId: string): Promise<any> {
    // Verify access
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new Error('You do not have access to this workspace');
    }

    const [workspace, apiKeys, members, activity] = await Promise.all([
      this.getWorkspaceById(workspaceId),
      this.prisma.workspaceApiKey.count({ where: { workspaceId } }),
      this.prisma.workspaceAccess.count({ where: { workspaceId } }),
      this.prisma.workspaceActivity.count({
        where: {
          workspaceId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      workspace,
      metrics: {
        totalApiKeys: apiKeys,
        totalMembers: members + 1, // +1 for owner
        monthlyActivity: activity,
        collaborationScore: this.calculateCollaborationScore(workspaceId),
      },
      insights: await this.generateWorkspaceInsights(workspaceId),
    };
  }

  // Permission checking methods
  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) return false;
    if (workspace.ownerId === userId) return true;

    const access = await this.prisma.workspaceAccess.findFirst({
      where: {
        workspaceId,
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (access) return true;

    // Check team membership
    if (workspace.teamId) {
      const teamMember = await this.prisma.teamMember.findFirst({
        where: {
          teamId: workspace.teamId,
          userId,
        },
      });
      return !!teamMember;
    }

    return false;
  }

  async hasWorkspacePermission(
    userId: string,
    workspaceId: string,
    requiredLevel: 'READ' | 'READ_WRITE' | 'ADMIN',
  ): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) return false;
    if (workspace.ownerId === userId) return true;

    const access = await this.prisma.workspaceAccess.findFirst({
      where: {
        workspaceId,
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!access) return false;

    // Check access level hierarchy
    const levels = { 'READ': 1, 'READ_write': 2, 'admin': 3 };
    const userLevel = levels[access.accessLevel.toLowerCase()];
    const requiredLevelNum = levels[requiredLevel.toLowerCase()];

    return userLevel >= requiredLevelNum;
  }

  // Helper methods
  private async getUserTeamIds(userId: string): Promise<string[]> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    return teamMembers.map(tm => tm.teamId);
  }

  private async autoShareWithTeamMembers(
    workspaceId: string,
    teamId: string,
    ownerId: string,
  ): Promise<void> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        userId: { not: ownerId },
      },
    });

    const accessData = teamMembers.map(member => ({
      workspaceId,
      userId: member.userId,
      accessLevel: this.getDefaultAccessLevel(member.role),
      grantedBy: ownerId,
    }));

    if (accessData.length > 0) {
      await this.prisma.workspaceAccess.createMany({
        data: accessData,
      });
    }
  }

  private getDefaultAccessLevel(role: string): 'READ' | 'READ_WRITE' | 'ADMIN' {
    switch (role) {
      case 'OWNER':
      case 'ADMIN':
        return 'ADMIN';
      case 'MEMBER':
        return 'READ_WRITE';
      case 'VIEWER':
        return 'READ';
      default:
        return 'READ';
    }
  }

  private async calculateCollaborationScore(workspaceId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [apiKeyShares, memberActivity, totalMembers] = await Promise.all([
      this.prisma.workspaceApiKey.count({
        where: {
          workspaceId,
          addedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.workspaceActivity.count({
        where: {
          workspaceId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.workspaceAccess.count({ where: { workspaceId } }),
    ]);

    const baseScore = (apiKeyShares * 5) + (memberActivity * 2) + (totalMembers * 3);
    return Math.min(100, baseScore);
  }

  private async generateWorkspaceInsights(workspaceId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [apiKeyCount, memberCount, activityCount] = await Promise.all([
      this.prisma.workspaceApiKey.count({ where: { workspaceId } }),
      this.prisma.workspaceAccess.count({ where: { workspaceId } }),
      this.prisma.workspaceActivity.count({
        where: { workspaceId, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      utilizationScore: Math.min(100, apiKeyCount * 10),
      collaborationHealth: Math.min(100, memberCount * 15),
      activityLevel: Math.min(100, activityCount * 3),
      overallHealth: Math.min(100, (apiKeyCount + memberCount + activityCount) * 5),
    };
  }
}