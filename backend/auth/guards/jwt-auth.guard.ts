import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    console.log("🔑 JWT Guard canActivate called!");

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log("🔑 Route isPublic:", isPublic);

    if (isPublic) {
      console.log("🔑 Route is public, allowing access");
      return true;
    }

    // Development mode bypass
    const isDevelopment = this.configService.get("NODE_ENV") !== "production";
    const devBypass = this.configService.get("DEV_AUTH_BYPASS") === "true";

    console.log("🔑 JWT Guard Debug:", {
      isDevelopment,
      devBypass,
      nodeEnv: this.configService.get("NODE_ENV"),
      devBypassEnv: this.configService.get("DEV_AUTH_BYPASS"),
    });

    if (isDevelopment && devBypass) {
      const request = context.switchToHttp().getRequest();
      // Create a mock user for development with real user ID
      request.user = {
        userId: "cmeytjlq400002dxgqotf1mcr",
        id: "cmeytjlq400002dxgqotf1mcr",
        email: "patchingjoshua@gmail.com",
        username: "patchingjoshua",
        sessionId: "dev-session-001",
      };
      console.log("🔑 Development bypass activated, user set:", request.user);
      return true;
    }

    console.log("🔑 Calling super.canActivate for JWT validation");
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException("Invalid or expired token");
    }
    return user;
  }
}
