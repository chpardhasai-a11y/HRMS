import { RoleUserService } from "./role-user.service";
import {
  CreateAccessUserDto,
  UpdateAccessUserDto,
  UserStatusDto,
  UserPasswordDto,
  CreateRoleDto,
  UpdateRoleDto,
  RoleStatusDto,
  ListRoleUserDto,
} from "./role-user.dto";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CurrentUser,
  RequestUser,
} from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { TeamsService } from "../org-masters/teams/teams.service";
import { CreateTeamDto, UpdateTeamDto } from "../org-masters/teams/dto";
import { AccessControlService } from "./access-control.service";
import {
  CreateLevelDto,
  ListAccessDto,
  MemberDto,
  StatusDto,
  UpdateLevelDto,
} from "./access-control.dto";
import { OrgAdminGuard } from "./org-admin.guard";

@Controller("access-control")
@UseGuards(JwtAuthGuard, OrgAdminGuard)
export class AccessControlController {
  constructor(
    private readonly service: AccessControlService,
    private readonly teams: TeamsService,
    private readonly accounts: RoleUserService,
  ) {}
  @Get("roles/options") roleOptions(@CurrentUser() u: RequestUser) {
    return this.accounts.roleOptions(u);
  }
  @Get("roles") roles(
    @CurrentUser() u: RequestUser,
    @Query() q: ListAccessDto,
  ) {
    return this.accounts.roles(u, q);
  }
  @Get("roles/:id") role(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
  ) {
    return this.accounts.role(id, u);
  }
  @Post("roles") createRole(
    @CurrentUser() u: RequestUser,
    @Body() b: CreateRoleDto,
  ) {
    return this.accounts.saveRole(u, b);
  }
  @Patch("roles/:id") updateRole(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
    @Body() b: UpdateRoleDto,
  ) {
    return this.accounts.saveRole(u, b, id);
  }
  @Patch("roles/:id/status") roleStatus(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
    @Body() b: RoleStatusDto,
  ) {
    return this.accounts.roleStatus(id, u, b.isActive, b.revision);
  }
  @Get("users") accountsList(
    @CurrentUser() u: RequestUser,
    @Query() q: ListRoleUserDto,
  ) {
    return this.accounts.users(u, q);
  }
  @Get("employees/options") employees(
    @CurrentUser() u: RequestUser,
    @Query() q: ListAccessDto,
  ) {
    return this.accounts.employees(u, q);
  }
  @Get("users/:id/detail") account(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
  ) {
    return this.accounts.user(id, u);
  }
  @Post("users") createUser(
    @CurrentUser() u: RequestUser,
    @Body() b: CreateAccessUserDto,
  ) {
    return this.accounts.createUser(u, b);
  }
  @Patch("users/:id") updateUser(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
    @Body() b: UpdateAccessUserDto,
  ) {
    return this.accounts.updateUser(id, u, b);
  }
  @Patch("users/:id/status") userStatus(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
    @Body() b: UserStatusDto,
  ) {
    return this.accounts.userStatus(id, u, b.isActive, b.updatedAt);
  }
  @Post("users/:id/password") password(
    @CurrentUser() u: RequestUser,
    @Param("id") id: string,
    @Body() b: UserPasswordDto,
  ) {
    return this.accounts.password(id, u, b.password, b.updatedAt);
  }
  @Get("permissions") permissions(@Query() q: ListAccessDto) {
    return this.service.permissions(q);
  }
  @Get("levels") levels(
    @CurrentUser() u: RequestUser,
    @Query() q: ListAccessDto,
  ) {
    return this.service.levels(u, q);
  }
  @Post("levels") createLevel(
    @CurrentUser() u: RequestUser,
    @Body() b: CreateLevelDto,
  ) {
    return this.service.saveLevel(u, b);
  }
  @Patch("levels/:id") updateLevel(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: UpdateLevelDto,
  ) {
    return this.service.saveLevel(u, b, id);
  }
  @Patch("levels/:id/status") levelStatus(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: StatusDto,
  ) {
    return this.service.saveLevel(u, b, id);
  }
  @Get("users/options") users(
    @CurrentUser() u: RequestUser,
    @Query() q: ListAccessDto,
  ) {
    return this.service.users(u, q);
  }
  @Get("teams") teamsList(
    @CurrentUser() u: RequestUser,
    @Query() q: ListAccessDto,
  ) {
    return this.teams.listPage(u, q);
  }
  @Post("teams") createTeam(
    @CurrentUser() u: RequestUser,
    @Body() b: CreateTeamDto,
  ) {
    return this.teams.create(b, u);
  }
  @Patch("teams/:id") updateTeam(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: UpdateTeamDto,
  ) {
    return this.teams.update(id, b, u);
  }
  @Patch("teams/:id/status") teamStatus(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: StatusDto,
  ) {
    return this.teams.update(id, b, u);
  }
  @Delete("teams/:id") deleteTeam(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.teams.delete(id, u);
  }
  @Get("teams/:id/members") members(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Query() q: ListAccessDto,
  ) {
    return this.teams.members(id, u, q);
  }
  @Post("teams/:id/members") addMember(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: MemberDto,
  ) {
    return this.teams.addMember(id, b.userId, u);
  }
  @Delete("teams/:id/members/:userId") removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.teams.removeMember(id, userId, u);
  }
}
