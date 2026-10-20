import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { FlowRuntime } from "./flow.runtime";
import { FlowIntegrations } from "./flow.integrations";
import { lock } from "./flow.access";
import { FlowDocument } from "./flow.types";
import { valueAt } from "./flow.rules";
@Injectable()
export class FlowWorker {
  readonly id = randomUUID();
  private readonly logger = new Logger(FlowWorker.name);
  constructor(
    private readonly db: PrismaService,
    private readonly runtime: FlowRuntime,
    private readonly integrations: FlowIntegrations,
  ) {}
  async tick() {
    const exhausted = await this.db.flowJob.findMany({
      where: { status: "RUNNING", leaseUntil: { lt: new Date() } },
      take: 50,
    });
    for (const job of exhausted.filter((j) => j.attempts >= j.maxAttempts)) {
      await this.db.$transaction(async (tx) => {
        if (job.instanceId) await lock(tx, job.instanceId);
        const changed = await tx.flowJob.updateMany({
          where: {
            id: job.id,
            status: "RUNNING",
            leaseUntil: { lt: new Date() },
          },
          data: {
            status: "FAILED",
            error:
              "Worker lease expired after final attempt; outcome may be ambiguous",
            lockedBy: null,
            leaseUntil: null,
          },
        });
        if (changed.count && job.instanceId)
          await tx.flowInstance.updateMany({
            where: {
              id: job.instanceId,
              status: { in: ["RUNNING", "WAITING"] },
            },
            data: { status: "FAILED", revision: { increment: 1 } },
          });
      });
    }
    await this.db.flowHeartbeat.upsert({
      where: { id: this.id },
      create: { id: this.id },
      update: { lastSeen: new Date() },
    });
    const jobs: any[] = await this.db
      .$queryRaw`UPDATE "FlowJob" SET "status"='RUNNING', "lockedBy"=${this.id}, "leaseUntil"=NOW()+interval '60 seconds', "attempts"="attempts"+1, "updatedAt"=NOW() WHERE "id" IN (SELECT j."id" FROM "FlowJob" j LEFT JOIN "FlowInstance" i ON i."id"=j."instanceId" WHERE ((j."status"='PENDING' AND j."dueAt"<=NOW()) OR (j."status"='RUNNING' AND j."leaseUntil"<NOW())) AND j."attempts"<j."maxAttempts" AND (i."id" IS NULL OR i."status" IN ('RUNNING','WAITING')) ORDER BY j."dueAt" FOR UPDATE OF j SKIP LOCKED LIMIT 1) RETURNING *`;
    for (const job of jobs) {
      try {
        await this.execute(job);
        await this.db.flowJob.updateMany({
          where: { id: job.id, lockedBy: this.id, status: "RUNNING" },
          data: {
            status: "COMPLETED",
            leaseUntil: null,
            lockedBy: null,
            error: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Job failed";
        const ambiguous = message.includes("ambiguous");
        const failed = ambiguous || job.attempts >= job.maxAttempts;
        await this.db.$transaction(async (tx) => {
          if (job.instanceId) await lock(tx, job.instanceId);
          await tx.flowJob.updateMany({
            where: { id: job.id, lockedBy: this.id, status: "RUNNING" },
            data: {
              status: failed ? "FAILED" : "PENDING",
              leaseUntil: null,
              lockedBy: null,
              dueAt: new Date(
                Date.now() + Math.min(3600, 2 ** job.attempts * 10) * 1000,
              ),
              error: message.slice(0, 300),
            },
          });
          if (job.instanceId) {
            const i = await tx.flowInstance.findUnique({
              where: { id: job.instanceId },
              include: { version: true },
            });
            if (i && !["CANCELLED", "COMPLETED"].includes(i.status)) {
              await this.runtime.event(tx, i, "JOB_FAILED", {
                jobId: job.id,
                attempt: job.attempts,
                message: message.slice(0, 300),
              });
              const token = await tx.flowToken.findUnique({
                where: { id: (job.payload as any)?.tokenId || "missing" },
              });
              const doc = i.version.document as unknown as FlowDocument;
              const node = doc.nodes.find((n) => n.id === token?.nodeId);
              if (
                failed &&
                token &&
                node &&
                doc.edges.some(
                  (e) => e.source === node.id && e.port === "error",
                ) &&
                !ambiguous
              ) {
                await this.runtime.move(tx, i, doc, token, "error");
                await tx.flowJob.update({
                  where: { id: job.id },
                  data: { status: "HANDLED" },
                });
                await this.runtime.pump(tx, i, doc);
              } else if (failed) {
                await tx.flowInstance.update({
                  where: { id: i.id },
                  data: { status: "FAILED", revision: { increment: 1 } },
                });
              }
            }
          }
        });
        this.logger.warn(`${job.kind} job failed (${job.id})`);
      }
    }
    return jobs.length;
  }
  async execute(job: any) {
    const payload = job.payload as any;
    if (job.kind === "EMAIL") {
      await this.integrations.email(
        payload.to,
        payload.subject,
        payload.text,
        job.key,
      );
      return;
    }
    if (job.kind === "SCHEDULE") {
      const def = await this.db.flowDefinition.findUnique({
        where: { id: payload.definitionId },
        include: { versions: { orderBy: { number: "desc" }, take: 1 } },
      });
      if (
        !def ||
        def.status !== "PUBLISHED" ||
        def.versions[0]?.id !== payload.versionId
      )
        return;
      if (payload.recordId) {
        const record = await this.db.flowRecord.findUnique({
          where: { id: payload.recordId },
        });
        if (!record || record.revision !== payload.recordRevision) return;
      }
      const user = await this.db.user.findFirst({
        where: { id: payload.userId, companyId: job.companyId, isActive: true },
      });
      if (!user) throw new Error("Scheduled workflow owner is inactive");
      await this.runtime.start(
        def.id,
        {
          sub: user.id,
          companyId: user.companyId,
          email: user.email,
          role: user.role,
        },
        { data: payload.data, key: job.key },
      );
      if (
        payload.intervalSeconds &&
        Number.isFinite(payload.intervalSeconds) &&
        payload.intervalSeconds >= 60
      ) {
        const next = new Date(
          job.dueAt.getTime() + payload.intervalSeconds * 1000,
        );
        await this.runtime.job(
          this.db,
          job.companyId,
          "SCHEDULE",
          `schedule:${payload.versionId}:${next.toISOString()}`,
          payload,
          next,
        );
      }
      return;
    }
    let external: any = payload.result;
    if (job.kind === "AUTOMATION") {
      const i = await this.db.flowInstance.findUnique({
        where: { id: job.instanceId },
        include: { version: true },
      });
      if (!i) return;
      if (i.status === "PAUSED") {
        await this.db.flowJob.update({
          where: { id: job.id },
          data: {
            status: "PENDING",
            attempts: { decrement: 1 },
            leaseUntil: null,
            lockedBy: null,
          },
        });
        return;
      }
      if (!["RUNNING", "WAITING"].includes(i.status)) return;
      const token = await this.db.flowToken.findUnique({
        where: { id: payload.tokenId },
      });
      if (!token || token.status !== "WAITING") return;
      const node = (i.version.document as unknown as FlowDocument).nodes.find(
          (n) => n.id === token.nodeId,
        )!,
        c = node.config;
      await this.db.flowToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      await this.runtime.event(
        this.db,
        i,
        "INTEGRATION_ATTEMPT",
        { jobId: job.id, attempt: job.attempts },
        undefined,
        node.id,
      );
      if (external) {
      } else if (i.test) external = { simulated: true };
      else if (c.action === "email") {
        const to = c.toField ? valueAt(i.data, c.toField) : c.to;
        if (!to) throw new Error("Email recipient missing");
        await this.integrations.email(
          to,
          c.subject || node.label,
          c.message || "",
          job.key,
        );
        external = { sent: true };
      } else {
        const connection = await this.db.flowConnection.findFirst({
          where: { id: c.connectionId, companyId: i.companyId },
        });
        if (!connection) throw new Error("Connection not found");
        const body = c.bodyField
          ? valueAt(i.data, c.bodyField)
          : c.body || i.data;
        external = await this.integrations.request(
          connection,
          c.path || "",
          c.method || "POST",
          body,
          job.key,
        );
      }
    }
    await this.db.$transaction(
      async (tx) => {
        await lock(tx, job.instanceId);
        const i = await tx.flowInstance.findUnique({
          where: { id: job.instanceId },
          include: { version: true },
        });
        if (!i) return;
        if (i.status === "PAUSED") {
          await tx.flowJob.update({
            where: { id: job.id },
            data: {
              status: "PENDING",
              attempts: { decrement: 1 },
              leaseUntil: null,
              lockedBy: null,
              payload: {
                ...payload,
                ...(external ? { result: external } : {}),
              },
            },
          });
          return;
        }
        if (!["RUNNING", "WAITING"].includes(i.status)) return;
        const doc = i.version.document as unknown as FlowDocument;
        if (job.kind === "SLA") {
          await this.runtime.event(tx, i, "WORKFLOW_SLA_EXCEEDED", {
            slaHours: doc.monitoring.slaHours,
          });
          return;
        }
        if (job.kind === "OVERDUE") {
          const task = await tx.flowTask.findUnique({
            where: { id: payload.taskId },
          });
          if (
            !task ||
            !["OPEN", "UNASSIGNED"].includes(task.status) ||
            !task.dueAt ||
            task.dueAt > new Date()
          )
            return;
          const node = doc.nodes.find((n) => n.id === task.nodeId)!;
          await this.runtime.event(
            tx,
            i,
            "TASK_OVERDUE",
            { taskId: task.id },
            undefined,
            node.id,
          );
          if (node.config.escalationUsers?.length) {
            const users = await tx.user.findMany({
              where: {
                companyId: i.companyId,
                isActive: true,
                id: { in: node.config.escalationUsers },
              },
            });
            const ids = users
              .map((u) => u.id)
              .filter(
                (id) => doc.policies.allowSelfApproval || id !== i.requesterId,
              );
            await tx.flowTask.update({
              where: { id: task.id },
              data: {
                candidates: [
                  ...new Set([...(task.candidates as string[]), ...ids]),
                ],
                claimedBy: null,
                status: ids.length ? "OPEN" : task.status,
              },
            });
          }
          if (
            doc.edges.some((e) => e.source === node.id && e.port === "timeout")
          ) {
            const token = await tx.flowToken.findUniqueOrThrow({
              where: { id: task.tokenId },
            });
            await tx.flowTask.update({
              where: { id: task.id },
              data: { status: "TIMED_OUT" },
            });
            await this.runtime.move(tx, i, doc, token, "timeout");
            await this.runtime.pump(tx, i, doc);
          }
        } else {
          const token = await tx.flowToken.findUnique({
            where: { id: payload.tokenId },
          });
          if (!token || token.status !== "WAITING") return;
          if (external) {
            const node = doc.nodes.find((n) => n.id === token.nodeId)!;
            if (node.config.responseField) {
              const data = {
                ...(i.data as any),
                [node.config.responseField]: external.body,
              };
              i.data = data;
              await tx.flowInstance.update({
                where: { id: i.id },
                data: { data },
              });
            }
            await this.runtime.event(
              tx,
              i,
              "INTEGRATION_COMPLETED",
              {
                jobId: job.id,
                status: external.status || null,
                simulated: !!external.simulated,
              },
              undefined,
              node.id,
            );
          }
          await this.runtime.move(tx, i, doc, token);
          await this.runtime.pump(tx, i, doc);
        }
      },
      { timeout: 20000 },
    );
  }
}
