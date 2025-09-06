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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';
import { TeamManagementService } from './team-management.service';
import { WorkspaceService } from './workspace.service';
import { SharedResourcesService } from './shared-resources.service';

@ApiTags('collaboration')
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollaborationController {
  constructor(
    private collaborationService: CollaborationService,
    private teamManagementService: TeamManagementService,
    private workspaceService: WorkspaceService,
    private sharedResourcesService: SharedResourcesService,
  ) {}

  // Collaboration Overview
  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive collaboration overview' })
  @ApiResponse({ 
    status: 200, 
    description: 'Collaboration overview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        teams: {
          type: 'object',
          properties: {
            totalTeams: { type: 'number' },
            activeTeams: { type: 'number' },
            totalMembers: { type: 'number' },
            averageTeamSize: { type: 'number' },
          },
        },
        workspaces: {
          type: 'object',
          properties: {
            totalWorkspaces: { type: 'number' },
            sharedWorkspaces: { type: 'number' },
            privateWorkspaces: { type: 'number' },
            totalApiKeys: { type: 'number' },
          },
        },
        activity: {
          type: 'object',
          properties: {
            recentActivities: { type: 'array' },
            collaborationsToday: { type: 'number' },
            messagesExchanged: { type: 'number' },
            resourcesShared: { type: 'number' },
          },
        },
        insights: {
          type: 'object',
          properties: {
            teamProductivity: { type: 'number' },
            collaborationScore: { type: 'number' },
            communicationHealth: { type: 'number' },
            resourceUtilization: { type: 'number' },
          },
        },
      },
    },
  })
  async getCollaborationOverview(@Request() req) {
    return this.collaborationService.getCollaborationOverview(req.user.userId);
  }

  // Team Management
  @Post('teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  async createTeam(
    @Request() req,
    @Body() createTeamDto: {
      name: string;
      description?: string;
      settings?: {
        allowInvitations: boolean;
        requireApproval: boolean;
        maxMembers: number;
        defaultRole: 'MEMBER' | 'VIEWER';
      };
    }
  ) {
    return this.teamManagementService.createTeam(req.user.userId, createTeamDto);
  }

  @Get('teams')
  @ApiOperation({ summary: 'Get user teams' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  async getUserTeams(@Request() req) {
    return this.teamManagementService.getUserTeams(req.user.userId);
  }

  @Get('teams/:teamId')
  @ApiOperation({ summary: 'Get team details' })
  @ApiResponse({ status: 200, description: 'Team details retrieved successfully' })
  async getTeamById(@Request() req, @Param('teamId') teamId: string) {
    return this.teamManagementService.getTeamById(teamId, req.user.userId);
  }

  @Get('teams/:teamId/members')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({ status: 200, description: 'Team members retrieved successfully' })
  async getTeamMembers(@Request() req, @Param('teamId') teamId: string) {
    return this.teamManagementService.getTeamMembers(teamId, req.user.userId);
  }

  @Post('teams/:teamId/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite user to team' })
  @ApiResponse({ status: 201, description: 'Team invitation sent successfully' })
  async inviteUserToTeam(
    @Request() req,
    @Param('teamId') teamId: string,
    @Body() inviteDto: {
      email: string;
      role: 'ADMIN' | 'MEMBER' | 'VIEWER';
      message?: string;
    }
  ) {
    return this.collaborationService.inviteUserToTeam(
      req.user.userId,
      teamId,
      inviteDto.email,
      inviteDto.role,
      inviteDto.message,
    );
  }

  @Post('teams/invitations/:invitationId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept team invitation' })
  @ApiResponse({ status: 200, description: 'Team invitation accepted successfully' })
  async acceptTeamInvitation(@Request() req, @Param('invitationId') invitationId: string) {
    return this.collaborationService.acceptTeamInvitation(invitationId, req.user.userId);
  }

  @Put('teams/:teamId/members/:memberId')
  @ApiOperation({ summary: 'Update team member' })
  @ApiResponse({ status: 200, description: 'Team member updated successfully' })
  async updateTeamMember(
    @Request() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: {
      role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
      permissions?: string[];
    }
  ) {
    return this.teamManagementService.updateTeamMember(teamId, memberId, req.user.userId, updateDto);
  }

  @Delete('teams/:teamId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove team member' })
  @ApiResponse({ status: 200, description: 'Team member removed successfully' })
  async removeTeamMember(
    @Request() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string
  ) {
    await this.teamManagementService.removeTeamMember(teamId, memberId, req.user.userId);
    return { message: 'Team member removed successfully' };
  }

  @Put('teams/:teamId')
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  async updateTeam(
    @Request() req,
    @Param('teamId') teamId: string,
    @Body() updateDto: {
      name?: string;
      description?: string;
      settings?: any;
    }
  ) {
    return this.teamManagementService.updateTeam(teamId, req.user.userId, updateDto);
  }

  @Delete('teams/:teamId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  async deleteTeam(@Request() req, @Param('teamId') teamId: string) {
    await this.teamManagementService.deleteTeam(teamId, req.user.userId);
    return { message: 'Team deleted successfully' };
  }

  @Get('teams/:teamId/analytics')
  @ApiOperation({ summary: 'Get team analytics' })
  @ApiResponse({ status: 200, description: 'Team analytics retrieved successfully' })
  async getTeamAnalytics(@Request() req, @Param('teamId') teamId: string) {
    return this.teamManagementService.getTeamAnalytics(teamId, req.user.userId);
  }

  // Workspace Management
  @Post('workspaces')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  async createWorkspace(
    @Request() req,
    @Body() createWorkspaceDto: {
      name: string;
      description?: string;
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
  ) {
    return this.workspaceService.createWorkspace({
      ...createWorkspaceDto,
      ownerId: req.user.userId,
    });
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'Get user workspaces' })
  @ApiResponse({ status: 200, description: 'Workspaces retrieved successfully' })
  async getUserWorkspaces(@Request() req) {
    return this.workspaceService.getUserWorkspaces(req.user.userId);
  }

  @Get('workspaces/:workspaceId')
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiResponse({ status: 200, description: 'Workspace details retrieved successfully' })
  async getWorkspaceById(@Request() req, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getWorkspaceById(workspaceId, req.user.userId);
  }

  @Get('workspaces/:workspaceId/members')
  @ApiOperation({ summary: 'Get workspace members' })
  @ApiResponse({ status: 200, description: 'Workspace members retrieved successfully' })
  async getWorkspaceMembers(@Request() req, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getWorkspaceMembers(workspaceId, req.user.userId);
  }

  @Post('workspaces/:workspaceId/share')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Share workspace with user' })
  @ApiResponse({ status: 201, description: 'Workspace shared successfully' })
  async shareWorkspace(
    @Request() req,
    @Param('workspaceId') workspaceId: string,
    @Body() shareDto: {
      userId: string;
      accessLevel: 'READ' | 'READ_WRITE' | 'ADMIN';
      expiresAt?: Date;
    }
  ) {
    return this.workspaceService.shareWorkspace(
      workspaceId,
      req.user.userId,
      shareDto.userId,
      shareDto.accessLevel,
      shareDto.expiresAt,
    );
  }

  @Get('workspaces/:workspaceId/api-keys')
  @ApiOperation({ summary: 'Get workspace API keys' })
  @ApiResponse({ status: 200, description: 'Workspace API keys retrieved successfully' })
  async getWorkspaceApiKeys(@Request() req, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getWorkspaceApiKeys(workspaceId, req.user.userId);
  }

  @Post('workspaces/:workspaceId/api-keys/:apiKeyId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add API key to workspace' })
  @ApiResponse({ status: 201, description: 'API key added to workspace successfully' })
  async addApiKeyToWorkspace(
    @Request() req,
    @Param('workspaceId') workspaceId: string,
    @Param('apiKeyId') apiKeyId: string,
    @Body() addDto: {
      accessLevel?: 'READ' | 'READ_WRITE';
    }
  ) {
    await this.workspaceService.addApiKeyToWorkspace(
      workspaceId,
      apiKeyId,
      req.user.userId,
      addDto.accessLevel,
    );
    return { message: 'API key added to workspace successfully' };
  }

  @Put('workspaces/:workspaceId')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  async updateWorkspace(
    @Request() req,
    @Param('workspaceId') workspaceId: string,
    @Body() updateDto: {
      name?: string;
      description?: string;
      settings?: any;
    }
  ) {
    return this.workspaceService.updateWorkspace(workspaceId, req.user.userId, updateDto);
  }

  @Delete('workspaces/:workspaceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  async deleteWorkspace(@Request() req, @Param('workspaceId') workspaceId: string) {
    await this.workspaceService.deleteWorkspace(workspaceId, req.user.userId);
    return { message: 'Workspace deleted successfully' };
  }

  @Get('workspaces/:workspaceId/analytics')
  @ApiOperation({ summary: 'Get workspace analytics' })
  @ApiResponse({ status: 200, description: 'Workspace analytics retrieved successfully' })
  async getWorkspaceAnalytics(@Request() req, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getWorkspaceAnalytics(workspaceId, req.user.userId);
  }

  // Resource Sharing
  @Post('share/resource')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Share a resource' })
  @ApiResponse({ status: 201, description: 'Resource shared successfully' })
  async shareResource(
    @Request() req,
    @Body() shareDto: {
      resourceType: 'API_KEY' | 'USAGE_DATA' | 'DASHBOARD' | 'ANALYTICS' | 'BILLING_DATA';
      resourceId: string;
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
  ) {
    return this.sharedResourcesService.shareResource({
      ...shareDto,
      ownerId: req.user.userId,
    });
  }

  @Get('shared/resources')
  @ApiOperation({ summary: 'Get shared resources for user' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by resource type' })
  @ApiResponse({ status: 200, description: 'Shared resources retrieved successfully' })
  async getSharedResources(
    @Request() req,
    @Query('type') resourceType?: string
  ) {
    return this.sharedResourcesService.getSharedResourcesForUser(req.user.userId, resourceType);
  }

  @Get('shared/resources/owned')
  @ApiOperation({ summary: 'Get resources shared by user' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by resource type' })
  @ApiResponse({ status: 200, description: 'Owned shared resources retrieved successfully' })
  async getSharedResourcesOwned(
    @Request() req,
    @Query('type') resourceType?: string
  ) {
    return this.sharedResourcesService.getSharedResourcesOwned(req.user.userId, resourceType);
  }

  @Post('shared/resources/:shareId/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access a shared resource' })
  @ApiResponse({ status: 200, description: 'Resource accessed successfully' })
  async accessSharedResource(
    @Request() req,
    @Param('shareId') shareId: string,
    @Body() accessDto: {
      accessType: 'VIEW' | 'DOWNLOAD' | 'EXPORT' | 'MODIFY';
      metadata?: any;
    }
  ) {
    return this.sharedResourcesService.accessSharedResource(
      shareId,
      req.user.userId,
      accessDto.accessType,
      accessDto.metadata,
    );
  }

  @Delete('shared/resources/:shareId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke resource share' })
  @ApiResponse({ status: 200, description: 'Resource share revoked successfully' })
  async revokeResourceShare(@Request() req, @Param('shareId') shareId: string) {
    await this.sharedResourcesService.revokeResourceShare(shareId, req.user.userId);
    return { message: 'Resource share revoked successfully' };
  }

  @Get('shared/resources/:shareId/logs')
  @ApiOperation({ summary: 'Get resource access logs' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Limit number of logs' })
  @ApiResponse({ status: 200, description: 'Access logs retrieved successfully' })
  async getResourceAccessLogs(
    @Request() req,
    @Param('shareId') shareId: string,
    @Query('limit') limit?: number
  ) {
    return this.sharedResourcesService.getResourceAccessLogs(
      shareId,
      req.user.userId,
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  @Get('analytics/sharing')
  @ApiOperation({ summary: 'Get resource sharing analytics' })
  @ApiResponse({ status: 200, description: 'Sharing analytics retrieved successfully' })
  async getResourceSharingAnalytics(@Request() req) {
    return this.sharedResourcesService.getResourceSharingAnalytics(req.user.userId);
  }

  // Collaborative Sessions
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start collaborative session' })
  @ApiResponse({ status: 201, description: 'Collaborative session started successfully' })
  async startCollaborativeSession(
    @Request() req,
    @Body() sessionDto: {
      workspaceId: string;
      participants: string[];
      sessionType: 'DEBUG' | 'DEVELOPMENT' | 'REVIEW' | 'MONITORING';
    }
  ) {
    return this.collaborationService.startCollaborativeSession(
      req.user.userId,
      sessionDto.workspaceId,
      sessionDto.participants,
      sessionDto.sessionType,
    );
  }

  @Post('sessions/:sessionId/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join collaborative session' })
  @ApiResponse({ status: 200, description: 'Collaborative session joined successfully' })
  async joinCollaborativeSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.collaborationService.joinCollaborativeSession(sessionId, req.user.userId);
  }

  // Bulk Operations
  @Post('share/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk share resources' })
  @ApiResponse({ status: 201, description: 'Resources shared successfully' })
  async bulkShareResources(
    @Request() req,
    @Body() bulkShareDto: {
      resources: Array<{
        resourceType: string;
        resourceId: string;
      }>;
      targetType: 'USER' | 'TEAM' | 'WORKSPACE';
      targetId: string;
      permissions: string[];
      expiresAt?: Date;
    }
  ) {
    return this.sharedResourcesService.bulkShareResources(
      bulkShareDto.resources,
      req.user.userId,
      bulkShareDto.targetType,
      bulkShareDto.targetId,
      bulkShareDto.permissions,
      bulkShareDto.expiresAt,
    );
  }
}