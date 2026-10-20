import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { permissionKeysFromRoles } from "../access-control/permission-context";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly db: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET") ?? "dev-only-secret",
    });
  }
  async validate(payload: {
    sub: string;
    companyId: string;
    authVersion?: number;
  }) {
    const user = await this.db.user.findFirst({
      where: {
        id: payload.sub,
        companyId: payload.companyId,
        isActive: true,
        company: { isActive: true },
      },
      include: { accessRoles: { include: { role: true } } },
    });
    if (!user || (payload.authVersion ?? 0) !== user.authVersion)
      throw new UnauthorizedException("Session expired. Please sign in again.");
    return {
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
      authVersion: user.authVersion,
      permissions: permissionKeysFromRoles(user.accessRoles),
    };
  }
}
