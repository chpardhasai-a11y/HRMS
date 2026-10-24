import { TeamsService } from "../org-masters/teams/teams.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { FlowDocument } from "./flow.types";
import { blankDocument, templates } from "./flow.templates";
import { isAdmin, lock, policyAccess, requirePolicy } from "./flow.access";
import { validateDocument } from "./flow.validation";
import { FlowRuntime } from "./flow.runtime";
import { workflowDate } from "./flow.time";
import { attachmentReadable, readableData } from "./flow.rules";
import { FlowIntegrations } from "./flow.integrations";
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly db: PrismaService,
    private readonly runtime: FlowRuntime,
    private readonly integrations: FlowIntegrations,
    private readonly teams: TeamsService = new TeamsService(db),
  ) {}
  async definition(id: string, user: RequestUser, tx: any = this.db) {
    const d = await tx.flowDefinition.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        versions: { where: { number: { gt: 0 } }, orderBy: { number: "desc" } },
        _count: { select: { instances: true } },
      },
    });
    if (!d) throw new NotFoundException("Workflow not found");
    return d;
  }
  async list(user: RequestUser, q: any) {
    const defs = await this.db.flowDefinition.findMany({
      where: {
        companyId: user.companyId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.search
          ? { name: { contains: q.search, mode: "insensitive" } }
          : {}),
      },
      include: {
        versions: {
          where: { number: { gt: 0 } },
          select: { number: true },
          orderBy: { number: "desc" },
          take: 1,
        },
        _count: { select: { instances: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return defs.filter(
      (d) =>
        policyAccess(d.draft as any, user, "authors") ||
        policyAccess(d.draft as any, user, "publishers") ||
        isAdmin(user),
    );
  }
  async get(id: string, user: RequestUser) {
    const d = await this.definition(id, user);
    if (
      !policyAccess(d.draft as any, user, "authors") &&
      !policyAccess(d.draft as any, user, "publishers")
    )
      throw new ForbiddenException("Workflow access denied");
    return d;
  }
  async create(input: any, user: RequestUser) {
    if (!isAdmin(user))
      throw new ForbiddenException("Administrator permission required");
    const t = templates().find((t) => t.id === input.templateId);
    const draft = t?.document || input.document || blankDocument();
    if (!input.name?.trim() && !t)
      throw new BadRequestException("Workflow name is required");
    if (input.name?.length > 160)
      throw new BadRequestException("Name is too long");
    return this.db.$transaction(async (tx) => {
      await this.teams.validateWorkflowTeams(tx, draft, user);
      return tx.flowDefinition.create({
        data: {
          companyId: user.companyId,
          name: input.name || t!.name,
          description: input.description || t?.description || "",
          category: input.category || t?.category || "General",
          draft,
          createdBy: user.sub,
        },
      });
    });
  }
  async update(id: string, input: any, user: RequestUser) {
    return this.db.$transaction(async (tx) => {
      await lock(tx, `definition:${id}`);
      const d = await this.definition(id, user, tx);
      requirePolicy(d.draft as any, user, "authors");
      if (d.revision !== input.revision)
        throw new ConflictException("Draft changed; refresh before saving");
      if (
        !input.name?.trim() ||
        !input.document ||
        input.document.schemaVersion !== 1
      )
        throw new BadRequestException("Name and workflow document required");
      await this.teams.validateWorkflowTeams(tx, input.document, user);
      return tx.flowDefinition.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description || "",
          category: input.category || "General",
          draft: input.document,
          revision: { increment: 1 },
        },
      });
    });
  }
  async validate(id: string, user: RequestUser) {
    const d = await this.get(id, user);
    return { issues: validateDocument(d.draft as any) };
  }
  async publish(id: string, input: any, user: RequestUser) {
    return this.db.$transaction(async (tx) => {
      await lock(tx, `definition:${id}`);
      const d = await this.definition(id, user, tx);
      requirePolicy(d.draft as any, user, "publishers");
      if (d.revision !== input.revision)
        throw new ConflictException("Save the latest draft before publishing");
      const issues = validateDocument(d.draft as any);
      if (issues.length)
        throw new BadRequestException({
          message: "Workflow validation failed",
          issues,
        });
      const number = (d.versions[0]?.number || 0) + 1;
      const v = await tx.flowVersion.create({
        data: {
          definitionId: id,
          number,
          document: d.draft as any,
          publishedBy: user.sub,
        },
      });
      await tx.flowDefinition.update({
        where: { id },
        data: { status: "PUBLISHED", revision: { increment: 1 } },
      });
      await tx.flowEvent.create({
        data: {
          companyId: user.companyId,
          actorId: user.sub,
          type: "PUBLISHED",
          detail: { definitionId: id, version: number },
        },
      });
      const doc = d.draft as unknown as FlowDocument,
        c = doc.nodes.find((n) => n.type === "trigger")!.config;
      if (c.event === "schedule") {
        if (!c.at || !workflowDate(c.at, doc.policies.timezone))
          throw new BadRequestException("Schedule requires a valid start date");
        await this.runtime.job(
          tx,
          user.companyId,
          "SCHEDULE",
          `schedule:${v.id}`,
          {
            definitionId: id,
            versionId: v.id,
            userId: user.sub,
            data: c.data || {},
            intervalSeconds: c.intervalSeconds || null,
          },
          workflowDate(c.at, doc.policies.timezone)!,
        );
      }
      return v;
    });
  }
  async test(id: string, input: any, user: RequestUser) {
    return this.db.$transaction(
      async (tx) => {
        await lock(tx, `definition:${id}`);
        const d = await this.definition(id, user, tx);
        requirePolicy(d.draft as any, user, "authors");
        const issues = validateDocument(d.draft as any);
        if (issues.length)
          throw new BadRequestException({
            message: "Workflow validation failed",
            issues,
          });
        const count = await tx.flowVersion.count({
          where: { definitionId: id, number: { lt: 0 } },
        });
        const version = await tx.flowVersion.create({
          data: {
            definitionId: id,
            number: -(count + 1),
            document: d.draft as any,
            publishedBy: user.sub,
          },
        });
        return this.runtime.start(
          id,
          user,
          input,
          undefined,
          undefined,
          tx,
          version.id,
        );
      },
      { timeout: 20000 },
    );
  }
  async archive(id: string, user: RequestUser) {
    const d = await this.get(id, user);
    requirePolicy(d.draft as any, user, "publishers");
    return this.db.flowDefinition.update({
      where: { id },
      data: { status: "ARCHIVED", revision: { increment: 1 } },
    });
  }
  async remove(id: string, user: RequestUser) {
    return this.db.$transaction(async (tx) => {
      await lock(tx, `definition:${id}`);
      const d = await this.definition(id, user, tx);
      requirePolicy(d.draft as any, user, "publishers");
      if (d._count.instances) {
        throw new ConflictException(
          "This workflow has executions and cannot be deleted. Archive it instead.",
        );
      }
      const binding = await tx.flowBinding.findFirst({
        where: { companyId: user.companyId, definitionId: id },
        select: { id: true },
      });
      if (binding) {
        throw new ConflictException(
          "This workflow is bound to an application process. Remove the binding before deleting it.",
        );
      }
      return tx.flowDefinition.delete({ where: { id } });
    });
  }
  async duplicate(id: string, user: RequestUser) {
    const d = await this.get(id, user);
    return this.create(
      {
        name: `${d.name} (copy)`,
        description: d.description,
        category: d.category,
        document: d.draft,
      },
      user,
    );
  }
  async listInstances(user: RequestUser, q: any) {
    const where: any = {
      companyId: user.companyId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.definitionId ? { definitionId: q.definitionId } : {}),
    };
    if (!isAdmin(user)) {
      const tasks = await this.db.flowTask.findMany({
        where: { companyId: user.companyId },
        select: { instanceId: true, candidates: true },
      });
      where.OR = [
        { requesterId: user.sub },
        {
          id: {
            in: tasks
              .filter((t) => (t.candidates as string[]).includes(user.sub))
              .map((t) => t.instanceId),
          },
        },
      ];
    }
    const instances = await this.db.flowInstance.findMany({
      where,
      include: {
        definition: { select: { name: true } },
        version: { select: { number: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, Number(q.limit) || 50)),
      skip: Math.max(0, Number(q.offset) || 0),
    });
    return instances.map(({ data, ...i }) => i);
  }
  async details(id: string, user: RequestUser) {
    const i = await this.runtime.instance(this.db, id, user);
    const events = await this.db.flowEvent.findMany({
      where: { companyId: user.companyId, instanceId: id },
      orderBy: { createdAt: "asc" },
      take: 1000,
    });
    const attachments = await this.db.flowAttachment.findMany({
      where: { companyId: user.companyId, instanceId: id },
      select: { id: true, name: true, mime: true, size: true },
    });
    return {
      ...i,
      data: readableData(
        (i.version.document as FlowDocument).fields,
        i.data,
        user.role,
      ),
      events,
      attachments: attachments.filter((f) =>
        attachmentReadable(
          (i.version.document as FlowDocument).fields,
          i.data,
          f.id,
          user.role,
        ),
      ),
    };
  }
  async tasks(user: RequestUser, q: any) {
    const rows = await this.db.flowTask.findMany({
      where: {
        companyId: user.companyId,
        ...(q.status
          ? { status: q.status }
          : { status: { in: ["OPEN", "UNASSIGNED"] } }),
      },
      include: {
        instance: {
          include: { version: true, definition: { select: { name: true } } },
        },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    return rows
      .filter(
        (t) =>
          (q.all === "true" && isAdmin(user)) ||
          (t.candidates as string[]).includes(user.sub),
      )
      .map((t) => ({
        ...t,
        instance: {
          ...t.instance,
          data: readableData(
            (t.instance.version.document as unknown as FlowDocument).fields,
            t.instance.data,
            user.role,
          ),
        },
      }));
  }
  async lookups(user: RequestUser) {
    return {
      roles: await this.db.accessRole.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { id: true, name: true },
      }),
      users: await this.db.user.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { id: true, email: true, role: true, employeeCode: true },
      }),
      departments: await this.db.department.findMany({
        where: { companyId: user.companyId },
        select: { id: true, name: true },
      }),
      teams: await this.db.team.findMany({
        where: { companyId: user.companyId },
        select: { id: true, name: true },
      }),
      memberships: await this.db.flowMembership.findMany({
        where: { companyId: user.companyId },
      }),
    };
  }
  async membership(input: any, user: RequestUser) {
    if (!isAdmin(user)) throw new ForbiddenException();
    if (!["manager", "department", "team", "workflowRole"].includes(input.kind))
      throw new BadRequestException("Invalid membership type");
    if (input.kind === "team")
      return this.teams.addMember(input.referenceId, input.userId, user);
    const person = await this.db.user.findFirst({
      where: { id: input.userId, companyId: user.companyId },
    });
    if (!person) throw new BadRequestException("Unknown user");
    if (["manager", "department", "team"].includes(input.kind)) {
      const model =
        input.kind === "manager"
          ? this.db.user
          : input.kind === "department"
            ? this.db.department
            : this.db.team;
      const ref = await (model as any).findFirst({
        where: { id: input.referenceId, companyId: user.companyId },
      });
      if (!ref) throw new BadRequestException("Unknown reference");
    }
    return this.db.flowMembership.upsert({
      where: {
        companyId_userId_kind_referenceId: {
          companyId: user.companyId,
          userId: input.userId,
          kind: input.kind,
          referenceId: input.referenceId,
        },
      },
      create: {
        companyId: user.companyId,
        userId: input.userId,
        kind: input.kind,
        referenceId: input.referenceId,
      },
      update: {},
    });
  }
  async bindings(user: RequestUser) {
    if (!isAdmin(user)) throw new ForbiddenException();
    return this.db.flowBinding.findMany({
      where: { companyId: user.companyId },
      include: { definition: { select: { name: true } } },
    });
  }
  async bind(input: any, user: RequestUser) {
    const d = await this.get(input.definitionId, user);
    requirePolicy(d.draft as any, user, "publishers");
    if (d.status !== "PUBLISHED" || !d.versions.length)
      throw new BadRequestException("Publish before binding");
    if (!input.source) throw new BadRequestException("Source required");
    return this.db.flowBinding.upsert({
      where: {
        companyId_source: { companyId: user.companyId, source: input.source },
      },
      create: {
        companyId: user.companyId,
        source: input.source,
        definitionId: d.id,
        outcomes: input.outcomes || {},
      },
      update: { definitionId: d.id, outcomes: input.outcomes || {} },
    });
  }
  async startHR(id: string, user: RequestUser, txArg?: any) {
    const run = async (tx: any) => {
      await lock(tx, `hr:${id}`);
      const req = await tx.approvalRequest.findFirst({
        where: { id, companyId: user.companyId },
      });
      if (!req) throw new NotFoundException("Approval request not found");
      if (!isAdmin(user) && req.employeeCode !== user.employeeCode)
        throw new ForbiddenException();
      const existing = await tx.flowInstance.findFirst({
        where: {
          companyId: user.companyId,
          source: "profile_change",
          entityId: id,
        },
      });
      if (existing) return existing;
      const binding = await tx.flowBinding.findUnique({
        where: {
          companyId_source: {
            companyId: user.companyId,
            source: "profile_change",
          },
        },
      });
      if (!binding) {
        await tx.approvalRequest.update({
          where: { id },
          data: { status: "Awaiting Configuration" },
        });
        return null;
      }
      const employee = await tx.user.findFirst({
        where: {
          companyId: user.companyId,
          employeeCode: req.employeeCode,
          isActive: true,
        },
      });
      if (!employee)
        throw new BadRequestException(
          "Requesting employee needs an active account",
        );
      const starter = {
        sub: employee.id,
        companyId: user.companyId,
        role: employee.role,
        email: employee.email,
        employeeCode: req.employeeCode,
      };
      await tx.approvalRequest.update({
        where: { id },
        data: { status: "In Progress" },
      });
      return this.runtime.start(
        binding.definitionId,
        starter,
        {
          key: `hr:${id}`,
          title: `${req.employeeName} · ${req.category}`,
          data: {
            summary: `${req.category} update`,
            category: req.category,
            changes: req.changes,
            __hrOutcomes: binding.outcomes,
          },
        },
        "profile_change",
        id,
        tx,
      );
    };
    return txArg ? run(txArg) : this.db.$transaction(run, { timeout: 20000 });
  }
  async hrAction(
    id: string,
    action: string,
    comment: string,
    user: RequestUser,
  ) {
    const i = await this.db.flowInstance.findFirst({
      where: {
        companyId: user.companyId,
        source: "profile_change",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      include: { tasks: true },
    });
    if (!i)
      throw new ConflictException(
        "Awaiting Configuration: publish and bind a workflow, then start this request",
      );
    const task = i.tasks.find(
      (t) =>
        t.status === "OPEN" && (t.candidates as string[]).includes(user.sub),
    );
    if (!task)
      throw new ForbiddenException(
        "No eligible workflow task for this request",
      );
    return this.runtime.taskAction(
      task.id,
      {
        action,
        revision: i.revision,
        key: `hr:${action}:${i.revision}:${user.sub}`,
        comment,
      },
      user,
    );
  }
  async monitoring(user: RequestUser) {
    if (!isAdmin(user)) throw new ForbiddenException();
    const instances = await this.db.flowInstance.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        status: true,
        state: true,
        createdAt: true,
        completedAt: true,
        definitionId: true,
      },
    });
    const tasks = await this.db.flowTask.findMany({
      where: { companyId: user.companyId },
      select: {
        nodeId: true,
        title: true,
        status: true,
        createdAt: true,
        completedAt: true,
        dueAt: true,
      },
    });
    const completed = instances.filter(
      (i) => i.status === "COMPLETED" && i.completedAt,
    );
    const jobs = await this.db.flowJob.findMany({
      where: { companyId: user.companyId, status: "FAILED" },
      select: {
        id: true,
        kind: true,
        error: true,
        attempts: true,
        instanceId: true,
        updatedAt: true,
      },
      take: 50,
    });
    const workers = await this.db.flowHeartbeat.findMany({
      where: { lastSeen: { gte: new Date(Date.now() - 60000) } },
      select: { id: true, lastSeen: true },
    });
    return {
      total: instances.length,
      running: instances.filter((i) =>
        ["RUNNING", "WAITING"].includes(i.status),
      ).length,
      completed: instances.filter((i) => i.status === "COMPLETED").length,
      failed: instances.filter((i) => i.status === "FAILED").length,
      overdue: tasks.filter(
        (t) => t.status === "OPEN" && t.dueAt && t.dueAt < new Date(),
      ).length,
      unassigned: tasks.filter((t) => t.status === "UNASSIGNED").length,
      averageHours: completed.length
        ? completed.reduce(
            (sum, i) =>
              sum +
              (i.completedAt!.getTime() - i.createdAt.getTime()) / 3600000,
            0,
          ) / completed.length
        : 0,
      bottlenecks: Object.values(
        tasks.reduce((acc: any, t) => {
          const key = t.title;
          acc[key] ??= { name: key, open: 0, totalHours: 0, completed: 0 };
          if (t.status === "OPEN" || t.status === "UNASSIGNED") acc[key].open++;
          if (t.completedAt) {
            acc[key].completed++;
            acc[key].totalHours +=
              (t.completedAt.getTime() - t.createdAt.getTime()) / 3600000;
          }
          return acc;
        }, {}),
      ),
      jobs,
      workers,
    };
  }
  async connections(user: RequestUser) {
    if (!isAdmin(user)) throw new ForbiddenException();
    return this.db.flowConnection.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true, baseUrl: true },
    });
  }
  async connection(input: any, user: RequestUser) {
    if (!isAdmin(user)) throw new ForbiddenException();
    let url: URL;
    try {
      url = new URL(input.baseUrl);
    } catch {
      throw new BadRequestException("Invalid URL");
    }
    if (url.protocol !== "https:")
      throw new BadRequestException("HTTPS required");
    return this.db.flowConnection.create({
      data: {
        companyId: user.companyId,
        name: input.name,
        baseUrl: url.toString(),
        encryptedSecret: this.integrations.encrypt(input.secret || ""),
      },
      select: { id: true, name: true, baseUrl: true },
    });
  }
}
