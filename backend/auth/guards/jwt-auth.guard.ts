import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Development mode bypass
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    const devBypass = this.configService.get('DEV_AUTH_BYPASS') === 'true';
    
    if (isDevelopment && devBypass) {
      const request = context.switchToHttp().getRequest();
      // Create a mock user for development
      request.user = {
        userId: 'dev-user-001',
        id: 'dev-user-001',
        email: 'dev@n0de.pro',
        username: 'developer',
        sessionId: 'dev-session-001'
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}