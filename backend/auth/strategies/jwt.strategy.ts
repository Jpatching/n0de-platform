import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    console.log("🔑 JWT Strategy validate called with payload:", payload);
    const { sub: userId, email, sessionId } = payload;

    console.log("🔑 Validating session:", sessionId);
    // Validate session
    const session = await this.authService.validateSession(sessionId);
    if (!session) {
      console.log("🔑 Session validation failed for sessionId:", sessionId);
      throw new UnauthorizedException("Invalid or expired session");
    }

    const user = {
      id: userId, // Add id field for compatibility
      userId,
      email,
      sessionId,
      username: session.username,
    };

    console.log("🔑 JWT Strategy validate successful, returning user:", user);
    return user;
  }
}
