import { teamRoleCounts } from "../../access-control/catalog-relations";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../common/decorators/current-user.decorator";
import { CreateTeamDto, UpdateTeamDto } from "./dto";
import { ListAccessDto } from "../../access-control/access-control.dto";

// JSON workflow documents can contain nested task/escalation assignments.
export function referencesTeam(value: unknown, teamId: string): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  if (v.kind === "team" && Array.isArray(v.values) && v.values.includes(teamId))
    return true;
  return Object.values(v).some((child) => referencesTeam(child, teamId));
}
@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}
  private where(
    user: RequestUser,
    options?: { search?: string; status?: string },
  ) {
    return {
      companyId: user.companyId,
      ...(options?.search
        ? {
            OR: ["name", "code", "description"].map((key) => ({
              [key]: { contains: options.search, mode: "insensitive" },
            })),
          }
        : {}),
      ...(options?.status ? { isActive: options.status === "active" } : {}),
    } as any;
  }
  async validateWorkflowTeams(tx: any, document: unknown, user: RequestUser) {
    await this.lock(tx, user.companyId);
    const ids = new Set<string>();
    const visit = (value: any) => {
      if (!value || typeof value !== "object") return;
      if (value.kind === "team" && Array.isArray(value.values))
        value.values.forEach((id: string) => ids.add(id));
      Object.values(value).forEach(visit);
    };
    visit(document);
    if (
      ids.size &&
      (await tx.team.count({
        where: { companyId: user.companyId, id: { in: [...ids] } },
      })) !== ids.size
    )
      throw new BadRequestException(
        "Workflow references an unknown team in this organization",
      );
  }
  async findAll(
    user: RequestUser,
    options?: { search?: string; status?: string },
  ) {
    return this.prisma.team.findMany({
      where: this.where(user, options),
      orderBy: { name: "asc" },
      include: { department: { select: { id: true, name: true, code: true } } },
    });
  }
  async listPage(user: RequestUser, q: ListAccessDto) {
    const where = this.where(user, q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        include: {
          department: { select: { id: true, name: true, code: true } },
        },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);
    const counts = await this.prisma.flowMembership.groupBy({
      by: ["referenceId"],
      where: {
        companyId: user.companyId,
        kind: "team",
        referenceId: { in: rows.map((r) => r.id) },
      },
      _count: true,
    });
    const [roleCounts, totalTeams, activeTeams, totalRoles] = await Promise.all(
      [
        teamRoleCounts(
          this.prisma,
          user.companyId,
          rows.map((r) => r.id),
        ),
        this.prisma.team.count({ where: { companyId: user.companyId } }),
        this.prisma.team.count({
          where: { companyId: user.companyId, isActive: true },
        }),
        this.prisma.accessRole.count({ where: { companyId: user.companyId } }),
      ],
    );
    return {
      items: rows.map((r) => ({
        ...r,
        memberCount: counts.find((c) => c.referenceId === r.id)?._count || 0,
        memberRoleCount: roleCounts.get(r.id) || 0,
      })),
      total,
      page: q.page,
      pageSize: q.pageSize,
      summary: { totalTeams, activeTeams, totalRoles },
    };
  }
  async findOne(id: string, user: RequestUser, tx: any = this.prisma) {
    const record = await tx.team.findFirst({
      where: { id, companyId: user.companyId },
      include: { department: true },
    });
    if (!record) throw new NotFoundException("Team not found");
    return record;
  }
  private async lock(tx: any, companyId: string) {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`teams:${companyId}`}))`;
  }
  private async department(
    tx: any,
    departmentId: string | undefined,
    user: RequestUser,
  ) {
    if (
      departmentId &&
      !(await tx.department.findFirst({
        where: { id: departmentId, companyId: user.companyId },
      }))
    )
      throw new BadRequestException(
        "Department not found in your organization",
      );
  }
  private async audit(
    tx: any,
    user: RequestUser,
    action: string,
    metadata: any,
  ) {
    await tx.securityAuditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.sub,
        action,
        metadata: JSON.parse(JSON.stringify(metadata)),
      },
    });
  }
  async create(dto: CreateTeamDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, user.companyId);
      await this.department(tx, dto.departmentId, user);
      let code = dto.code?.trim();
      if (!code) {
        const existing = await tx.team.findMany({
          where: { companyId: user.companyId },
          select: { code: true },
        });
        const used = new Set(existing.map((r) => r.code));
        let next = 1;
        while (used.has(`TEAM-${String(next).padStart(3, "0")}`)) next++;
        code = `TEAM-${String(next).padStart(3, "0")}`;
      }
      const after = await tx.team.create({
        data: {
          companyId: user.companyId,
          code,
          name: dto.name.trim(),
          departmentId: dto.departmentId || null,
          description: dto.description?.trim(),
          isActive: dto.isActive ?? true,
        },
        include: { department: true },
      });
      await this.audit(tx, user, "TEAM_CREATED", { teamId: after.id, after });
      return after;
    });
  }
  async update(id: string, dto: UpdateTeamDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, user.companyId);
      const before = await this.findOne(id, user, tx);
      await this.department(tx, dto.departmentId, user);
      const data = {
        ...dto,
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.departmentId !== undefined
          ? { departmentId: dto.departmentId || null }
          : {}),
      };
      const after = await tx.team.update({
        where: { id },
        data,
        include: { department: true },
      });
      await this.audit(tx, user, "TEAM_UPDATED", { teamId: id, before, after });
      return after;
    });
  }
  async toggleStatus(id: string, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, user.companyId);
      const before = await this.findOne(id, user, tx);
      const after = await tx.team.update({
        where: { id },
        data: { isActive: !before.isActive },
      });
      await this.audit(tx, user, "TEAM_STATUS_CHANGED", {
        teamId: id,
        before,
        after,
      });
      return after;
    });
  }
  async delete(id: string, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, user.companyId);
      const before = await this.findOne(id, user, tx);
      const members = await tx.flowMembership.count({
        where: { companyId: user.companyId, kind: "team", referenceId: id },
      });
      const definitions = await tx.flowDefinition.findMany({
        where: { companyId: user.companyId },
        select: { draft: true, versions: { select: { document: true } } },
      });
      if (
        members ||
        definitions.some(
          (d) =>
            referencesTeam(d.draft, id) ||
            d.versions.some((v) => referencesTeam(v.document, id)),
        )
      )
        throw new ConflictException(
          "This team has members or workflow references. Deactivate it instead.",
        );
      const result = await tx.team.delete({ where: { id } });
      await this.audit(tx, user, "TEAM_DELETED", { teamId: id, before });
      return result;
    });
  }
  async members(id: string, user: RequestUser, q: ListAccessDto) {
    await this.findOne(id, user);
    const membership = {
      companyId: user.companyId,
      kind: "team",
      referenceId: id,
    };
    const where = {
      companyId: user.companyId,
      id: {
        in: (
          await this.prisma.flowMembership.findMany({
            where: membership,
            select: { userId: true },
          })
        ).map((m) => m.userId),
      },
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
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          employeeCode: true,
          isActive: true,
          employee: { select: { name: true } },
        },
        orderBy: { email: "asc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async addMember(id: string, userId: string, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, user.companyId);
      await this.findOne(id, user, tx);
      if (
        !(await tx.user.findFirst({
          where: { id: userId, companyId: user.companyId, isActive: true },
        }))
      )
        throw new BadRequestException(
          "Active user not found in your organization",
        );
      const key = {
        companyId: user.companyId,
        userId,
        kind: "team",
        referenceId: id,
      };
      const existing = await tx.flowMembership.findUnique({
        where: { companyId_userId_kind_referenceId: key },
      });
      if (existing) return existing;
      const member = await tx.flowMembership.create({ data: key });
      await this.audit(tx, user, "TEAM_MEMBER_ADDED", { teamId: id, userId });
      return member;
    });
  }
  async removeMember(id: string, userId: string, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, user.companyId);
      await this.findOne(id, user, tx);
      if (
        !(await tx.user.findFirst({
          where: { id: userId, companyId: user.companyId },
        }))
      )
        throw new NotFoundException("User not found in your organization");
      const deleted = await tx.flowMembership.deleteMany({
        where: {
          companyId: user.companyId,
          userId,
          kind: "team",
          referenceId: id,
        },
      });
      if (deleted.count)
        await this.audit(tx, user, "TEAM_MEMBER_REMOVED", {
          teamId: id,
          userId,
        });
      return { success: true };
    });
  }
}
