import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { TeamManagementService } from './team-management.service';
import { WorkspaceService } from './workspace.service';
import { SharedResourcesService } from './shared-resources.service';
import { RealTimeService } from './real-time.service';

export interface CollaborationOverview {
  teams: {
    totalTeams: number;
    activeTeams: number;
    totalMembers: number;
    averageTeamSize: number;
  };
  workspaces: {
    totalWorkspaces: number;
    sharedWorkspaces: number;
    privateWorkspaces: number;
    totalApiKeys: number;
  };
  activity: {
    recentActivities: any[];
    collaborationsToday: number;
    messagesExchanged: number;
    resourcesShared: number;
  };
  insights: {
    teamProductivity: number;
    collaborationScore: number;
    communicationHealth: number;
    resourceUtilization: number;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  inviterId: string;
  inviteeEmail: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedAt: Date;
  expiresAt: Date;
  message?: string;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private prisma: PrismaService,
    private teamManagementService: TeamManagementService,
    private workspaceService: WorkspaceService,
    private sharedResourcesService: SharedResourcesService,
    private realTimeService: RealTimeService,
  ) {}

  async getCollaborationOverview(userId: string): Promise<CollaborationOverview> {
    const [teams, workspaces, recentActivity, insights] = await Promise.all([
      this.getTeamOverview(userId),
      this.getWorkspaceOverview(userId),
      this.getRecentActivity(userId),
      this.generateCollaborationInsights(userId),
    ]);

    return {
      teams,
      workspaces,
      activity: {
        recentActivities: recentActivity,
        collaborationsToday: await this.getTodayCollaborations(userId),
        messagesExchanged: await this.getTodayMessages(userId),
        resourcesShared: await this.getTodayResourceShares(userId),
      },
      insights,
    };
  }

