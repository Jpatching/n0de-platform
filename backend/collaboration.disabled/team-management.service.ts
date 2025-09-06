import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  isActive: boolean;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: Date;
  permissions: string[];
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  settings?: {
    allowInvitations: boolean;
    requireApproval: boolean;
    maxMembers: number;
    defaultRole: 'MEMBER' | 'VIEWER';
  };
}

@Injectable()
export class TeamManagementService {
  private readonly logger = new Logger(TeamManagementService.name);

  constructor(private prisma: PrismaService) {}

  async createTeam(ownerId: string, createTeamDto: CreateTeamDto): Promise<Team> {
    const { name, description, settings } = createTeamDto;

    const team = await this.prisma.team.create({
      data: {
        name,
        description,
        ownerId,
        settings: {
          allowInvitations: true,
          requireApproval: false,
          maxMembers: 50,
          defaultRole: 'MEMBER',
          ...settings,
        },
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
            permissions: ['ALL'],
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    // Log activity
    this.logger.log({
      type: 'team_created',
      teamId: team.id,
      ownerId,
      name,
    }, 'TEAM_MANAGEMENT');

    return {
      ...team,
      memberCount: team._count.members,
      isActive: true,
    };
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const teams = await this.prisma.team.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          where: { userId },
          select: {
            role: true,
            permissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams.map(team => ({
      ...team,
      memberCount: team._count.members,
      isActive: true,
      userRole: team.members[0]?.role,
      userPermissions: team.members[0]?.permissions,
    }));
  }

  async getTeamById(teamId: string, userId?: string): Promise<Team | null> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: {
          select: { members: true },
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
              role: true,
              permissions: true,
            },
          },
        }),
      },
    });

    if (!team) return null;

    return {
      ...team,
      memberCount: team._count.members,
      isActive: true,
    };
  }

  async getTeamMembers(teamId: string, userId: string): Promise<TeamMember[]> {
    // Verify user has access to team
    const hasAccess = await this.hasTeamAccess(userId, teamId);
    if (!hasAccess) {
      throw new Error('You do not have access to this team');
    }

    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return members;
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER' | 'VIEWER',
    permissions?: string[],
  ): Promise<TeamMember> {
    // Check if user is already a member
    const existingMember = await this.prisma.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    // Check team limits
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (team && team.settings?.maxMembers && team._count.members >= team.settings.maxMembers) {
      throw new Error('Team has reached its maximum member limit');
    }

    const defaultPermissions = this.getDefaultPermissions(role);
    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
        permissions: permissions || defaultPermissions,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Log activity
    this.logger.log({
      type: 'team_member_added',
      teamId,
      userId,
      role,
    }, 'TEAM_MANAGEMENT');

    return member;
  }

  async updateTeamMember(
    teamId: string,
    memberId: string,
    updaterId: string,
    updates: {
      role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
      permissions?: string[];
    },
  ): Promise<TeamMember> {
    // Verify updater has permission to update members
    const canUpdate = await this.canUserManageTeamMembers(updaterId, teamId);
    if (!canUpdate) {
      throw new Error('You do not have permission to update team members');
    }

    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });

    if (!member) {
      throw new Error('Team member not found');
    }

    // Cannot change owner role
    if (member.role === 'OWNER') {
      throw new Error('Cannot modify team owner');
    }

    const updatedMember = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Log activity
    this.logger.log({
      type: 'team_member_updated',
      teamId,
      memberId,
      updaterId,
      changes: updates,
    }, 'TEAM_MANAGEMENT');

    return updatedMember;
  }

  async removeTeamMember(
    teamId: string,
    memberId: string,
    removerId: string,
  ): Promise<void> {
    // Verify remover has permission
    const canRemove = await this.canUserManageTeamMembers(removerId, teamId);
    if (!canRemove) {
      throw new Error('You do not have permission to remove team members');
    }

    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });

    if (!member) {
      throw new Error('Team member not found');
    }

    // Cannot remove owner
    if (member.role === 'OWNER') {
      throw new Error('Cannot remove team owner');
    }

    await this.prisma.teamMember.delete({
      where: { id: memberId },
    });

    // Log activity
    this.logger.log({
      type: 'team_member_removed',
      teamId,
      memberId,
      removerId,
      removedUserId: member.userId,
    }, 'TEAM_MANAGEMENT');
  }

  async updateTeam(
    teamId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      settings?: any;
    },
  ): Promise<Team> {
    // Verify user can update team
    const canUpdate = await this.canUserManageTeam(userId, teamId);
    if (!canUpdate) {
      throw new Error('You do not have permission to update this team');
    }

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: updates,
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    // Log activity
    this.logger.log({
      type: 'team_updated',
      teamId,
      userId,
      changes: updates,
    }, 'TEAM_MANAGEMENT');

    return {
      ...updatedTeam,
      memberCount: updatedTeam._count.members,
      isActive: true,
    };
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    // Verify user is owner
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new Error('Only team owner can delete the team');
    }

    // Delete team and all related data
    await this.prisma.$transaction([
      this.prisma.teamMember.deleteMany({ where: { teamId } }),
      this.prisma.teamInvitation.deleteMany({ where: { teamId } }),
      this.prisma.workspace.deleteMany({ where: { teamId } }),
      this.prisma.team.delete({ where: { id: teamId } }),
    ]);

    // Log activity
    this.logger.log({
      type: 'team_deleted',
      teamId,
      userId,
      teamName: team.name,
    }, 'TEAM_MANAGEMENT');
  }

  async getTeamActivity(teamId: string, userId: string): Promise<any[]> {
    // Verify access
    const hasAccess = await this.hasTeamAccess(userId, teamId);
    if (!hasAccess) {
      throw new Error('You do not have access to this team');
    }

    return await this.prisma.teamActivity.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async getTeamAnalytics(teamId: string, userId: string): Promise<any> {
    // Verify access
    const hasAccess = await this.hasTeamAccess(userId, teamId);
    if (!hasAccess) {
      throw new Error('You do not have access to this team');
    }

    const [team, members, activity, workspaces] = await Promise.all([
      this.getTeamById(teamId),
      this.prisma.teamMember.count({ where: { teamId } }),
      this.prisma.teamActivity.count({
        where: {
          teamId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.workspace.count({ where: { teamId } }),
    ]);

    return {
      team,
      metrics: {
        totalMembers: members,
        monthlyActivity: activity,
        totalWorkspaces: workspaces,
        growthRate: this.calculateGrowthRate(teamId),
      },
      insights: await this.generateTeamInsights(teamId),
    };
  }

  // Permission checking methods
  async hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId, teamId },
    });
    return !!member;
  }

  async canUserInviteToTeam(userId: string, teamId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId, teamId },
    });
    return member && ['OWNER', 'ADMIN'].includes(member.role);
  }

  async canUserManageTeamMembers(userId: string, teamId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId, teamId },
    });
    return member && ['OWNER', 'ADMIN'].includes(member.role);
  }

  async canUserManageTeam(userId: string, teamId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId, teamId },
    });
    return member && member.role === 'OWNER';
  }

  async getTeamMember(teamId: string, userEmail: string): Promise<TeamMember | null> {
    const member = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email: userEmail },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return member;
  }

  // Helper methods
  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'ADMIN':
        return ['MANAGE_MEMBERS', 'MANAGE_WORKSPACES', 'VIEW_ANALYTICS', 'SHARE_RESOURCES'];
      case 'MEMBER':
        return ['VIEW_WORKSPACES', 'SHARE_RESOURCES'];
      case 'VIEWER':
        return ['VIEW_WORKSPACES'];
      default:
        return ['VIEW_WORKSPACES'];
    }
  }

  private async calculateGrowthRate(teamId: string): Promise<number> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const [currentMembers, lastMonthMembers] = await Promise.all([
      this.prisma.teamMember.count({
        where: {
          teamId,
          joinedAt: { gte: lastMonth },
        },
      }),
      this.prisma.teamMember.count({
        where: {
          teamId,
          joinedAt: { gte: twoMonthsAgo, lt: lastMonth },
        },
      }),
    ]);

    if (lastMonthMembers === 0) return currentMembers > 0 ? 100 : 0;
    return ((currentMembers - lastMonthMembers) / lastMonthMembers) * 100;
  }

  private async generateTeamInsights(teamId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [activityCount, memberJoins, resourceShares] = await Promise.all([
      this.prisma.teamActivity.count({
        where: { teamId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.teamMember.count({
        where: { teamId, joinedAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.sharedResource.count({
        where: {
          targetType: 'TEAM',
          targetId: teamId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      activityScore: Math.min(100, activityCount * 2),
      collaborationScore: Math.min(100, resourceShares * 5),
      growthScore: Math.min(100, memberJoins * 10),
      healthScore: Math.min(100, (activityCount + resourceShares + memberJoins) * 2),
    };
  }
}