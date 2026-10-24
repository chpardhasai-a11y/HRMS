import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../common/decorators/current-user.decorator";
import {
  CreateLevelDto,
  ListAccessDto,
  UpdateLevelDto,
} from "./access-control.dto";
import { PERMISSIONS } from "./permissions.catalog";
import {
  BUSINESS_PERMISSION_GROUPS,
  CATALOG_PERMISSION_GROUPS,
} from "./business-permissions";
import { roleRelationships } from "./catalog-relations";

@Injectable()
export class AccessControlService {
  constructor(private readonly db: PrismaService) {}
  permissions(q: ListAccessDto) {
    const search = q.search?.trim().toLowerCase();
    const filtered = PERMISSIONS.filter(
      (p) =>
        (!q.module || p.module === q.module) &&
        (!q.action || p.action === q.action) &&
        (!search ||
          [p.key, p.name, p.module, p.description, p.action, p.scope]
            .join(" ")
            .toLowerCase()
            .includes(search)),
    );
    return {
      items: filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
      total: filtered.length,
      page: q.page,
      pageSize: q.pageSize,
      modules: [...new Set(PERMISSIONS.map((p) => p.module))].sort(),
      actions: [...new Set(PERMISSIONS.map((p) => p.action))].sort(),
      catalogTotal: PERMISSIONS.length,
      businessGroups: BUSINESS_PERMISSION_GROUPS,
      catalogGroups: CATALOG_PERMISSION_GROUPS,
    };
  }
  async levels(user: RequestUser, q: ListAccessDto) {
    const search = q.search?.trim();
    const numeric = /^L?[1-9]\d*$/i.test(search || "")
      ? Number(search!.replace(/^L/i, ""))
      : undefined;
    const where: any = {
      companyId: user.companyId,
      ...(q.status ? { isActive: q.status === "active" } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              ...(numeric && numeric <= 2147483647
                ? [{ number: numeric }]
                : []),
            ],
          }
        : {}),
    };
    return this.db.$transaction(async (tx) => {
      const [rows, total] = await Promise.all([
        tx.accessLevel.findMany({
          where,
          orderBy: { number: "asc" },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
        tx.accessLevel.count({ where }),
      ]);
      const roles = await tx.accessRole.findMany({
        where: {
          companyId: user.companyId,
          levelId: { in: rows.map((r) => r.id) },
        },
        select: { id: true, levelId: true },
      });
      const relationships = await roleRelationships(
        tx,
        user.companyId,
        roles.map((r) => r.id),
      );
      return {
        items: rows.map((r) => {
          const linkedRoles = roles.filter((role) => role.levelId === r.id),
            teams = new Map<
              string,
              { id: string; name: string; isActive: boolean }
            >();
          const activeUsers = new Set<string>();
          for (const role of linkedRoles) {
            const relation = relationships.get(role.id);
            relation?.teams.forEach((t) => teams.set(t.id, t));
            relation?.activeUserIds.forEach((id) => activeUsers.add(id));
          }
          return {
            ...r,
            code: `L${r.number}`,
            roleCount: linkedRoles.length,
            activeUserCount: activeUsers.size,
            teams: [...teams.values()].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          };
        }),
        total,
        page: q.page,
        pageSize: q.pageSize,
      };
    });
  }
  async saveLevel(
    user: RequestUser,
    dto: CreateLevelDto | UpdateLevelDto,
    id?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`levels:${user.companyId}`}))`;
      const before = id
        ? await tx.accessLevel.findFirst({
            where: { id, companyId: user.companyId },
          })
        : null;
      if (id && !before) throw new NotFoundException("Level not found");
      const data = {
        ...dto,
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName.trim() || null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      };
      const after = id
        ? await tx.accessLevel.update({ where: { id }, data })
        : await tx.accessLevel.create({
            data: {
              ...data,
              number: (dto as CreateLevelDto).number,
              companyId: user.companyId,
            },
          });
      await tx.securityAuditLog.create({
        data: {
          companyId: user.companyId,
          userId: user.sub,
          action: id ? "ACCESS_LEVEL_UPDATED" : "ACCESS_LEVEL_CREATED",
          metadata: JSON.parse(
            JSON.stringify({ levelId: after.id, before, after }),
          ),
        },
      });
      return { ...after, code: `L${after.number}` };
    });
  }
  async users(user: RequestUser, q: ListAccessDto) {
    const where = {
      companyId: user.companyId,
      isActive: true,
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search, mode: "insensitive" as const } },
              {
                employeeCode: {
                  contains: q.search,
                  mode: "insensitive" as const,
                },
              },
              {
                employee: {
                  name: { contains: q.search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          employeeCode: true,
          employee: { select: { name: true } },
        },
        orderBy: { email: "asc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
}