  async inviteUserToTeam(
    inviterId: string,
    teamId: string,
    inviteeEmail: string,
    role: 'ADMIN' | 'MEMBER' | 'VIEWER',
    message?: string,
  ): Promise<TeamInvitation> {
    // Check if inviter has permission to invite
    const canInvite = await this.teamManagementService.canUserInviteToTeam(inviterId, teamId);
    if (!canInvite) {
      throw new Error('You do not have permission to invite users to this team');
    }

    // Check if user is already invited or a member
    const existingMember = await this.teamManagementService.getTeamMember(teamId, inviteeEmail);
    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    const existingInvitation = await this.prisma.teamInvitation.findFirst({
      where: {
        organizationId: teamId,
        email: inviteeEmail,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new Error('User already has a pending invitation to this team');
    }

    // Create invitation
    const invitation = await this.prisma.teamInvitation.create({
      data: {
        organizationId: teamId, // Using organization instead of team
        invitedById: inviterId,
        email: inviteeEmail,
        role,
        message,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send invitation email
    await this.sendInvitationEmail(invitation);

    // Real-time notification
    await this.realTimeService.notifyTeamInvitation(teamId, invitation);

    // Log activity
    this.logger.log({
      type: 'team_invitation_sent',
      inviterId,
      teamId,
      inviteeEmail,
      role,
    }, 'COLLABORATION');

    return invitation;
  }

  async acceptTeamInvitation(invitationId: string, userId: string): Promise<any> {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: { organization: true },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new Error('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Invitation has expired');
    }

    // Get user email to verify
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== invitation.email) {
      throw new Error('You are not authorized to accept this invitation');
    }

    // Accept invitation and add to team
    const [updatedInvitation, teamMember] = await Promise.all([
      this.prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED' },
      }),
      this.teamManagementService.addTeamMember(invitation.organizationId, userId, invitation.role),
    ]);

    // Real-time notifications
    await this.realTimeService.notifyTeamMemberJoined(invitation.organizationId, teamMember);

    // Log activity
    this.logger.log({
      type: 'team_invitation_accepted',
      userId,
      teamId: invitation.organizationId,
      role: invitation.role,
    }, 'COLLABORATION');

    return {
      message: `Successfully joined team ${invitation.organization?.name || 'Unknown'}`,
      team: invitation.organization,
      role: invitation.role,
    };
  }

  async createSharedWorkspace(
    ownerId: string,
    name: string,
    description: string,
    teamId?: string,
    settings?: any,
  ): Promise<any> {
    const workspace = await this.workspaceService.createWorkspace({
      ownerId,
      name,
      description,
      teamId,
      isShared: true,
      settings: {
        allowApiKeySharing: true,
        allowUsageSharing: true,
        allowBillingAccess: false,
        collaborationLevel: 'READ_WRITE',
        ...settings,
      },
    });

    // Real-time notification
    if (teamId) {
      await this.realTimeService.notifyWorkspaceCreated(teamId, workspace);
    }

    // Log activity
    this.logger.log({
      type: 'shared_workspace_created',
      ownerId,
      workspaceId: workspace.id,
      teamId,
      name,
    }, 'COLLABORATION');

    return workspace;
  }

  async shareApiKey(
    ownerId: string,
    apiKeyId: string,
    targetType: 'USER' | 'TEAM' | 'WORKSPACE',
    targetId: string,
    permissions: string[],
    expiresAt?: Date,
  ): Promise<any> {
    // Verify ownership of API key
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId: ownerId,
      },
    });

    if (!apiKey) {
      throw new Error('API key not found or you do not have permission to share it');
    }

    // Create shared resource
    const sharedResource = await this.sharedResourcesService.shareResource({
      resourceType: 'API_KEY',
      resourceId: apiKeyId,
      ownerId,
      targetType,
      targetId,
      permissions,
      expiresAt,
    });

    // Real-time notification
    await this.realTimeService.notifyResourceShared(targetType, targetId, sharedResource);

    // Log activity
    this.logger.log({
      type: 'api_key_shared',
      ownerId,
      apiKeyId,
      targetType,
      targetId,
      permissions,
    }, 'COLLABORATION');

    return {
      message: 'API key shared successfully',
      sharedResource,
      accessUrl: `/shared/api-keys/${sharedResource.id}`,
    };
  }

  async getSharedResources(userId: string, targetType?: string): Promise<any[]> {
    return this.sharedResourcesService.getSharedResourcesForUser(userId, targetType);
  }

  async startCollaborativeSession(
    initiatorId: string,
    workspaceId: string,
    participants: string[],
    sessionType: 'DEBUG' | 'DEVELOPMENT' | 'REVIEW' | 'MONITORING',
  ): Promise<any> {
    // Verify workspace access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(initiatorId, workspaceId);
    if (!hasAccess) {
      throw new Error('You do not have access to this workspace');
    }

    const session = await this.prisma.collaborativeSession.create({
      data: {
        workspaceId,
        initiatorId,
        sessionType,
        status: 'ACTIVE',
        participants: {
          connect: participants.map(id => ({ id })),
        },
        settings: {
          allowScreenSharing: true,
          allowCodeSharing: true,
          allowRealTimeEditing: sessionType === 'DEVELOPMENT',
          allowVoiceChat: false,
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Start real-time session
    await this.realTimeService.startCollaborativeSession(session);

    // Notify participants
    for (const participantId of participants) {
      await this.realTimeService.notifySessionInvitation(participantId, session);
    }

    // Log activity
    this.logger.log({
      type: 'collaborative_session_started',
      initiatorId,
      sessionId: session.id,
      workspaceId,
      sessionType,
      participantCount: participants.length,
    }, 'COLLABORATION');

    return session;
  }

  async joinCollaborativeSession(sessionId: string, userId: string): Promise<any> {
    const session = await this.prisma.collaborativeSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
        workspace: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const isParticipant = session.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new Error('You are not a participant in this session');
    }

    // Join real-time session
    const connectionDetails = await this.realTimeService.joinCollaborativeSession(sessionId, userId);

    // Update session activity
    await this.prisma.sessionActivity.create({
      data: {
        sessionId,
        userId,
        action: 'JOINED',
        timestamp: new Date(),
      },
    });

    // Log activity
    this.logger.log({
      type: 'collaborative_session_joined',
      userId,
      sessionId,
    }, 'COLLABORATION');

    return {
      session,
      connectionDetails,
      message: `Joined collaborative session: ${session.workspace.name}`,
    };
  }

  // Private helper methods
  private async getTeamOverview(userId: string) {
    const userTeams = await this.teamManagementService.getUserTeams(userId);
    const totalMembers = userTeams.reduce((sum, team) => sum + team.memberCount, 0);

    return {
      totalTeams: userTeams.length,
      activeTeams: userTeams.filter(team => team.isActive).length,
      totalMembers,
      averageTeamSize: userTeams.length > 0 ? totalMembers / userTeams.length : 0,
    };
  }

  private async getWorkspaceOverview(userId: string) {
    const workspaces = await this.workspaceService.getUserWorkspaces(userId);
    const sharedCount = workspaces.filter(w => w.isShared).length;

    return {
      totalWorkspaces: workspaces.length,
      sharedWorkspaces: sharedCount,
      privateWorkspaces: workspaces.length - sharedCount,
      totalApiKeys: workspaces.reduce((sum, w) => sum + (w.apiKeyCount || 0), 0),
    };
  }

  private async getRecentActivity(userId: string) {
    return await this.prisma.collaborationActivity.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { targetUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        initiator: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  private async generateCollaborationInsights(userId: string) {
    // Simplified insights calculation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const activityCount = await this.prisma.collaborationActivity.count({
      where: {
        OR: [
          { initiatorId: userId },
          { targetUserId: userId },
        ],
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      teamProductivity: Math.min(100, activityCount * 2), // Max 100
      collaborationScore: Math.min(100, activityCount * 1.5),
      communicationHealth: Math.min(100, activityCount * 1.2),
      resourceUtilization: Math.min(100, activityCount * 0.8),
    };
  }

  private async getTodayCollaborations(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.prisma.collaborativeSession.count({
      where: {
        OR: [
          { initiatorId: userId },
          { participants: { some: { id: userId } } },
        ],
        createdAt: { gte: today },
      },
    });
  }

  private async getTodayMessages(userId: string): Promise<number> {
    // This would integrate with your messaging system
    return 0;
  }

  private async getTodayResourceShares(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.prisma.sharedResource.count({
      where: {
        ownerId: userId,
        createdAt: { gte: today },
      },
    });
  }

  private async sendInvitationEmail(invitation: TeamInvitation) {
    // This would integrate with your email service
    this.logger.log('Sending invitation email', { invitationId: invitation.id });
  }
}