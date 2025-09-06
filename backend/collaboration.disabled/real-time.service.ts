import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';

export interface CollaborativeSession {
  id: string;
  workspaceId: string;
  initiatorId: string;
  sessionType: 'DEBUG' | 'DEVELOPMENT' | 'REVIEW' | 'MONITORING';
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  participants: any[];
  settings: any;
  createdAt: Date;
}

export interface RealTimeMessage {
  type: 'CHAT' | 'NOTIFICATION' | 'SYSTEM' | 'CURSOR' | 'EDIT' | 'VOICE';
  sessionId?: string;
  workspaceId?: string;
  teamId?: string;
  userId: string;
  content: any;
  timestamp: Date;
  metadata?: any;
}

export interface UserPresence {
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  currentSession?: string;
  currentWorkspace?: string;
  lastActivity: Date;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/collaboration',
})
export class RealTimeService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealTimeService.name);
  private userConnections = new Map<string, Socket[]>();
  private sessionParticipants = new Map<string, Set<string>>();
  private userPresence = new Map<string, UserPresence>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store connection
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, []);
      }
      this.userConnections.get(userId).push(client);

      // Update presence
      this.updateUserPresence(userId, 'ONLINE', client);

      // Join user to their personal room
      client.join(`user:${userId}`);

      // Join user to their team rooms
      const userTeams = await this.getUserTeamIds(userId);
      userTeams.forEach(teamId => {
        client.join(`team:${teamId}`);
      });

      // Join user to their workspace rooms
      const userWorkspaces = await this.getUserWorkspaceIds(userId);
      userWorkspaces.forEach(workspaceId => {
        client.join(`workspace:${workspaceId}`);
      });

      // Notify presence change
      this.broadcastPresenceUpdate(userId);

      this.logger.log(`User ${userId} connected`, 'REAL_TIME');
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, 'REAL_TIME');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = this.getUserIdFromSocket(client);
      if (!userId) return;

      // Remove connection
      const connections = this.userConnections.get(userId) || [];
      const index = connections.indexOf(client);
      if (index > -1) {
        connections.splice(index, 1);
      }

      if (connections.length === 0) {
        this.userConnections.delete(userId);
        this.updateUserPresence(userId, 'OFFLINE', client);
        this.broadcastPresenceUpdate(userId);
      }

      this.logger.log(`User ${userId} disconnected`, 'REAL_TIME');
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`, 'REAL_TIME');
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(client: Socket, sessionId: string) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    try {
      // Verify session access
      const session = await this.prisma.collaborativeSession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });

      if (!session || !session.participants.some(p => p.id === userId)) {
        client.emit('error', { message: 'Access denied to session' });
        return;
      }

      // Join session room
      client.join(`session:${sessionId}`);

      // Add to session participants
      if (!this.sessionParticipants.has(sessionId)) {
        this.sessionParticipants.set(sessionId, new Set());
      }
      this.sessionParticipants.get(sessionId).add(userId);

      // Update user presence
      this.updateUserPresence(userId, 'BUSY', client, { currentSession: sessionId });

      // Notify other participants
      client.to(`session:${sessionId}`).emit('participant_joined', {
        userId,
        sessionId,
        timestamp: new Date(),
      });

      client.emit('session_joined', {
        sessionId,
        participants: Array.from(this.sessionParticipants.get(sessionId)),
      });

      this.logger.log(`User ${userId} joined session ${sessionId}`, 'REAL_TIME');
    } catch (error) {
      this.logger.error(`Join session error: ${error.message}`, 'REAL_TIME');
      client.emit('error', { message: 'Failed to join session' });
    }
  }

  @SubscribeMessage('leave_session')
  handleLeaveSession(client: Socket, sessionId: string) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    client.leave(`session:${sessionId}`);

    // Remove from session participants
    if (this.sessionParticipants.has(sessionId)) {
      this.sessionParticipants.get(sessionId).delete(userId);
    }

    // Update user presence
    this.updateUserPresence(userId, 'ONLINE', client);

    // Notify other participants
    client.to(`session:${sessionId}`).emit('participant_left', {
      userId,
      sessionId,
      timestamp: new Date(),
    });

    this.logger.log(`User ${userId} left session ${sessionId}`, 'REAL_TIME');
  }

  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, message: RealTimeMessage) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    try {
      // Validate message
      if (!message.type || !message.content) {
        client.emit('error', { message: 'Invalid message format' });
        return;
      }

      // Set sender
      message.userId = userId;
      message.timestamp = new Date();

      // Store message if it's a chat message
      if (message.type === 'CHAT') {
        await this.storeMessage(message);
      }

      // Broadcast message
      let room = '';
      if (message.sessionId) {
        room = `session:${message.sessionId}`;
      } else if (message.workspaceId) {
        room = `workspace:${message.workspaceId}`;
      } else if (message.teamId) {
        room = `team:${message.teamId}`;
      }

      if (room) {
        this.server.to(room).emit('message', message);
      }

      this.logger.log(`Message sent by ${userId} to ${room}`, 'REAL_TIME');
    } catch (error) {
      this.logger.error(`Message error: ${error.message}`, 'REAL_TIME');
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('cursor_update')
  handleCursorUpdate(client: Socket, data: {
    sessionId: string;
    position: { x: number; y: number };
    elementId?: string;
  }) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    client.to(`session:${data.sessionId}`).emit('cursor_update', {
      userId,
      position: data.position,
      elementId: data.elementId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('code_edit')
  async handleCodeEdit(client: Socket, data: {
    sessionId: string;
    fileId: string;
    changes: any[];
    version: number;
  }) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    try {
      // Store edit
      await this.storeCodeEdit(userId, data);

      // Broadcast to other participants
      client.to(`session:${data.sessionId}`).emit('code_edit', {
        userId,
        fileId: data.fileId,
        changes: data.changes,
        version: data.version,
        timestamp: new Date(),
      });

      this.logger.log(`Code edit by ${userId} in session ${data.sessionId}`, 'REAL_TIME');
    } catch (error) {
      this.logger.error(`Code edit error: ${error.message}`, 'REAL_TIME');
      client.emit('error', { message: 'Failed to process code edit' });
    }
  }

  @SubscribeMessage('screen_share')
  handleScreenShare(client: Socket, data: {
    sessionId: string;
    action: 'start' | 'stop';
    streamId?: string;
  }) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    client.to(`session:${data.sessionId}`).emit('screen_share', {
      userId,
      action: data.action,
      streamId: data.streamId,
      timestamp: new Date(),
    });

    this.logger.log(`Screen share ${data.action} by ${userId}`, 'REAL_TIME');
  }

  // Public notification methods
  async notifyTeamInvitation(teamId: string, invitation: any): Promise<void> {
    this.server.to(`team:${teamId}`).emit('team_invitation', {
      type: 'team_invitation_sent',
      invitation,
      timestamp: new Date(),
    });
  }

  async notifyTeamMemberJoined(teamId: string, member: any): Promise<void> {
    this.server.to(`team:${teamId}`).emit('team_member_joined', {
      type: 'team_member_joined',
      member,
      timestamp: new Date(),
    });
  }

  async notifyWorkspaceCreated(teamId: string, workspace: any): Promise<void> {
    this.server.to(`team:${teamId}`).emit('workspace_created', {
      type: 'workspace_created',
      workspace,
      timestamp: new Date(),
    });
  }

  async notifyResourceShared(targetType: string, targetId: string, resource: any): Promise<void> {
    const room = `${targetType.toLowerCase()}:${targetId}`;
    this.server.to(room).emit('resource_shared', {
      type: 'resource_shared',
      resource,
      timestamp: new Date(),
    });
  }

  async startCollaborativeSession(session: CollaborativeSession): Promise<void> {
    // Create session room
    const sessionRoom = `session:${session.id}`;
    this.sessionParticipants.set(session.id, new Set());

    // Notify workspace members
    this.server.to(`workspace:${session.workspaceId}`).emit('session_started', {
      type: 'collaborative_session_started',
      session,
      timestamp: new Date(),
    });

    this.logger.log(`Collaborative session ${session.id} started`, 'REAL_TIME');
  }

  async notifySessionInvitation(userId: string, session: CollaborativeSession): Promise<void> {
    this.server.to(`user:${userId}`).emit('session_invitation', {
      type: 'session_invitation_received',
      session,
      timestamp: new Date(),
    });
  }

  async joinCollaborativeSession(sessionId: string, userId: string): Promise<any> {
    // Add user to session participants
    if (!this.sessionParticipants.has(sessionId)) {
      this.sessionParticipants.set(sessionId, new Set());
    }
    this.sessionParticipants.get(sessionId).add(userId);

    // Return connection details (WebRTC signaling server info, etc.)
    return {
      sessionId,
      signalingServer: process.env.SIGNALING_SERVER || 'ws://localhost:3001',
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers for production
      ],
      participants: Array.from(this.sessionParticipants.get(sessionId)),
    };
  }

  // Presence management
  private updateUserPresence(
    userId: string,
    status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE',
    client: Socket,
    additionalData: Partial<UserPresence> = {},
  ): void {
    const deviceInfo = this.extractDeviceInfo(client);
    
    this.userPresence.set(userId, {
      userId,
      status,
      lastActivity: new Date(),
      deviceInfo,
      ...additionalData,
    });
  }

  private broadcastPresenceUpdate(userId: string): void {
    const presence = this.userPresence.get(userId);
    if (!presence) return;

    // Broadcast to user's teams and workspaces
    this.getUserTeamIds(userId).then(teamIds => {
      teamIds.forEach(teamId => {
        this.server.to(`team:${teamId}`).emit('presence_update', presence);
      });
    });

    this.getUserWorkspaceIds(userId).then(workspaceIds => {
      workspaceIds.forEach(workspaceId => {
        this.server.to(`workspace:${workspaceId}`).emit('presence_update', presence);
      });
    });
  }

  private getUserIdFromSocket(client: Socket): string | null {
    try {
      const token = client.handshake.auth?.token;
      if (!token) return null;

      const payload = this.jwtService.verify(token);
      return payload.sub;
    } catch (error) {
      return null;
    }
  }

  private extractDeviceInfo(client: Socket): any {
    const userAgent = client.handshake.headers['user-agent'] || '';
    
    // Simple device detection (you might want to use a proper library)
    let type = 'desktop';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      type = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }

    return {
      type,
      userAgent: userAgent.substring(0, 100), // Truncate for storage
    };
  }

  private async storeMessage(message: RealTimeMessage): Promise<void> {
    try {
      await this.prisma.collaborationMessage.create({
        data: {
          sessionId: message.sessionId,
          workspaceId: message.workspaceId,
          teamId: message.teamId,
          userId: message.userId,
          type: message.type,
          content: message.content,
          metadata: message.metadata,
          timestamp: message.timestamp,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store message: ${error.message}`, 'REAL_TIME');
    }
  }

  private async storeCodeEdit(userId: string, data: any): Promise<void> {
    try {
      await this.prisma.codeEdit.create({
        data: {
          sessionId: data.sessionId,
          userId,
          fileId: data.fileId,
          changes: data.changes,
          version: data.version,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store code edit: ${error.message}`, 'REAL_TIME');
    }
  }

  private async getUserTeamIds(userId: string): Promise<string[]> {
    try {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      return teamMembers.map(tm => tm.teamId);
    } catch (error) {
      this.logger.error(`Failed to get user teams: ${error.message}`, 'REAL_TIME');
      return [];
    }
  }

  private async getUserWorkspaceIds(userId: string): Promise<string[]> {
    try {
      const [ownedWorkspaces, sharedWorkspaces] = await Promise.all([
        this.prisma.workspace.findMany({
          where: { ownerId: userId },
          select: { id: true },
        }),
        this.prisma.workspaceAccess.findMany({
          where: { userId },
          select: { workspaceId: true },
        }),
      ]);

      const workspaceIds = [
        ...ownedWorkspaces.map(w => w.id),
        ...sharedWorkspaces.map(w => w.workspaceId),
      ];

      return [...new Set(workspaceIds)]; // Remove duplicates
    } catch (error) {
      this.logger.error(`Failed to get user workspaces: ${error.message}`, 'REAL_TIME');
      return [];
    }
  }

  // Cleanup methods
  async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await this.prisma.collaborativeSession.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    for (const session of expiredSessions) {
      await this.endSession(session.id);
    }
  }

  private async endSession(sessionId: string): Promise<void> {
    // Update session status
    await this.prisma.collaborativeSession.update({
      where: { id: sessionId },
      data: { status: 'ENDED' },
    });

    // Remove from active sessions
    this.sessionParticipants.delete(sessionId);

    // Notify participants
    this.server.to(`session:${sessionId}`).emit('session_ended', {
      sessionId,
      timestamp: new Date(),
    });

    this.logger.log(`Session ${sessionId} ended`, 'REAL_TIME');
  }
}