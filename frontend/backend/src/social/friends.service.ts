import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

export interface FriendWithStatus {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  status: 'online' | 'offline' | 'in-game';
  lastSeen?: Date;
  friendshipId: string;
  friendsSince: Date;
}

export interface FriendRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  addressee: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  status: FriendshipStatus;
  createdAt: Date;
}

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getFriends(userId: string): Promise<FriendWithStatus[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' },
        ],
      },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true, avatar: true, lastSeen: true },
        },
        addressee: {
          select: { id: true, username: true, displayName: true, avatar: true, lastSeen: true },
        },
      },
    });

    return friendships.map(friendship => {
      const friend = friendship.requesterId === userId 
        ? friendship.addressee 
        : friendship.requester;

      return {
        id: friend.id,
        username: friend.username || '',
        displayName: friend.displayName || '',
        avatar: friend.avatar || '',
        status: this.getUserOnlineStatus(friend.id),
        lastSeen: friend.lastSeen || undefined,
        friendshipId: friendship.id,
        friendsSince: friendship.acceptedAt || friendship.createdAt,
      };
    });
  }

  async getPendingRequests(userId: string): Promise<{
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
  }> {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'pending' },
        include: {
          requester: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
          addressee: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendship.findMany({
        where: { requesterId: userId, status: 'pending' },
        include: {
          requester: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
          addressee: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      incoming: incoming.map(this.mapToFriendRequest),
      outgoing: outgoing.map(this.mapToFriendRequest),
    };
  }

  async sendFriendRequest(requesterId: string, addresseeUsername: string) {
    // Find the addressee by username
    const addressee = await this.prisma.user.findUnique({
      where: { username: addresseeUsername },
    });

    if (!addressee) {
      throw new NotFoundException('User not found');
    }

    if (requesterId === addressee.id) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        throw new BadRequestException('You are already friends with this user');
      } else if (existingFriendship.status === 'pending') {
        throw new BadRequestException('Friend request already pending');
      } else if (existingFriendship.status === 'blocked') {
        throw new ForbiddenException('Cannot send friend request to this user');
      }
    }

    return this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: addressee.id,
        status: 'pending',
      },
    });
  }

  async acceptFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || friendship.addresseeId !== userId || friendship.status !== 'pending') {
      throw new NotFoundException('Friend request not found');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });
  }

  async rejectFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || friendship.addresseeId !== userId || friendship.status !== 'pending') {
      throw new NotFoundException('Friend request not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async cancelFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || friendship.requesterId !== userId || friendship.status !== 'pending') {
      throw new NotFoundException('Friend request not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || 
        (friendship.requesterId !== userId && friendship.addresseeId !== userId) ||
        friendship.status !== 'accepted') {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async blockUser(userId: string, targetUserId: string) {
    // Remove existing friendship if it exists
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    if (existingFriendship) {
      await this.prisma.friendship.delete({
        where: { id: existingFriendship.id },
      });
    }

    // Create block relationship
    return this.prisma.friendship.create({
      data: {
        requesterId: userId,
        addresseeId: targetUserId,
        status: 'blocked',
      },
    });
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    const blockRelationship = await this.prisma.friendship.findFirst({
      where: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
    });

    if (!blockRelationship) {
      throw new NotFoundException('Block relationship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: blockRelationship.id },
    });
  }

  async getBlockedUsers(userId: string) {
    const blockRelationships = await this.prisma.friendship.findMany({
      where: { requesterId: userId, status: 'blocked' },
      include: {
        addressee: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    return blockRelationships.map(relationship => relationship.addressee);
  }

  async searchUsers(query: string, currentUserId: string, limit: number = 20) {
    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, username: true, displayName: true, avatar: true },
      take: limit,
    });
  }

  async getFriendshipStatus(userId: string, targetUserId: string): Promise<{
    status: 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'blocked';
    friendshipId?: string;
  }> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return { status: 'none' };
    }

    if (friendship.status === 'accepted') {
      return { status: 'friends', friendshipId: friendship.id };
    }

    if (friendship.status === 'blocked') {
      return { status: 'blocked', friendshipId: friendship.id };
    }

    if (friendship.status === 'pending') {
      if (friendship.requesterId === userId) {
        return { status: 'pending_sent', friendshipId: friendship.id };
      } else {
        return { status: 'pending_received', friendshipId: friendship.id };
      }
    }

    return { status: 'none' };
  }

  private mapToFriendRequest(friendship: any): FriendRequest {
    return {
      id: friendship.id,
      requester: {
        id: friendship.requester.id,
        username: friendship.requester.username || '',
        displayName: friendship.requester.displayName || '',
        avatar: friendship.requester.avatar || '',
      },
      addressee: {
        id: friendship.addressee.id,
        username: friendship.addressee.username || '',
        displayName: friendship.addressee.displayName || '',
        avatar: friendship.addressee.avatar || '',
      },
      status: friendship.status as FriendshipStatus,
      createdAt: friendship.createdAt,
    };
  }

  private getUserOnlineStatus(userId: string): 'online' | 'offline' | 'in-game' {
    // This would be implemented with WebSocket connections or Redis
    // For now, return offline as default
    return 'offline';
  }
} 