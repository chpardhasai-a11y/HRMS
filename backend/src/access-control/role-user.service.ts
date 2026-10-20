import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { ListAccessDto } from "./access-control.dto";
import {
  CreateAccessUserDto,
  CreateRoleDto,
  ListRoleUserDto,
  UpdateAccessUserDto,
  UpdateRoleDto,
} from "./role-user.dto";
import { delegablePermission, grantableKeys } from "./permission-context";
import { PERMISSIONS } from "./permissions.catalog";

const userSelect = {
  id: true,
  companyId: true,
  email: true,
  role: true,
  employeeCode: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: { name: true } },
  accessRoles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          isActive: true,
          level: { select: { id: true, number: true, displayName: true } },
          permissionKeys: true,
        },
      },
    },
  },
} as const;
@Injectable()
export class RoleUserService {
  constructor(private readonly db: PrismaService) {}
  private async lock(tx: any, companyId: string) {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`access:${companyId}`}))`;
  }
  private async audit(tx: any, u: RequestUser, action: string, metadata: any) {
    await tx.securityAuditLog.create({
      data: {
        companyId: u.companyId,
        userId: u.sub,
        action,
        metadata: JSON.parse(JSON.stringify(metadata)),
      },
    });
  }
  private where(u: RequestUser, q: ListAccessDto, fields: string[]) {
    return {
      companyId: u.companyId,
      ...(q.status ? { isActive: q.status === "active" } : {}),
      ...(q.search
        ? {
            OR: fields.map((f) => ({
              [f]: { contains: q.search, mode: "insensitive" },
            })),
          }
        : {}),
    } as any;
  }
  async roles(u: RequestUser, q: ListAccessDto) {
    const where = this.where(u, q, ["name", "description"]);
    const [items, total] = await this.db.$transaction([
      this.db.accessRole.findMany({
        where,
        include: { level: true, _count: { select: { users: true } } },
        orderBy: [{ level: { number: "asc" } }, { name: "asc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.accessRole.count({ where }),
    ]);
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  async role(id: string, u: RequestUser) {
    const r = await this.db.accessRole.findFirst({
      where: { id, companyId: u.companyId },
      include: { level: true, _count: { select: { users: true } } },
    });
    if (!r) throw new NotFoundException("Role not found");
    return r;
  }
  async roleOptions(u: RequestUser) {
    return {
      levels: await this.db.accessLevel.findMany({
        where: { companyId: u.companyId },
        orderBy: { number: "asc" },
      }),
      permissions: PERMISSIONS.map((p) => ({
        ...p,
        assignable: delegablePermission(p),
      })),
    };
  }
  async saveRole(
    u: RequestUser,
    dto: CreateRoleDto | UpdateRoleDto,
    id?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, u.companyId);
      const before = id
        ? await tx.accessRole.findFirst({
            where: { id, companyId: u.companyId },
          })
        : null;
      if (id && !before) throw new NotFoundException("Role not found");
      if (before && before.revision !== (dto as UpdateRoleDto).revision)
        throw new ConflictException("Role changed. Reopen it before saving.");
      const level = await tx.accessLevel.findFirst({
        where: { id: dto.levelId, companyId: u.companyId },
      });
      if (!level || (!level.isActive && before?.levelId !== level.id))
        throw new BadRequestException(
          "Select an active level in your organization",
        );
      const allowed = grantableKeys();
      if (dto.permissionKeys.some((k) => !allowed.has(k)))
        throw new BadRequestException(
          "One or more permissions cannot be assigned to organization roles",
        );
      if (
        await tx.accessRole.findFirst({
          where: {
            companyId: u.companyId,
            name: { equals: dto.name.trim(), mode: "insensitive" },
            ...(id ? { id: { not: id } } : {}),
          },
        })
      )
        throw new ConflictException("Role name already exists");
      const data = {
        name: dto.name.trim(),
        description: dto.description?.trim() || "",
        levelId: dto.levelId,
        permissionKeys: dto.permissionKeys,
        isActive: dto.isActive ?? before?.isActive ?? true,
      };
      const after = before
        ? await tx.accessRole.update({
            where: { id },
            data: { ...data, revision: { increment: 1 } },
          })
        : await tx.accessRole.create({
            data: { ...data, companyId: u.companyId },
          });
      await this.audit(
        tx,
        u,
        before ? "ACCESS_ROLE_UPDATED" : "ACCESS_ROLE_CREATED",
        { roleId: after.id, before, after },
      );
      return after;
    });
  }
  async roleStatus(
    id: string,
    u: RequestUser,
    isActive: boolean,
    revision: number,
  ) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, u.companyId);
      const before = await tx.accessRole.findFirst({
        where: { id, companyId: u.companyId },
      });
      if (!before) throw new NotFoundException("Role not found");
      if (before.revision !== revision)
        throw new ConflictException("Role changed. Reopen it before saving.");
      const after = await tx.accessRole.update({
        where: { id },
        data: { isActive, revision: { increment: 1 } },
      });
      await this.audit(tx, u, "ACCESS_ROLE_STATUS_CHANGED", {
        roleId: id,
        before,
        after,
      });
      return after;
    });
  }
  async users(u: RequestUser, q: ListRoleUserDto) {
    const where = this.where(u, q, ["email", "employeeCode"]);
    where.role = q.accountType || { not: "platform_admin" };
    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (q.activity === "recent") {
      where.isActive = true;
      where.lastLoginAt = { gte: recentSince };
    }
    if (q.search)
      where.OR.push({
        employee: { name: { contains: q.search, mode: "insensitive" } },
      });
    if (q.roleId)
      where.accessRoles = {
        some: { roleId: q.roleId, companyId: u.companyId },
      };
    const scope = {
      companyId: u.companyId,
      role: { not: "platform_admin" as const },
    };
    return this.db.$transaction(async (tx) => {
      const [items, total, active, inactive, recent, roleOptions] =
        await Promise.all([
          tx.user.findMany({
            where,
            select: userSelect,
            orderBy: { email: "asc" },
            skip: (q.page - 1) * q.pageSize,
            take: q.pageSize,
          }),
          tx.user.count({ where }),
          tx.user.count({ where: { ...scope, isActive: true } }),
          tx.user.count({ where: { ...scope, isActive: false } }),
          tx.user.count({
            where: {
              ...scope,
              isActive: true,
              lastLoginAt: { gte: recentSince },
            },
          }),
          tx.accessRole.findMany({
            where: { companyId: u.companyId },
            select: { id: true, name: true, isActive: true },
            orderBy: { name: "asc" },
          }),
        ]);
      const memberships = await tx.flowMembership.findMany({
        where: {
          companyId: u.companyId,
          userId: { in: items.map((i) => i.id) },
          kind: { in: ["team", "manager"] },
        },
      });
      const [teams, managers] = await Promise.all([
        tx.team.findMany({
          where: {
            companyId: u.companyId,
            id: {
              in: memberships
                .filter((m) => m.kind === "team")
                .map((m) => m.referenceId),
            },
          },
          select: { id: true, name: true, isActive: true },
        }),
        tx.user.findMany({
          where: {
            companyId: u.companyId,
            id: {
              in: memberships
                .filter((m) => m.kind === "manager")
                .map((m) => m.referenceId),
            },
          },
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        }),
      ]);
      return {
        items: items.map((person) => ({
          ...person,
          teams: teams.filter((t) =>
            memberships.some(
              (m) =>
                m.userId === person.id &&
                m.kind === "team" &&
                m.referenceId === t.id,
            ),
          ),
          managers: managers
            .filter((t) =>
              memberships.some(
                (m) =>
                  m.userId === person.id &&
                  m.kind === "manager" &&
                  m.referenceId === t.id,
              ),
            )
            .map((m) => ({ id: m.id, name: m.employee?.name || m.email })),
        })),
        total,
        page: q.page,
        pageSize: q.pageSize,
        summary: { active, inactive, recent },
        roleOptions,
      };
    });
  }
  async user(id: string, u: RequestUser, tx: any = this.db) {
    const r = await tx.user.findFirst({
      where: { id, companyId: u.companyId, role: { not: "platform_admin" } },
      select: userSelect,
    });
    if (!r) throw new NotFoundException("User not found");
    return r;
  }
  async employees(u: RequestUser, q: ListAccessDto) {
    const where = {
      companyId: u.companyId,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" as const } },
              { code: { contains: q.search, mode: "insensitive" as const } },
              { email: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.employee.findMany({
        where,
        select: {
          code: true,
          name: true,
          email: true,
          users: { select: { id: true } },
        },
        orderBy: { name: "asc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.employee.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  private async references(
    tx: any,
    u: RequestUser,
    dto: { employeeCode?: string; roleIds: string[] },
    id?: string,
  ) {
    if (dto.employeeCode) {
      if (
        !(await tx.employee.findFirst({
          where: { companyId: u.companyId, code: dto.employeeCode },
        }))
      )
        throw new BadRequestException(
          "Employee not found in your organization",
        );
      if (
        await tx.user.findFirst({
          where: {
            companyId: u.companyId,
            employeeCode: dto.employeeCode,
            ...(id ? { id: { not: id } } : {}),
          },
        })
      )
        throw new ConflictException(
          "This employee is already linked to another account",
        );
    }
    const previous = id
      ? await tx.accessUserRole.findMany({
          where: { companyId: u.companyId, userId: id },
          select: { roleId: true },
        })
      : [];
    const roles = await tx.accessRole.findMany({
      where: { companyId: u.companyId, id: { in: dto.roleIds } },
    });
    if (
      roles.length !== dto.roleIds.length ||
      roles.some(
        (r: any) =>
          !r.isActive && !previous.some((p: any) => p.roleId === r.id),
      )
    )
      throw new BadRequestException("Select active roles in your organization");
  }
  private async accountSafety(
    tx: any,
    u: RequestUser,
    before: any,
    after: { role: string; isActive: boolean },
  ) {
    if (before.id === u.sub && (after.role !== "org_admin" || !after.isActive))
      throw new ForbiddenException(
        "You cannot disable your own account or remove your administrator access",
      );
    if (
      before.isActive &&
      before.role === "org_admin" &&
      (!after.isActive || after.role !== "org_admin")
    ) {
      if (
        (await tx.user.count({
          where: {
            companyId: u.companyId,
            role: "org_admin",
            isActive: true,
            id: { not: before.id },
          },
        })) === 0
      )
        throw new ConflictException(
          "Keep at least one active organization administrator",
        );
    }
  }
  private safeAudit(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      employeeCode: user.employeeCode,
      roleIds: user.accessRoles?.map((r: any) => r.role.id) || [],
    };
  }
  async createUser(u: RequestUser, dto: CreateAccessUserDto) {
    if (Buffer.byteLength(dto.password, "utf8") > 72)
      throw new BadRequestException("Password must be at most 72 UTF-8 bytes");
    const hash = await bcrypt.hash(dto.password, 12);
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, u.companyId);
      await this.references(tx, u, dto);
      const user = await tx.user.create({
        data: {
          companyId: u.companyId,
          email: dto.email.trim().toLowerCase(),
          role: dto.role,
          employeeCode: dto.employeeCode || null,
          passwordHash: hash,
          passwordChangedAt: new Date(),
          isActive: dto.isActive ?? true,
        },
        select: userSelect,
      });
      if (dto.roleIds.length)
        await tx.accessUserRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            companyId: u.companyId,
            userId: user.id,
            roleId,
          })),
        });
      const after = await this.user(user.id, u, tx);
      await this.audit(tx, u, "ACCESS_USER_CREATED", this.safeAudit(after));
      return after;
    });
  }
  async updateUser(id: string, u: RequestUser, dto: UpdateAccessUserDto) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, u.companyId);
      const before = await this.user(id, u, tx);
      if (before.updatedAt.toISOString() !== dto.updatedAt)
        throw new ConflictException(
          "User changed. Reopen the account before saving.",
        );
      await this.accountSafety(tx, u, before, dto);
      await this.references(tx, u, dto, id);
      await tx.user.update({
        where: { id },
        data: {
          email: dto.email.trim().toLowerCase(),
          role: dto.role,
          employeeCode: dto.employeeCode || null,
          isActive: dto.isActive,
          authVersion: { increment: 1 },
        },
      });
      await tx.accessUserRole.deleteMany({
        where: { companyId: u.companyId, userId: id },
      });
      if (dto.roleIds.length)
        await tx.accessUserRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            companyId: u.companyId,
            userId: id,
            roleId,
          })),
        });
      const after = await this.user(id, u, tx);
      await this.audit(tx, u, "ACCESS_USER_UPDATED", {
        before: this.safeAudit(before),
        after: this.safeAudit(after),
      });
      return after;
    });
  }
  async userStatus(
    id: string,
    u: RequestUser,
    isActive: boolean,
    updatedAt: string,
  ) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, u.companyId);
      const before = await this.user(id, u, tx);
      if (before.updatedAt.toISOString() !== updatedAt)
        throw new ConflictException(
          "User changed. Reopen the account before saving.",
        );
      await this.accountSafety(tx, u, before, { role: before.role, isActive });
      await tx.user.update({
        where: { id },
        data: { isActive, authVersion: { increment: 1 } },
      });
      const after = await this.user(id, u, tx);
      await this.audit(tx, u, "ACCESS_USER_STATUS_CHANGED", {
        before: this.safeAudit(before),
        after: this.safeAudit(after),
      });
      return after;
    });
  }
  async password(
    id: string,
    u: RequestUser,
    password: string,
    updatedAt: string,
  ) {
    if (id === u.sub)
      throw new BadRequestException(
        "Use password recovery to change your own password",
      );
    if (Buffer.byteLength(password, "utf8") > 72)
      throw new BadRequestException("Password must be at most 72 UTF-8 bytes");
    const passwordHash = await bcrypt.hash(password, 12);
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, u.companyId);
      const before = await this.user(id, u, tx);
      if (before.updatedAt.toISOString() !== updatedAt)
        throw new ConflictException(
          "User changed. Reopen the account before resetting its password.",
        );
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          authVersion: { increment: 1 },
        },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await this.audit(tx, u, "ACCESS_USER_PASSWORD_RESET", {
        userId: id,
        sessionsRevoked: true,
      });
      return { success: true };
    });
  }
}
