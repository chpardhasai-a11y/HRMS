import { RoleUserService } from "./role-user.service";
import { Module } from "@nestjs/common";
import { TeamsModule } from "../org-masters/teams/teams.module";
import { AccessControlController } from "./access-control.controller";
import { AccessControlService } from "./access-control.service";
import { OrgAdminGuard } from "./org-admin.guard";
@Module({
  imports: [TeamsModule],
  controllers: [AccessControlController],
  providers: [AccessControlService, RoleUserService, OrgAdminGuard],
})
export class AccessControlModule {}
