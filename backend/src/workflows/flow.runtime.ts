import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { FlowAssignment } from "./flow.assignment";
import { lock, isAdmin, requirePolicy } from "./flow.access";
import {
  calculate,
  evaluate,
  readableData,
  validateFields,
  valueAt,
} from "./flow.rules";
import { FlowDocument, FlowNode, TaskAction } from "./flow.types";
import { workflowDate } from "./flow.time";
@Injectable()
export class FlowRuntime {
  constructor(
    private readonly db: PrismaService,
    private readonly assignments: FlowAssignment,
  ) {}
  private async activeActor(tx: any, user: RequestUser): Promise<RequestUser> {
    const actor = await tx.user.findFirst({
      where: {
        id: user.sub,
        companyId: user.companyId,
        isActive: true,
        company: { isActive: true },
      },
    });
    if (!actor) throw new ForbiddenException("Your account is inactive");
    return {
      ...user,
      role: actor.role,
      email: actor.email,
      employeeCode: actor.employeeCode,
    };
  }
  async event(
    tx: any,
    instance: any,
    type: string,
    detail: any = {},
    actorId?: string,
    nodeId?: string,
  ) {
    return tx.flowEvent.create({
      data: {
        companyId: instance.companyId,
        instanceId: instance.id,
        type,
        detail,
        actorId,
        nodeId,
      },
    });
  }
  async job(
    tx: any,
    companyId: string,
    kind: string,
    key: string,
    payload: any,
    dueAt = new Date(),
    instanceId?: string,
    maxAttempts = 3,
  ) {
    return tx.flowJob.upsert({
      where: { key },
      create: { companyId, instanceId, kind, key, payload, dueAt, maxAttempts },
      update: {},
    });
  }
  async instance(tx: any, id: string, user: RequestUser, operator = false) {
    const i = await tx.flowInstance.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        version: true,
        tasks: true,
        definition: { select: { name: true } },
        tokens: true,
      },
    });
    if (!i) throw new NotFoundException("Execution not found");
    const doc = i.version.document as FlowDocument;
    if (operator) requirePolicy(doc, user, "operators");
    else if (
      !isAdmin(user) &&
      i.requesterId !== user.sub &&
      !i.tasks.some((t: any) =>
        (t.candidates as string[]).includes(user.sub),
      ) &&
      !(
        doc.policies.viewers?.includes(user.sub) ||
        doc.policies.viewers?.includes(user.role)
      )
    )
      throw new ForbiddenException("Execution access denied");
    return i;
  }
  async start(
    definitionId: string,
    user: RequestUser,
    input: any,
    source?: string,
    entityId?: string,
    txArg?: any,
    testVersionId?: string,
  ) {
    const run = async (tx: any) => {
      user = await this.activeActor(tx, user);
      await lock(tx, `start:${user.companyId}:${input.key}`);
      if (!input.key || typeof input.key !== "string")
        throw new BadRequestException("An idempotency key is required");
      const receipt = await tx.flowReceipt.findUnique({
        where: {
          companyId_key: {
            companyId: user.companyId,
            key: `start:${input.key}`,
          },
        },
      });
      if (receipt) {
        const existing = await this.instance(tx, receipt.instanceId!, user);
        return {
          ...existing,
          data: readableData(
            (existing.version.document as FlowDocument).fields,
            existing.data,
            user.role,
          ),
        };
      }
      const def = await tx.flowDefinition.findFirst({
        where: {
          id: definitionId,
          companyId: user.companyId,
          ...(testVersionId ? {} : { status: "PUBLISHED" }),
        },
        include: {
          versions: {
            where: testVersionId
              ? { id: testVersionId }
              : { number: { gt: 0 } },
            orderBy: { number: "desc" },
            take: 1,
          },
        },
      });
      if (!def?.versions[0])
        throw new BadRequestException("Workflow must be published");
      const version = def.versions[0],
        doc = version.document as FlowDocument;
      requirePolicy(doc, user, "starters");
      const data = { ...(input.data || {}) };
      validateFields(doc.fields, data, user.role);
      const instance = await tx.flowInstance.create({
        data: {
          companyId: user.companyId,
          definitionId,
          versionId: version.id,
          requesterId: user.sub,
          title: input.title || def.name,
          state: doc.states.find((s) => s.initial)!.id,
          data,
          source,
          entityId,
          test: !!testVersionId,
        },
      });
      await tx.flowReceipt.create({
        data: {
          companyId: user.companyId,
          key: `start:${input.key}`,
          instanceId: instance.id,
        },
      });
      await tx.flowToken.create({
        data: {
          instanceId: instance.id,
          nodeId: doc.nodes.find((n) => n.type === "trigger")!.id,
        },
      });
      await this.validateReferences(tx, doc.fields, data, instance, user);
      if (doc.monitoring?.slaHours)
        await this.job(
          tx,
          user.companyId,
          "SLA",
          `sla:${instance.id}`,
          {},
          new Date(Date.now() + doc.monitoring.slaHours * 3600000),
          instance.id,
        );
      await this.event(
        tx,
        instance,
        "STARTED",
        { version: version.number, test: instance.test },
        user.sub,
      );
      await this.pump(tx, instance, doc, user);
      const result = await tx.flowInstance.findUnique({
        where: { id: instance.id },
      });
      return {
        ...result,
        data: readableData(doc.fields, result.data, user.role),
      };
    };
    return txArg ? run(txArg) : this.db.$transaction(run, { timeout: 20000 });
  }
  async move(tx: any, i: any, doc: FlowDocument, token: any, port = "next") {
    const edges = doc.edges.filter((e) => e.source === token.nodeId);
    const edge =
      edges.find((e) => e.port === port) ||
      (port === "next" && edges.length === 1 ? edges[0] : undefined);
    if (!edge)
      throw new BadRequestException(`No ${port} route for ${token.nodeId}`);
    await tx.flowToken.update({
      where: { id: token.id },
      data: { status: "DONE" },
    });
    const current = await tx.flowToken.findUniqueOrThrow({
      where: { id: token.id },
    });
    await tx.flowToken.create({
      data: {
        instanceId: i.id,
        nodeId: edge.target,
        status: "READY",
        groupId: current.groupId,
        branch: current.branch,
        scope: current.scope,
      },
    });
  }
  async pump(tx: any, i: any, doc: FlowDocument, actor?: RequestUser) {
    if (["PAUSED", "CANCELLED", "COMPLETED"].includes(i.status)) return;
    let count = 0;
    while (count++ < Math.min(doc.policies.maxSteps || 1000, 1000)) {
      const token = await tx.flowToken.findFirst({
        where: { instanceId: i.id, status: "READY" },
        orderBy: { createdAt: "asc" },
      });
      if (!token) break;
      const node = doc.nodes.find((n) => n.id === token.nodeId)!;
      if (!node) throw new BadRequestException("Missing execution node");
      const c = node.config;
      await this.event(tx, i, "NODE_ENTERED", {}, undefined, node.id);
      if (["task", "form"].includes(node.type)) {
        let candidates = await this.assignments.resolve(
          tx,
          i.companyId,
          i.requesterId,
          c.assignment,
          doc,
          i.data,
        );
        // A requester form is not an approval and may be assigned to its requester.
        if (
          node.type === "form" &&
          c.assignment.kind === "field" &&
          c.assignment.values.includes("requesterId")
        )
          candidates = [i.requesterId];
        if (
          c.approvalPolicy === "quorum" &&
          candidates.length &&
          c.quorum > candidates.length
        )
          throw new BadRequestException("Quorum exceeds eligible assignees");
        const dueAt = c.slaHours
          ? new Date(Date.now() + c.slaHours * 3600000)
          : null;
        const task = await tx.flowTask.upsert({
          where: { tokenId: token.id },
          create: {
            companyId: i.companyId,
            instanceId: i.id,
            tokenId: token.id,
            nodeId: node.id,
            title: node.label,
            candidates,
            status: candidates.length ? "OPEN" : "UNASSIGNED",
            dueAt,
          },
          update: {
            status: candidates.length ? "OPEN" : "UNASSIGNED",
            candidates,
            claimedBy: null,
            votes: [],
            completedAt: null,
            dueAt,
          },
        });
        await tx.flowToken.update({
          where: { id: token.id },
          data: { status: "WAITING" },
        });
        if (dueAt)
          await this.job(
            tx,
            i.companyId,
            "OVERDUE",
            `overdue:${task.id}:${dueAt.toISOString()}`,
            { taskId: task.id },
            dueAt,
            i.id,
          );
        await this.event(
          tx,
          i,
          candidates.length ? "TASK_CREATED" : "ASSIGNMENT_UNRESOLVED",
          { taskId: task.id, candidates },
          undefined,
          node.id,
        );
      } else if (node.type === "wait") {
        await tx.flowToken.update({
          where: { id: token.id },
          data: { status: "WAITING" },
        });
        await this.job(
          tx,
          i.companyId,
          "WAKE",
          `wake:${token.id}:${randomUUID()}`,
          { tokenId: token.id },
          new Date(Date.now() + c.seconds * 1000),
          i.id,
        );
      } else if (node.type === "automation") {
        if (c.action === "calculate") {
          const data = {
            ...i.data,
            [c.field]: calculate(c.expression, i.data),
          };
          i.data = data;
          await tx.flowInstance.update({ where: { id: i.id }, data: { data } });
          await this.move(tx, i, doc, token);
        } else if (c.action === "updateRecord") {
          if (i.test) {
            await this.event(
              tx,
              i,
              "RECORD_UPDATE_SIMULATED",
              {},
              undefined,
              node.id,
            );
            await this.move(tx, i, doc, token);
            continue;
          }
          const recordId = valueAt(i.data, c.recordIdField) || c.recordId;
          const record = await tx.flowRecord.findFirst({
            where: { id: recordId, companyId: i.companyId },
          });
          if (!record)
            throw new BadRequestException("Workflow record not found");
          const patch = c.values || {};
          await tx.flowRecord.update({
            where: { id: record.id },
            data: {
              data: { ...(record.data as any), ...patch },
              revision: { increment: 1 },
            },
          });
          const updater = await tx.user.findUnique({
            where: { id: i.requesterId },
          });
          if (updater)
            await this.emitRecord(
              tx,
              {
                ...record,
                data: { ...(record.data as any), ...patch },
                revision: record.revision + 1,
              },
              "record.updated",
              {
                sub: updater.id,
                companyId: i.companyId,
                email: updater.email,
                role: updater.role,
              },
              `automation:${token.id}:${record.revision + 1}`,
              [...((i.data as any).__eventChain || []), i.definitionId],
            );
          await this.event(
            tx,
            i,
            "RECORD_UPDATED",
            { recordId },
            undefined,
            node.id,
          );
          await this.move(tx, i, doc, token);
        } else if (c.action === "notification") {
          const recipients = await this.assignments.resolve(
            tx,
            i.companyId,
            i.requesterId,
            c.assignment || { kind: "user", values: [i.requesterId] },
            { ...doc, policies: { ...doc.policies, allowSelfApproval: true } },
            i.data,
          );
          await this.event(
            tx,
            i,
            "NOTIFICATION",
            { message: c.message || node.label, recipients },
            undefined,
            node.id,
          );
          await this.move(tx, i, doc, token);
        } else {
          await tx.flowToken.update({
            where: { id: token.id },
            data: { status: "WAITING" },
          });
          await this.job(
            tx,
            i.companyId,
            "AUTOMATION",
            `automation:${token.id}:${randomUUID()}`,
            { tokenId: token.id },
            new Date(),
            i.id,
            c.retries == null ? 3 : Math.max(1, Math.min(10, c.retries + 1)),
          );
        }
      } else if (node.type === "decision") {
        const edges = doc.edges.filter((e) => e.source === node.id),
          chosen =
            edges.find(
              (e) => e.port !== "default" && evaluate(e.rule, i.data),
            ) || edges.find((e) => e.port === "default")!;
        await this.event(
          tx,
          i,
          "DECISION",
          { edgeId: chosen.id },
          undefined,
          node.id,
        );
        await tx.flowToken.update({
          where: { id: token.id },
          data: { nodeId: chosen.target },
        });
      } else if (node.type === "fork") {
        const groupId = randomUUID(),
          edges = doc.edges.filter((e) => e.source === node.id),
          scope = [
            ...(token.scope as any[]),
            { groupId, joinId: c.joinId, size: edges.length },
          ];
        await tx.flowToken.update({
          where: { id: token.id },
          data: { status: "DONE" },
        });
        for (const e of edges)
          await tx.flowToken.create({
            data: {
              instanceId: i.id,
              nodeId: e.target,
              groupId,
              branch: e.id,
              scope,
            },
          });
      } else if (node.type === "join") {
        const scope = token.scope as any[],
          frame = scope[scope.length - 1];
        if (!frame || frame.joinId !== node.id)
          throw new BadRequestException("Join has no matching fork");
        await tx.flowToken.update({
          where: { id: token.id },
          data: { status: "JOINED" },
        });
        const arrived = await tx.flowToken.findMany({
          where: {
            instanceId: i.id,
            groupId: frame.groupId,
            nodeId: node.id,
            status: "JOINED",
          },
        });
        if (c.mode === "first" || arrived.length >= frame.size) {
          const peers = await tx.flowToken.findMany({
            where: {
              instanceId: i.id,
              groupId: frame.groupId,
              status: { in: ["READY", "WAITING", "JOINED"] },
            },
          });
          if (c.mode === "first")
            await this.cancelScope(tx, i.id, frame.groupId);
          await tx.flowTask.updateMany({
            where: {
              tokenId: { in: peers.map((p: any) => p.id) },
              status: { in: ["OPEN", "UNASSIGNED"] },
            },
            data: { status: "CANCELLED" },
          });
          await tx.flowToken.updateMany({
            where: { id: { in: peers.map((p: any) => p.id) } },
            data: { status: "DONE" },
          });
          const parent = scope.slice(0, -1),
            continuation = await tx.flowToken.create({
              data: {
                instanceId: i.id,
                nodeId: node.id,
                scope: parent,
                groupId: parent[parent.length - 1]?.groupId || null,
                status: "READY",
              },
            });
          await this.move(tx, i, doc, continuation);
        }
      } else if (node.type === "end") {
        const state = doc.states.find((s) => s.id === c.state)!;
        await this.transition(
          tx,
          i,
          doc,
          state.id,
          c.action || "complete",
          actor,
        );
        await tx.flowInstance.update({
          where: { id: i.id },
          data: {
            state: state.id,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        i.state = state.id;
        i.status = "COMPLETED";
        await tx.flowToken.updateMany({
          where: { instanceId: i.id, status: { not: "DONE" } },
          data: { status: "DONE" },
        });
        await tx.flowTask.updateMany({
          where: { instanceId: i.id, status: { in: ["OPEN", "UNASSIGNED"] } },
          data: { status: "CANCELLED" },
        });
        await tx.flowJob.updateMany({
          where: { instanceId: i.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        await this.finishHR(tx, i, state.outcome, actor?.sub);
        await this.event(tx, i, "COMPLETED", { state: state.id });
        return;
      } else {
        if (node.type === "state")
          await this.transition(
            tx,
            i,
            doc,
            c.state,
            c.action || "enter",
            actor,
          );
        await this.move(tx, i, doc, token);
      }
    }
    if (count > Math.min(doc.policies.maxSteps || 1000, 1000))
      throw new BadRequestException("Automatic execution step limit exceeded");
    const active = await tx.flowToken.count({
      where: { instanceId: i.id, status: "READY" },
    });
    await tx.flowInstance.update({
      where: { id: i.id },
      data: {
        status: active ? "RUNNING" : "WAITING",
        revision: { increment: 1 },
      },
    });
  }
  async cancelScope(
    tx: any,
    instanceId: string,
    groupId: string,
    exceptId?: string,
  ) {
    const tokens = await tx.flowToken.findMany({
      where: { instanceId, status: { in: ["READY", "WAITING", "JOINED"] } },
    });
    const ids = tokens
      .filter(
        (t: any) =>
          t.id !== exceptId &&
          ((t.scope as any[]).some((frame) => frame.groupId === groupId) ||
            t.groupId === groupId),
      )
      .map((t: any) => t.id);
    await tx.flowTask.updateMany({
      where: { tokenId: { in: ids }, status: { in: ["OPEN", "UNASSIGNED"] } },
      data: { status: "CANCELLED" },
    });
    await tx.flowToken.updateMany({
      where: { id: { in: ids } },
      data: { status: "DONE" },
    });
  }
  async transition(
    tx: any,
    i: any,
    doc: FlowDocument,
    to: string,
    action: string,
    user?: RequestUser,
  ) {
    if (i.state === to) return;
    const t = doc.transitions.find(
      (t) => t.from === i.state && t.to === to && t.action === action,
    );
    if (
      !t ||
      !evaluate(t.guard, i.data) ||
      (t.roles?.length &&
        (!user ||
          (!t.roles.includes(user.role) && !t.roles.includes(user.sub))))
    )
      throw new ForbiddenException("Transition is not permitted");
    await tx.flowInstance.update({ where: { id: i.id }, data: { state: to } });
    await this.event(
      tx,
      i,
      "STATE_CHANGED",
      { from: i.state, to, action },
      user?.sub,
    );
    i.state = to;
  }
  async taskAction(id: string, input: TaskAction, user: RequestUser) {
    return this.db.$transaction(
      async (tx) => {
        user = await this.activeActor(tx, user);
        const task = await tx.flowTask.findFirst({
          where: { id, companyId: user.companyId },
        });
        if (!task) throw new NotFoundException("Task not found");
        await lock(tx, task.instanceId);
        const i = await this.instance(tx, task.instanceId, user, false),
          doc = i.version.document as FlowDocument;
        const current = await tx.flowTask.findUniqueOrThrow({ where: { id } }),
          node = doc.nodes.find((n) => n.id === current.nodeId)!,
          c = node.config;
        const key = `task:${id}:${input.key}`;
        if (!input.key)
          throw new BadRequestException("Idempotency key required");
        if (
          await tx.flowReceipt.findUnique({
            where: { companyId_key: { companyId: user.companyId, key } },
          })
        )
          return { success: true, duplicate: true };
        if (i.revision !== input.revision)
          throw new ConflictException(
            "Execution changed; refresh and try again",
          );
        if (
          !["OPEN", "UNASSIGNED"].includes(current.status) ||
          (i.status !== "WAITING" && i.status !== "RUNNING")
        )
          throw new ConflictException("Task is not actionable");
        const candidates = current.candidates as string[];
        const operator = doc.policies.operators?.length
          ? doc.policies.operators.includes(user.sub) ||
            doc.policies.operators.includes(user.role)
          : isAdmin(user);
        const isAssignment = ["reassign", "delegate"].includes(input.action);
        if (!candidates.includes(user.sub) && !(isAssignment && operator))
          throw new ForbiddenException("You are not assigned to this task");
        if (
          current.claimedBy &&
          current.claimedBy !== user.sub &&
          !(isAssignment && operator)
        )
          throw new ForbiddenException("Task is claimed by another user");
        if (input.attachments?.length) {
          const count = await tx.flowAttachment.count({
            where: {
              id: { in: input.attachments },
              companyId: user.companyId,
              instanceId: i.id,
            },
          });
          if (count !== new Set(input.attachments).size)
            throw new BadRequestException("Invalid attachments");
        }
        if (input.action === "claim")
          await tx.flowTask.update({
            where: { id },
            data: { claimedBy: user.sub },
          });
        else if (isAssignment) {
          if (input.action === "reassign" && !operator)
            throw new ForbiddenException("Operator permission required");
          const target = await tx.user.findFirst({
            where: {
              id: input.targetUserId || "",
              companyId: user.companyId,
              isActive: true,
            },
          });
          if (
            !target ||
            (!doc.policies.allowSelfApproval &&
              target.id === i.requesterId &&
              node.type !== "form")
          )
            throw new BadRequestException("Invalid assignee");
          if ((current.votes as any[]).length)
            throw new ConflictException(
              "Cannot reassign after votes have been cast",
            );
          await tx.flowTask.update({
            where: { id },
            data: {
              candidates:
                input.action === "delegate"
                  ? candidates.map((v) => (v === user.sub ? target.id : v))
                  : [target.id],
              claimedBy: null,
              status: "OPEN",
            },
          });
        } else {
          if (!(c.actions || ["complete"]).includes(input.action))
            throw new BadRequestException("Unsupported task action");
          const votes = current.votes as any[];
          if (votes.some((v) => v.userId === user.sub))
            throw new ConflictException("You already voted");
          if (Object.keys(input.data || {}).some((k) => k.startsWith("__")))
            throw new BadRequestException("Reserved data key");
          const data = { ...(i.data as any), ...(input.data || {}) };
          await this.validateReferences(tx, doc.fields, data, i, user);
          validateFields(doc.fields, data, user.role, i.data);
          i.data = data;
          await tx.flowInstance.update({ where: { id: i.id }, data: { data } });
          votes.push({
            userId: user.sub,
            action: input.action,
            comment: input.comment || "",
            attachments: input.attachments || [],
            at: new Date().toISOString(),
          });
          const count = votes.filter((v) => v.action === input.action).length;
          const threshold =
            c.approvalPolicy === "all"
              ? candidates.length
              : c.approvalPolicy === "quorum"
                ? c.quorum
                : 1;
          const complete =
            ["reject", "return"].includes(input.action) || count >= threshold;
          await tx.flowTask.update({
            where: { id },
            data: {
              votes,
              claimedBy: null,
              ...(complete
                ? { status: "COMPLETED", completedAt: new Date() }
                : {}),
            },
          });
          if (complete) {
            const token = await tx.flowToken.findUniqueOrThrow({
              where: { id: current.tokenId },
            });
            // A return/reject exits the entire active parallel scope.
            if (["return", "reject"].includes(input.action) && token.groupId) {
              await this.cancelScope(tx, i.id, token.groupId, token.id);
              await tx.flowToken.update({
                where: { id: token.id },
                data: { groupId: null, scope: [] },
              });
            }
            await this.move(tx, i, doc, token, input.action);
            await this.pump(tx, i, doc, user);
          }
        }
        await tx.flowReceipt.create({
          data: { companyId: user.companyId, key, instanceId: i.id },
        });
        await tx.flowInstance.update({
          where: { id: i.id },
          data: { revision: { increment: 1 } },
        });
        await this.event(
          tx,
          i,
          "TASK_ACTION",
          {
            taskId: id,
            action: input.action,
            comment: input.comment || "",
            targetUserId: input.targetUserId || null,
          },
          user.sub,
          node.id,
        );
        return { success: true };
      },
      { timeout: 20000 },
    );
  }
  async control(id: string, input: any, user: RequestUser) {
    return this.db.$transaction(
      async (tx) => {
        user = await this.activeActor(tx, user);
        await lock(tx, id);
        const i = await this.instance(tx, id, user, true),
          doc = i.version.document as FlowDocument;
        if (input.revision !== i.revision)
          throw new ConflictException("Execution changed; refresh");
        if (["COMPLETED", "CANCELLED"].includes(i.status))
          throw new ConflictException("Execution is closed");
        if (input.action === "pause") {
          if (!["RUNNING", "WAITING"].includes(i.status))
            throw new ConflictException(
              "Only running or waiting executions can be paused",
            );
          await tx.flowInstance.update({
            where: { id },
            data: { status: "PAUSED", pausedAt: new Date() },
          });
        } else if (input.action === "resume") {
          if (i.status !== "PAUSED")
            throw new ConflictException("Execution is not paused");
          const elapsed = Date.now() - i.pausedAt!.getTime();
          await tx.$executeRaw`UPDATE "FlowTask" SET "dueAt" = "dueAt" + (${elapsed} * interval '1 millisecond') WHERE "instanceId" = ${id} AND "status" IN ('OPEN','UNASSIGNED') AND "dueAt" > ${i.pausedAt}`;
          await tx.$executeRaw`UPDATE "FlowJob" SET "dueAt" = "dueAt" + (${elapsed} * interval '1 millisecond') WHERE "instanceId" = ${id} AND "status" = 'PENDING' AND "dueAt" > ${i.pausedAt}`;
          await tx.flowInstance.update({
            where: { id },
            data: { status: "RUNNING", pausedAt: null },
          });
          i.status = "RUNNING";
          await this.pump(tx, i, doc);
        } else if (input.action === "cancel") {
          await tx.flowInstance.update({
            where: { id },
            data: { status: "CANCELLED", completedAt: new Date() },
          });
          await tx.flowTask.updateMany({
            where: { instanceId: id, status: { in: ["OPEN", "UNASSIGNED"] } },
            data: { status: "CANCELLED" },
          });
          await tx.flowToken.updateMany({
            where: { instanceId: id, status: { not: "DONE" } },
            data: { status: "DONE" },
          });
          await tx.flowJob.updateMany({
            where: { instanceId: id, status: "PENDING" },
            data: { status: "CANCELLED" },
          });
        } else if (input.action === "retry") {
          if (i.status !== "FAILED")
            throw new ConflictException("Execution has not failed");
          await tx.flowInstance.update({
            where: { id },
            data: { status: "RUNNING" },
          });
          i.status = "RUNNING";
          const failed = await tx.flowJob.findMany({
            where: { instanceId: id, status: "FAILED" },
          });
          for (const j of failed)
            await tx.flowJob.update({
              where: { id: j.id },
              data: {
                status: "PENDING",
                attempts: 0,
                dueAt: new Date(),
                error: null,
              },
            });
          if (!failed.length) {
            await tx.flowToken.updateMany({
              where: { instanceId: id, status: "ERROR" },
              data: { status: "READY" },
            });
            await this.pump(tx, i, doc);
          }
        } else if (input.action === "transition") {
          await this.transition(
            tx,
            i,
            doc,
            input.state,
            input.transitionAction,
            user,
          );
          if (doc.states.find((s) => s.id === input.state)?.terminal) {
            await tx.flowInstance.update({
              where: { id },
              data: { status: "COMPLETED", completedAt: new Date() },
            });
            await tx.flowTask.updateMany({
              where: { instanceId: id, status: { in: ["OPEN", "UNASSIGNED"] } },
              data: { status: "CANCELLED" },
            });
            await tx.flowToken.updateMany({
              where: { instanceId: id },
              data: { status: "DONE" },
            });
            await tx.flowJob.updateMany({
              where: { instanceId: id, status: "PENDING" },
              data: { status: "CANCELLED" },
            });
            await this.finishHR(
              tx,
              i,
              doc.states.find((s) => s.id === input.state)?.outcome,
            );
          }
        } else throw new BadRequestException("Unknown execution action");
        await tx.flowInstance.update({
          where: { id },
          data: { revision: { increment: 1 } },
        });
        await this.event(
          tx,
          i,
          "EXECUTION_ACTION",
          { action: input.action },
          user.sub,
        );
        return { success: true };
      },
      { timeout: 20000 },
    );
  }
  async emitRecord(
    tx: any,
    record: any,
    event: string,
    user: RequestUser,
    key: string,
    chain: string[] = [],
  ) {
    const definitions = await tx.flowDefinition.findMany({
      where: { companyId: record.companyId, status: "PUBLISHED" },
      include: {
        versions: {
          where: { number: { gt: 0 } },
          orderBy: { number: "desc" },
          take: 1,
        },
      },
    });
    for (const d of definitions) {
      if (chain.includes(d.id)) continue;
      const version = d.versions[0];
      if (!version) continue;
      const doc = version.document as FlowDocument,
        c = doc.nodes.find((n) => n.type === "trigger")!.config;
      if (c.recordType !== record.type) continue;
      const data = {
        ...record.data,
        recordId: record.id,
        __eventChain: [...chain, d.id],
      };
      if (c.event === event)
        await this.start(
          d.id,
          user,
          { key: `record:${d.id}:${key}`, data },
          "record",
          record.id,
          tx,
        );
      if (c.event === "date") {
        const at = valueAt(record.data, c.dateField);
        if (at && workflowDate(at, doc.policies.timezone))
          await this.job(
            tx,
            record.companyId,
            "SCHEDULE",
            `date:${d.id}:${record.id}:${record.revision}`,
            {
              definitionId: d.id,
              versionId: version.id,
              userId: user.sub,
              data,
              recordId: record.id,
              recordRevision: record.revision,
            },
            workflowDate(at, doc.policies.timezone)!,
          );
      }
    }
  }
  async validateReferences(
    tx: any,
    fields: any[],
    data: any,
    i: any,
    user: RequestUser,
  ) {
    for (const f of fields) {
      const value = data[f.id];
      if (value == null) continue;
      if (f.type === "file" && Array.isArray(value))
        for (const id of value) {
          const file = await tx.flowAttachment.findFirst({
            where: {
              id,
              companyId: i.companyId,
              OR: [
                { instanceId: i.id },
                { instanceId: `staged:${user.sub}`, uploadedBy: user.sub },
              ],
            },
          });
          if (!file)
            throw new BadRequestException("Invalid attachment reference");
          if (file.instanceId !== i.id)
            await tx.flowAttachment.update({
              where: { id },
              data: { instanceId: i.id },
            });
        }
      if (f.type === "relationship") {
        const record = await tx.flowRecord.findFirst({
          where: {
            id: value,
            companyId: i.companyId,
            ...(f.referenceType ? { type: f.referenceType } : {}),
          },
        });
        if (!record) throw new BadRequestException("Invalid related record");
      }
      if (f.type === "section" && Array.isArray(value))
        for (const row of value)
          await this.validateReferences(tx, f.fields || [], row, i, user);
    }
  }
  async finishHR(tx: any, i: any, outcome?: string, actorId?: string) {
    if (i.source !== "profile_change" || i.test) return;
    const mapped = (i.data as any).__hrOutcomes?.[i.state] || outcome;
    if (!["Approved", "Rejected"].includes(mapped)) return;
    const req = await tx.approvalRequest.findFirst({
      where: {
        id: i.entityId,
        companyId: i.companyId,
        status: { in: ["Pending", "In Progress", "Awaiting Configuration"] },
      },
    });
    if (!req) return;
    const updated = await tx.approvalRequest.update({
      where: { id: req.id },
      data: { status: mapped, actionDate: new Date() },
    });
    if (
      mapped === "Approved" &&
      ["Bank Details", "Statutory Details"].includes(req.category)
    ) {
      const profile = await tx.employeeProfile.findFirst({
        where: { companyId: i.companyId, employeeCode: req.employeeCode },
      });
      if (!profile) throw new BadRequestException("Employee profile not found");
      const values = (req.changes as any[]).map((c) => [c.field, c.requested]);
      await tx.employeeProfile.update({
        where: { id: profile.id },
        data:
          req.category === "Bank Details"
            ? { bankDetails: values }
            : { statutoryDetails: values },
      });
    }
    await tx.auditLog.create({
      data: {
        companyId: i.companyId,
        employeeCode: req.employeeCode,
        actorUserId: actorId,
        action: `WORKFLOW_${mapped.toUpperCase()}`,
        before: req,
        after: updated,
      },
    });
    const employee = await tx.employee.findFirst({
      where: { companyId: i.companyId, code: req.employeeCode },
    });
    if (employee)
      await this.job(
        tx,
        i.companyId,
        "EMAIL",
        `hr-email:${i.id}`,
        {
          to: employee.email,
          subject: `${req.category}: ${mapped}`,
          text: `Your request ${req.id} has been ${mapped.toLowerCase()}.`,
        },
        new Date(),
      );
  }
}
