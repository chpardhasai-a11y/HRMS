import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class FlowActorGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.user;
    const user = await this.db.user.findFirst({
      where: {
        id: token.sub,
        companyId: token.companyId,
        isActive: true,
        company: { isActive: true },
      },
    });
    if (!user) throw new UnauthorizedException("Your account is inactive");
    request.user = {
      ...token,
      role: user.role,
      email: user.email,
      employeeCode: user.employeeCode,
    };
    return true;
  }
}
