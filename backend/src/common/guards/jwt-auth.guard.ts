import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PATH_METADATA } from "@nestjs/common/constants";
import { scopedActor } from "../../access-control/permission-context";
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext) {
    const ok = await super.canActivate(context);
    const req = context.switchToHttp().getRequest();
    const base = Reflect.getMetadata(PATH_METADATA, context.getClass());
    req.user = scopedActor(
      req.user,
      `${String(base).replace(/\//g, ".")}.${context.getHandler().name}`,
    );
    return Boolean(ok);
  }
}
