import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async uploadAvatar(token: string, file: any): Promise<{ avatarUrl: string; user: any }> {
    try {
      // Validate token and get user
      const tokenData = await this.authService.validateToken(token);
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: tokenData.userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(file.path);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = file.mimetype;
      
      // Create data URL format: data:image/jpeg;base64,/9j/4AAQSkZJRgABA...
      const avatarDataUrl = `data:${mimeType};base64,${base64Data}`;

      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Update user with new avatar data URL
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatar: avatarDataUrl },
      });

      this.logger.log(`Avatar uploaded for user ${user.id} (${Math.round(base64Data.length / 1024)}KB)`);

      return {
        avatarUrl: avatarDataUrl,
        user: {
          id: updatedUser.id,
          wallet: updatedUser.wallet,
          email: updatedUser.email,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          authMethod: updatedUser.email ? 'email' : (updatedUser as any).totpSecret ? 'authenticator' : 'wallet',
          avatar: updatedUser.avatar,
          totalEarnings: updatedUser.totalEarnings,
          totalMatches: updatedUser.totalMatches,
          wins: updatedUser.wins,
          losses: updatedUser.losses,
          winRate: updatedUser.winRate,
          reputation: updatedUser.reputation,
          usernameChanged: (updatedUser as any).usernameChanged,
          profileVisibility: updatedUser.profileVisibility,
          showUsername: updatedUser.showUsername,
        },
      };
    } catch (error) {
      // Clean up uploaded file if database update fails
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      this.logger.error(`Avatar upload failed: ${error.message}`);
      throw error;
    }
  }

  async deleteAvatar(token: string): Promise<{ user: any }> {
    try {
      // Validate token and get user
      const tokenData = await this.authService.validateToken(token);
      if (!tokenData) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: tokenData.userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Update user to remove avatar
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatar: null },
      });

      this.logger.log(`Avatar deleted for user ${user.id}`);

      return {
        user: {
          id: updatedUser.id,
          wallet: updatedUser.wallet,
          email: updatedUser.email,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          authMethod: updatedUser.email ? 'email' : (updatedUser as any).totpSecret ? 'authenticator' : 'wallet',
          avatar: updatedUser.avatar,
          totalEarnings: updatedUser.totalEarnings,
          totalMatches: updatedUser.totalMatches,
          wins: updatedUser.wins,
          losses: updatedUser.losses,
          winRate: updatedUser.winRate,
          reputation: updatedUser.reputation,
          usernameChanged: (updatedUser as any).usernameChanged,
          profileVisibility: updatedUser.profileVisibility,
          showUsername: updatedUser.showUsername,
        },
      };
    } catch (error) {
      this.logger.error(`Avatar deletion failed: ${error.message}`);
      throw error;
    }
  }
} 