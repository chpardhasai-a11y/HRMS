import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrgAdminGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const actor = await this.db.user.findFirst({
      where: {
        id: request.user.sub,
        companyId: request.user.companyId,
        role: "org_admin",
        isActive: true,
        company: { isActive: true },
      },
    });
    if (!actor)
      throw new ForbiddenException(
        "Organization administrator access required",
      );
    request.user = { ...request.user, role: actor.role, email: actor.email };
    return true;
  }
}
