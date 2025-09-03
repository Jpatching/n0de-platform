import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpStatus, HttpException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../email/email.service';
import { Logger } from '@nestjs/common';

interface InviteTeamMemberDto {
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  name?: string;
}

interface UpdateTeamMemberDto {
  role?: 'admin' | 'developer' | 'viewer';
  status?: 'active' | 'suspended';
}

/**
 * Team Management Controller - Real Database Integration
 * Manages actual users and team invitations
 */
@Controller('team')
@UseGuards(JwtAuthGuard)
export class TeamController {
  private readonly logger = new Logger(TeamController.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * GET /api/v1/team
   * Get all team members for the current organization
   */
  @Get()
  async getTeamMembers(@Request() req) {
    try {
      const userId = req.user.id;
      
      // Get user's organization
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true }
      });

      if (!user?.organizationId) {
        // User doesn't have an organization yet, return just themselves
        return [{
          id: user.id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role: 'owner',
          status: 'active',
          joinedDate: user.createdAt,
          lastActive: user.lastLoginAt || user.createdAt,
          isOwner: true,
          permissions: ['all']
        }];
      }

      // Get all team members from organization
      const teamMembers = await this.prisma.user.findMany({
        where: { organizationId: user.organizationId },
        include: {
          organizationRole: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Format team members data
      return teamMembers.map(member => ({
        id: member.id,
        name: member.name || member.email.split('@')[0],
        email: member.email,
        role: member.organizationRole?.role || 'developer',
        status: member.status || 'active',
        joinedDate: member.createdAt,
        lastActive: member.lastLoginAt || member.createdAt,
        isOwner: member.id === user.id,
        permissions: this.getRolePermissions(member.organizationRole?.role || 'developer')
      }));

    } catch (error) {
      this.logger.error('Failed to get team members:', error);
      throw new HttpException('Failed to retrieve team members', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/v1/team/invite
   * Invite a new team member via email
   */
  @Post('invite')
  async inviteTeamMember(@Request() req, @Body() inviteData: InviteTeamMemberDto) {
    try {
      const userId = req.user.id;
      
      // Get user's organization
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true }
      });

      if (!user?.organizationId) {
        throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: inviteData.email }
      });

      if (existingUser && existingUser.organizationId === user.organizationId) {
        throw new HttpException('User already in team', HttpStatus.CONFLICT);
      }

      // Create invitation
      const invitation = await this.prisma.teamInvitation.create({
        data: {
          email: inviteData.email,
          role: inviteData.role,
          organizationId: user.organizationId,
          invitedById: userId,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Send invitation email
      await this.emailService.sendTeamInvitation({
        to: inviteData.email,
        inviterName: user.name || user.email.split('@')[0],
        organizationName: user.organization?.name || 'N0DE Platform',
        role: inviteData.role,
        inviteToken: invitation.token,
        inviteUrl: `${process.env.FRONTEND_URL}/team/join/${invitation.token}`
      });

      this.logger.log(`Team invitation sent to ${inviteData.email} by ${user.email}`);

      return {
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt
        }
      };

    } catch (error) {
      this.logger.error('Failed to invite team member:', error);
      throw new HttpException(
        error instanceof HttpException ? error.message : 'Failed to send invitation', 
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /api/v1/team/join/:token
   * Accept team invitation
   */
  @Post('join/:token')
  async acceptInvitation(@Param('token') token: string, @Request() req) {
    try {
      const userId = req.user.id;

      // Find invitation
      const invitation = await this.prisma.teamInvitation.findUnique({
        where: { token },
        include: { organization: true, invitedBy: true }
      });

      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        throw new HttpException('Invalid or expired invitation', HttpStatus.BAD_REQUEST);
      }

      if (invitation.email !== req.user.email) {
        throw new HttpException('Invitation not for this email address', HttpStatus.FORBIDDEN);
      }

      // Update user with organization and role
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          organizationId: invitation.organizationId,
          organizationRole: {
            create: {
              role: invitation.role,
              organizationId: invitation.organizationId
            }
          }
        }
      });

      // Mark invitation as accepted
      await this.prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { 
          status: 'accepted',
          acceptedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Successfully joined team',
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name
        },
        role: invitation.role
      };

    } catch (error) {
      this.logger.error('Failed to accept invitation:', error);
      throw new HttpException(
        error instanceof HttpException ? error.message : 'Failed to accept invitation',
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PUT /api/v1/team/:memberId
   * Update team member role or status
   */
  @Put(':memberId')
  async updateTeamMember(
    @Param('memberId') memberId: string,
    @Body() updateData: UpdateTeamMemberDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      
      // Verify user has admin permissions
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { organizationRole: true }
      });

      if (user?.organizationRole?.role !== 'admin' && user?.organizationRole?.role !== 'owner') {
        throw new HttpException('Insufficient permissions', HttpStatus.FORBIDDEN);
      }

      // Update team member
      const updatedMember = await this.prisma.user.update({
        where: { 
          id: memberId,
          organizationId: user.organizationId 
        },
        data: {
          status: updateData.status,
          organizationRole: updateData.role ? {
            upsert: {
              create: { role: updateData.role, organizationId: user.organizationId },
              update: { role: updateData.role }
            }
          } : undefined
        },
        include: { organizationRole: true }
      });

      return {
        success: true,
        member: {
          id: updatedMember.id,
          name: updatedMember.name,
          email: updatedMember.email,
          role: updatedMember.organizationRole?.role,
          status: updatedMember.status
        }
      };

    } catch (error) {
      this.logger.error('Failed to update team member:', error);
      throw new HttpException('Failed to update team member', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * DELETE /api/v1/team/:memberId
   * Remove team member
   */
  @Delete(':memberId')
  async removeTeamMember(@Param('memberId') memberId: string, @Request() req) {
    try {
      const userId = req.user.id;
      
      if (memberId === userId) {
        throw new HttpException('Cannot remove yourself from team', HttpStatus.BAD_REQUEST);
      }

      // Verify user has admin permissions
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { organizationRole: true }
      });

      if (user?.organizationRole?.role !== 'admin' && user?.organizationRole?.role !== 'owner') {
        throw new HttpException('Insufficient permissions', HttpStatus.FORBIDDEN);
      }

      // Remove team member
      await this.prisma.user.update({
        where: { 
          id: memberId,
          organizationId: user.organizationId 
        },
        data: {
          organizationId: null,
          organizationRole: {
            delete: true
          }
        }
      });

      return {
        success: true,
        message: 'Team member removed successfully'
      };

    } catch (error) {
      this.logger.error('Failed to remove team member:', error);
      throw new HttpException('Failed to remove team member', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/v1/team/invitations
   * Get pending invitations
   */
  @Get('invitations')
  async getPendingInvitations(@Request() req) {
    try {
      const userId = req.user.id;
      
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true }
      });

      if (!user?.organizationId) {
        return [];
      }

      const invitations = await this.prisma.teamInvitation.findMany({
        where: {
          organizationId: user.organizationId,
          status: 'pending',
          expiresAt: { gt: new Date() }
        },
        include: {
          invitedBy: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        invitedBy: {
          name: inv.invitedBy.name,
          email: inv.invitedBy.email
        }
      }));

    } catch (error) {
      this.logger.error('Failed to get pending invitations:', error);
      throw new HttpException('Failed to retrieve invitations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissions = {
      owner: ['all'],
      admin: ['read', 'write', 'api_keys', 'team_manage', 'billing'],
      developer: ['read', 'write', 'api_keys'],
      viewer: ['read']
    };

    return rolePermissions[role] || ['read'];
  }
}