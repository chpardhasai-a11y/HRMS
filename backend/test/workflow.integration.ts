import "reflect-metadata";
import { strict as assert } from "assert";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../src/prisma/prisma.service";
import { WorkflowsService } from "../src/workflows/workflows.service";
import { FlowRuntime } from "../src/workflows/flow.runtime";
import { FlowAssignment } from "../src/workflows/flow.assignment";
import { FlowIntegrations } from "../src/workflows/flow.integrations";
import { FlowWorker } from "../src/workflows/flow.worker";
import { blankDocument, templates } from "../src/workflows/flow.templates";
import { ApprovalsService } from "../src/approvals/approvals.service";
import { RequestUser } from "../src/common/decorators/current-user.decorator";
const url = process.env.DATABASE_URL || "";
if (!url.includes("127.0.0.1:5544/flowtest"))
  throw new Error(
    "This test requires the isolated flowtest database on 127.0.0.1:5544",
  );
const db = new PrismaService(),
  runtime = new FlowRuntime(db, new FlowAssignment()),
  integrations = new FlowIntegrations(
    new ConfigService({ WORKFLOW_ENCRYPTION_KEY: "a".repeat(64) }),
  ),
  service = new WorkflowsService(db, runtime, integrations);
integrations.email = async () => {
  throw new Error("SMTP disabled during isolated tests");
};
const worker = new FlowWorker(db, runtime, integrations),
  uid = Date.now().toString();
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function main() {
  await db.$connect();
  await check(
    "migration deletes legacy workflow data and preserves HR requests",
    async () => {
      assert.equal(
        await db.approvalRequest.count({
          where: { id: "legacy-request", status: "Awaiting Configuration" },
        }),
        1,
      );
      const tables: any[] =
        await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'Workflow%'`;
      assert.equal(tables.length, 0);
      assert.equal(await db.company.count({ where: { id: "legacy-co" } }), 1);
      assert.deepEqual(
        (
          await db.employeeProfile.findUniqueOrThrow({
            where: { id: "legacy-profile" },
          })
        ).bankDetails,
        [["Bank Name", "Preserved Bank"]],
      );
      assert.equal(
        await db.auditLog.count({ where: { id: "legacy-audit" } }),
        1,
      );
    },
  );
  const company = await db.company.create({
      data: { name: "Workflow QA", slug: `workflow-qa-${uid}` },
    }),
    other = await db.company.create({
      data: { name: "Other tenant", slug: `other-${uid}` },
    });
  const passwordHash = await bcrypt.hash("Workflow-QA-2026!", 10);
  const admin = await db.user.create({
      data: {
        companyId: company.id,
        email: `admin-${uid}@workflow.test`,
        passwordHash,
        role: "org_admin",
      },
    }),
    reviewer = await db.user.create({
      data: {
        companyId: company.id,
        email: `reviewer-${uid}@workflow.test`,
        passwordHash,
        role: "org_admin",
      },
    });
  await db.employee.create({
    data: {
      companyId: company.id,
      code: `EMP-${uid}`,
      name: "QA Requester",
      email: `requester-${uid}@workflow.test`,
      role: "Analyst",
      department: "Operations",
      entity: "QA",
      location: "Mumbai",
      manager: "not-an-authorization",
      type: "Permanent",
      grade: "G1",
      joinDate: new Date(),
    },
  });
  await db.employeeProfile.create({
    data: {
      companyId: company.id,
      employeeCode: `EMP-${uid}`,
      bankDetails: [["Bank Name", "Old Bank"]],
    },
  });
  const requester = await db.user.create({
      data: {
        companyId: company.id,
        email: `requester-${uid}@workflow.test`,
        employeeCode: `EMP-${uid}`,
        passwordHash,
        role: "employee",
      },
    }),
    outsider = await db.user.create({
      data: {
        companyId: company.id,
        email: `outsider-${uid}@workflow.test`,
        passwordHash,
        role: "employee",
      },
    });
  const as = (u: any): RequestUser => ({
      sub: u.id,
      companyId: u.companyId,
      email: u.email,
      role: u.role,
      employeeCode: u.employeeCode,
    }),
    a = as(admin),
    r = as(reviewer),
    e = as(requester),
    o = as(outsider);
  async function publish(name: string, doc: any) {
    const d = await service.create({ name, document: doc }, a);
    await service.publish(d.id, { revision: d.revision }, a);
    return service.get(d.id, a);
  }
  async function action(
    instanceId: string,
    user: RequestUser,
    act = "approve",
    key?: string,
  ) {
    const i = await service.details(instanceId, a);
    const task = i.tasks.find(
      (t: any) =>
        t.status === "OPEN" && (t.candidates as string[]).includes(user.sub),
    );
    assert.ok(task, "eligible task");
    return runtime.taskAction(
      task.id,
      {
        action: act,
        revision: i.revision,
        key: key || `${act}:${Date.now()}:${Math.random()}`,
      },
      user,
    );
  }
  const standard = await publish("Profile approval", blankDocument());
  let instance: any;
  await check(
    "idempotent start, tenant isolation, and assignee authorization",
    async () => {
      instance = await runtime.start(standard.id, e, {
        key: `start-${uid}`,
        data: { summary: "Profile change" },
      });
      const duplicate = await runtime.start(standard.id, e, {
        key: `start-${uid}`,
        data: { summary: "Ignored duplicate" },
      });
      assert.equal(instance.id, duplicate.id);
      await assert.rejects(
        service.details(instance.id, { ...a, companyId: other.id }),
      );
      await assert.rejects(service.details(instance.id, o));
      const task = await db.flowTask.findFirstOrThrow({
        where: { instanceId: instance.id },
      });
      await assert.rejects(
        runtime.taskAction(
          task.id,
          { action: "approve", revision: instance.revision, key: "forbidden" },
          o,
        ),
      );
    },
  );
  await check(
    "draft edits do not change running version; return loop creates a requester form",
    async () => {
      const d = blankDocument();
      d.nodes[1].label = "Updated reviewer";
      await service.update(
        standard.id,
        { revision: standard.revision, name: standard.name, document: d },
        a,
      );
      assert.equal(
        (await service.details(instance.id, a)).version.document.nodes[1].label,
        "Review request",
      );
      await action(instance.id, a, "return");
      const t = await db.flowTask.findFirstOrThrow({
        where: { instanceId: instance.id, status: "OPEN" },
      });
      assert.equal(t.nodeId, "changes");
      assert.deepEqual(t.candidates, [requester.id]);
      await action(instance.id, e, "complete");
      await action(instance.id, a);
      assert.equal((await service.details(instance.id, a)).status, "COMPLETED");
    },
  );
  await check(
    "all-policy votes serialize and stale competing actions cannot both advance",
    async () => {
      const d = blankDocument();
      d.nodes[1].config.approvalPolicy = "all";
      const def = await publish("All reviewers", d),
        i: any = await runtime.start(def.id, e, {
          key: `all-${uid}`,
          data: { summary: "All reviewers" },
        });
      const t = await db.flowTask.findFirstOrThrow({
        where: { instanceId: i.id },
      });
      const result = await Promise.allSettled([
        runtime.taskAction(
          t.id,
          { action: "approve", revision: i.revision, key: "all-admin" },
          a,
        ),
        runtime.taskAction(
          t.id,
          { action: "approve", revision: i.revision, key: "all-reviewer" },
          r,
        ),
      ]);
      assert.equal(result.filter((v) => v.status === "fulfilled").length, 1);
      const current = await service.details(i.id, a);
      assert.equal(current.status, "WAITING");
      const voted = (
        await db.flowTask.findUniqueOrThrow({ where: { id: t.id } })
      ).votes as any[];
      await action(i.id, voted[0].userId === admin.id ? r : a);
      assert.equal((await service.details(i.id, a)).status, "COMPLETED");
    },
  );
  await check("quorum reaches its configured threshold", async () => {
    const d = blankDocument();
    d.nodes[1].config.approvalPolicy = "quorum";
    d.nodes[1].config.quorum = 2;
    const def = await publish("Quorum approval", d),
      i: any = await runtime.start(def.id, e, {
        key: `quorum-${uid}`,
        data: { summary: "Quorum" },
      });
    await action(i.id, a);
    assert.equal((await service.details(i.id, a)).status, "WAITING");
    await action(i.id, r);
    assert.equal((await service.details(i.id, a)).status, "COMPLETED");
  });
  await check(
    "parallel purchase branches wait for their matching join",
    async () => {
      const d = templates().find((t) => t.id === "purchase")!.document;
      d.policies.workflowRoles = { finance: [admin.id] };
      const def = await publish("Purchase approval", d),
        i: any = await runtime.start(def.id, e, {
          key: `purchase-${uid}`,
          data: { summary: "Purchase laptops", amount: 20000 },
        });
      assert.equal(
        await db.flowTask.count({
          where: { instanceId: i.id, status: "OPEN" },
        }),
        2,
      );
      await action(i.id, a);
      assert.equal((await service.details(i.id, a)).status, "WAITING");
      await action(i.id, r);
      assert.equal((await service.details(i.id, a)).status, "COMPLETED");
    },
  );
  await check(
    "pause shifts future deadlines and persisted timers recover with a fresh worker",
    async () => {
      const d = blankDocument();
      d.nodes = [
        d.nodes[0],
        {
          id: "delay",
          label: "Wait briefly",
          type: "wait",
          position: { x: 1, y: 1 },
          config: { seconds: 60 },
        },
        d.nodes[2],
      ];
      d.edges = [
        { id: "1", source: "start", target: "delay", port: "next" },
        { id: "2", source: "delay", target: "approved", port: "next" },
      ];
      const def = await publish("Delay and recovery", d),
        i: any = await runtime.start(def.id, e, {
          key: `delay-${uid}`,
          data: { summary: "Durable delay" },
        });
      await runtime.control(i.id, { action: "pause", revision: i.revision }, a);
      const before = await db.flowJob.findFirstOrThrow({
        where: { instanceId: i.id, kind: "WAKE" },
      });
      await db.flowInstance.update({
        where: { id: i.id },
        data: { pausedAt: new Date(Date.now() - 5000) },
      });
      const paused = await service.details(i.id, a);
      await runtime.control(
        i.id,
        { action: "resume", revision: paused.revision },
        a,
      );
      const after = await db.flowJob.findUniqueOrThrow({
        where: { id: before.id },
      });
      assert.ok(after.dueAt.getTime() - before.dueAt.getTime() >= 4900);
      await db.flowJob.update({
        where: { id: before.id },
        data: {
          dueAt: new Date(Date.now() - 1000),
          status: "RUNNING",
          lockedBy: "crashed-worker",
          leaseUntil: new Date(Date.now() - 1000),
        },
      });
      const replacement = new FlowWorker(db, runtime, integrations);
      for (let k = 0; k < 30; k++) {
        await replacement.tick();
        if ((await service.details(i.id, a)).status === "COMPLETED") break;
      }
      assert.equal((await service.details(i.id, a)).status, "COMPLETED");
    },
  );
  await check(
    "unbound HR requests hold; configured outcomes update profiles exactly once",
    async () => {
      const approvals = new ApprovalsService(db, {} as any, service);
      const req: any = await approvals.create(
        {
          employeeCode: requester.employeeCode!,
          employeeName: "QA Requester",
          department: "Operations",
          role: "Analyst",
          category: "Bank Details",
          changes: [
            { field: "Bank Name", current: "Old Bank", requested: "New Bank" },
          ],
        },
        e,
      );
      assert.equal(req.status, "Awaiting Configuration");
      await assert.rejects(approvals.approve(req.id, a));
      await service.bind(
        { source: "profile_change", definitionId: standard.id },
        a,
      );
      await service.startHR(req.id, a);
      await approvals.approve(req.id, a);
      assert.equal(
        (await db.approvalRequest.findUniqueOrThrow({ where: { id: req.id } }))
          .status,
        "Approved",
      );
      const profile = await db.employeeProfile.findFirstOrThrow({
        where: { companyId: company.id },
      });
      assert.deepEqual(profile.bankDetails, [["Bank Name", "New Bank"]]);
      await assert.rejects(approvals.approve(req.id, a));
      assert.equal(
        await db.auditLog.count({
          where: { companyId: company.id, action: "WORKFLOW_APPROVED" },
        }),
        1,
      );
    },
  );
  await check(
    "draft tests isolate record writes and never publish the draft",
    async () => {
      const d = blankDocument();
      const def = await service.create(
        { name: "Unpublished draft", document: d },
        a,
      );
      const i: any = await service.test(
        def.id,
        { key: `test-${uid}`, data: { summary: "Test run" } },
        a,
      );
      assert.equal(i.test, true);
      assert.equal((await service.get(def.id, a)).status, "DRAFT");
      assert.equal((await service.get(def.id, a)).versions.length, 0);
    },
  );
  await check(
    "manager relationships use explicit memberships and cross-tenant references fail",
    async () => {
      await service.membership(
        { userId: requester.id, kind: "manager", referenceId: admin.id },
        a,
      );
      const ids = await new FlowAssignment().resolve(
        db,
        company.id,
        requester.id,
        { kind: "manager", values: [] },
        blankDocument(),
        {},
      );
      assert.deepEqual(ids, [admin.id]);
      await assert.rejects(
        service.membership(
          { userId: requester.id, kind: "manager", referenceId: outsider.id },
          { ...a, companyId: other.id },
        ),
      );
    },
  );
  await check(
    "credentials encrypt at rest and private network calls are rejected",
    async () => {
      const connection = await service.connection(
        {
          name: "QA connection",
          baseUrl: "https://127.0.0.1",
          secret: "do-not-expose",
        },
        a,
      );
      assert.equal((connection as any).encryptedSecret, undefined);
      const stored = await db.flowConnection.findUniqueOrThrow({
        where: { id: connection.id },
      });
      assert.ok(!stored.encryptedSecret.includes("do-not-expose"));
      assert.equal(
        integrations.decrypt(stored.encryptedSecret),
        "do-not-expose",
      );
      await assert.rejects(
        integrations.request(stored, "/", "POST", {}, "test-private"),
      );
    },
  );
  await check(
    "first-completed joins cancel outstanding sibling tasks",
    async () => {
      const d = templates().find((t) => t.id === "purchase")!.document;
      d.policies.workflowRoles = { finance: [admin.id] };
      d.nodes.find((n) => n.id === "join")!.config.mode = "first";
      const def = await publish("First review wins", d),
        i: any = await runtime.start(def.id, e, {
          key: `first-${uid}`,
          data: { summary: "Race review", amount: 20000 },
        });
      await action(i.id, a);
      const detail = await service.details(i.id, a);
      assert.equal(detail.status, "COMPLETED");
      assert.ok(detail.tasks.some((t: any) => t.status === "CANCELLED"));
    },
  );
  await check(
    "overdue tasks take timeout routes and emit audit history",
    async () => {
      const d = blankDocument();
      d.nodes[1].config.slaHours = 1;
      d.edges.push({
        id: "timeout",
        source: "review",
        target: "rejected",
        port: "timeout",
      });
      const def = await publish("Service SLA escalation", d),
        i: any = await runtime.start(def.id, e, {
          key: `sla-${uid}`,
          data: { summary: "Overdue service" },
        });
      const task = await db.flowTask.findFirstOrThrow({
        where: { instanceId: i.id, status: "OPEN" },
      });
      await db.flowTask.update({
        where: { id: task.id },
        data: { dueAt: new Date(Date.now() - 1000) },
      });
      const job = await db.flowJob.findFirstOrThrow({
        where: { instanceId: i.id, kind: "OVERDUE" },
      });
      await worker.execute({ ...job, payload: job.payload });
      assert.equal((await service.details(i.id, a)).status, "COMPLETED");
      assert.equal(
        await db.flowEvent.count({
          where: { instanceId: i.id, type: "TASK_OVERDUE" },
        }),
        1,
      );
    },
  );
  await check(
    "integration failures take explicit error routes after bounded attempts",
    async () => {
      const connection = await service.connection(
        {
          name: "Private target blocked",
          baseUrl: "https://127.0.0.1",
          secret: "",
        },
        a,
      );
      const d = blankDocument();
      d.nodes = [
        d.nodes[0],
        {
          id: "call",
          type: "automation",
          label: "Call integration",
          position: { x: 1, y: 1 },
          config: { action: "http", connectionId: connection.id, retries: 0 },
        },
        d.nodes[2],
        d.nodes[3],
      ];
      d.edges = [
        { id: "1", source: "start", target: "call", port: "next" },
        { id: "2", source: "call", target: "approved", port: "next" },
        { id: "3", source: "call", target: "rejected", port: "error" },
      ];
      const def = await publish("Integration recovery", d),
        i: any = await runtime.start(def.id, e, {
          key: `failure-${uid}`,
          data: { summary: "Rejected network call" },
        });
      const job = await db.flowJob.findFirstOrThrow({
        where: { instanceId: i.id, kind: "AUTOMATION" },
      });
      await db.flowJob.update({
        where: { id: job.id },
        data: { dueAt: new Date(0) },
      });
      for (let k = 0; k < 30; k++) {
        await worker.tick();
        if ((await service.details(i.id, a)).status === "COMPLETED") break;
      }
      const result = await service.details(i.id, a);
      assert.equal(result.status, "COMPLETED");
      assert.equal(result.state, "rejected");
      assert.equal(
        (await db.flowJob.findUniqueOrThrow({ where: { id: job.id } })).status,
        "HANDLED",
      );
    },
  );
  await check(
    "field access rules redact responses and prevent restricted edits",
    async () => {
      const d = blankDocument();
      d.fields.push({
        id: "privateNote",
        label: "Private note",
        type: "text",
        readRoles: ["org_admin"],
        writeRoles: ["org_admin"],
      });
      const def = await publish("Protected fields", d),
        i: any = await runtime.start(def.id, a, {
          key: `private-${uid}`,
          data: { summary: "Private data", privateNote: "confidential" },
        });
      const detail = await service.details(i.id, a);
      const task = detail.tasks.find((t: any) => t.status === "OPEN");
      await service.membership(
        { userId: outsider.id, kind: "manager", referenceId: admin.id },
        a,
      );
      await runtime.taskAction(
        task.id,
        {
          action: "reassign",
          revision: i.revision,
          key: "private-reassign",
          targetUserId: outsider.id,
        },
        a,
      );
      const visible = await service.details(i.id, o);
      assert.equal(visible.data.privateNote, undefined);
      await assert.rejects(
        runtime.taskAction(
          task.id,
          {
            action: "approve",
            revision: visible.revision,
            key: "restricted-write",
            data: { privateNote: "modified" },
          },
          o,
        ),
      );
    },
  );
  await check(
    "record-created and date triggers produce deduplicated durable executions",
    async () => {
      const d = blankDocument();
      d.nodes[0].config = { event: "record.created", recordType: "ticket" };
      const def = await publish("Record event", d);
      const record = await db.flowRecord.create({
        data: {
          companyId: company.id,
          type: "ticket",
          data: { summary: "New ticket" },
        },
      });
      await db.$transaction((tx) =>
        runtime.emitRecord(tx, record, "record.created", a, `record-${uid}`),
      );
      await db.$transaction((tx) =>
        runtime.emitRecord(tx, record, "record.created", a, `record-${uid}`),
      );
      assert.equal(
        await db.flowInstance.count({
          where: { definitionId: def.id, entityId: record.id },
        }),
        1,
      );
      const dateDoc = blankDocument();
      dateDoc.nodes[0].config = {
        event: "date",
        recordType: "renewal",
        dateField: "due",
      };
      await publish("Renewal date", dateDoc);
      const renewal = await db.flowRecord.create({
        data: {
          companyId: company.id,
          type: "renewal",
          data: { summary: "Renew service", due: "2030-01-01" },
        },
      });
      await db.$transaction((tx) =>
        runtime.emitRecord(tx, renewal, "record.created", a, `renewal-${uid}`),
      );
      const job = await db.flowJob.findFirstOrThrow({
        where: { companyId: company.id, key: { startsWith: "date:" } },
      });
      assert.equal(job.dueAt.toISOString(), "2029-12-31T18:30:00.000Z");
    },
  );
  // Retain only isolated QA fixtures for browser tests.
  console.log(
    `Verified ${passed} integration scenarios. Browser account: admin-${uid}@workflow.test; tenant: workflow-qa-${uid}`,
  );
  console.log(`QA_USER_ID=${admin.id}`);
  console.log(`QA_COMPANY_ID=${company.id}`);
  console.log(`QA_EMAIL=admin-${uid}@workflow.test`);
  console.log(`QA_SLUG=workflow-qa-${uid}`);
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
