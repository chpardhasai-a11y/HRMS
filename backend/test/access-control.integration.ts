import "reflect-metadata";
import { strict as assert } from "assert";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { writeFileSync } from "fs";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PrismaExceptionFilter } from "../src/common/filters/prisma-exception.filter";
import { FlowAssignment } from "../src/workflows/flow.assignment";
import { blankDocument } from "../src/workflows/flow.templates";

if (!process.env.DATABASE_URL?.includes("127.0.0.1:5544/flowtest"))
  throw new Error("Use only disposable flowtest on port 5544");
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const db = app.get(PrismaService),
    base = await app.getUrl(),
    uid = Date.now();
  let count = 0;
  async function check(name: string, fn: () => Promise<void>) {
    await fn();
    console.log(`PASS ${name}`);
    count++;
  }
  try {
    const company = await db.company.create({
        data: { name: "Access QA", slug: `access-qa-${uid}` },
      }),
      other = await db.company.create({
        data: { name: "Other Access QA", slug: `access-other-${uid}` },
      });
    const password = "Access-QA-2026!",
      passwordHash = await bcrypt.hash(password, 4);
    const admin = await db.user.create({
      data: {
        companyId: company.id,
        email: `access-admin-${uid}@workflow.test`,
        passwordHash,
        role: "org_admin",
      },
    });
    const member = await db.user.create({
      data: {
        companyId: company.id,
        email: `access-member-${uid}@workflow.test`,
        passwordHash,
        role: "employee",
      },
    });
    const inactive = await db.user.create({
      data: {
        companyId: company.id,
        email: `access-inactive-${uid}@workflow.test`,
        passwordHash,
        role: "employee",
        isActive: false,
      },
    });
    const outsider = await db.user.create({
      data: {
        companyId: other.id,
        email: `access-other-${uid}@workflow.test`,
        passwordHash,
        role: "org_admin",
      },
    });
    const platform = await db.user.create({
      data: {
        companyId: company.id,
        email: `access-platform-${uid}@workflow.test`,
        passwordHash,
        role: "platform_admin",
      },
    });
    async function login(email: string) {
      const r = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(r.status, 201);
      return (await r.json()).accessToken;
    }
    const token = await login(admin.email),
      employeeToken = await login(member.email),
      otherToken = await login(outsider.email),
      platformToken = await login(platform.email);
    async function req(
      path: string,
      method = "GET",
      data?: any,
      bearer = token,
    ) {
      const r = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      return { status: r.status, data: await r.json() };
    }
    await check(
      "only active organization administrators access new APIs",
      async () => {
        for (const path of [
          "/permissions",
          "/levels",
          "/teams",
          "/users/options",
        ]) {
          assert.equal(
            (await req("/access-control" + path, "GET", undefined, "")).status,
            401,
          );
          assert.equal(
            (
              await req(
                "/access-control" + path,
                "GET",
                undefined,
                employeeToken,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await req(
                "/access-control" + path,
                "GET",
                undefined,
                platformToken,
              )
            ).status,
            403,
          );
        }
        await db.user.update({
          where: { id: admin.id },
          data: { isActive: false },
        });
        assert.equal((await req("/access-control/levels")).status, 401);
        await db.user.update({
          where: { id: admin.id },
          data: { isActive: true },
        });
      },
    );
    await check(
      "permission catalog is read-only, searchable and paginated",
      async () => {
        const r = await req("/access-control/permissions?pageSize=2");
        assert.equal(r.status, 200);
        assert.equal(r.data.items.length, 2);
        assert.ok(r.data.total > 100);
        assert.ok(
          (
            await req("/access-control/permissions?module=Workflows")
          ).data.items.every((p: any) => p.module === "Workflows"),
        );
        for (const method of ["POST", "PATCH", "DELETE", "PUT"])
          assert.equal(
            (await req("/access-control/permissions", method, {})).status,
            404,
          );
        assert.equal(
          (await req("/access-control/permissions?page=0")).status,
          400,
        );
      },
    );
    let level: any;
    await check(
      "levels validate, sort numerically, and handle simultaneous duplicates",
      async () => {
        for (const number of [10, 2, 1]) {
          const r = await req("/access-control/levels", "POST", {
            number,
            displayName: `Level ${number}`,
          });
          assert.equal(r.status, 201);
          if (number === 1) level = r.data;
        }
        const levels = (await req("/access-control/levels")).data.items;
        assert.deepEqual(
          levels.map((l: any) => l.code),
          ["L1", "L2", "L10"],
        );
        assert.equal(
          (
            await req(`/access-control/levels/${level.id}`, "PATCH", {
              displayName: null,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(`/access-control/levels/${level.id}`, "PATCH", {
              number: null,
            })
          ).status,
          400,
        );
        for (const number of [0, -1, 1.2, "3", 2147483648])
          assert.equal(
            (await req("/access-control/levels", "POST", { number })).status,
            400,
          );
        const results = await Promise.all(
          [1, 2].map(() =>
            req("/access-control/levels", "POST", { number: 3 }),
          ),
        );
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
        assert.equal(
          (await req("/access-control/levels?search=L10")).data.total,
          1,
        );
        assert.equal(
          (
            await req(`/access-control/levels/${level.id}`, "PATCH", {
              number: 2,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req(`/access-control/levels/${level.id}/status`, "PATCH", {
              isActive: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (await req("/access-control/levels?status=inactive")).data.total,
          1,
        );
        assert.equal(
          (await req(`/access-control/levels/${level.id}`, "DELETE")).status,
          404,
        );
      },
    );
    await check(
      "levels are tenant isolated without changing user roles",
      async () => {
        assert.equal(
          (await req("/access-control/levels", "GET", undefined, otherToken))
            .data.total,
          0,
        );
        assert.equal(
          (
            await req(
              `/access-control/levels/${level.id}`,
              "PATCH",
              { description: "Forbidden" },
              otherToken,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(
              "/access-control/levels",
              "POST",
              { number: 1 },
              otherToken,
            )
          ).status,
          201,
        );
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: admin.id } })).role,
          "org_admin",
        );
      },
    );
    const department = await db.department.create({
        data: { companyId: company.id, code: "QA", name: "QA" },
      }),
      foreignDepartment = await db.department.create({
        data: { companyId: other.id, code: "OTHER", name: "Other" },
      });
    let team: any;
    await check(
      "teams reuse existing records and reject foreign departments",
      async () => {
        assert.equal(
          (
            await req("/access-control/teams", "POST", {
              name: "Bad",
              departmentId: foreignDepartment.id,
            })
          ).status,
          400,
        );
        assert.equal(
          (await req("/access-control/teams", "POST", { name: "   " })).status,
          400,
        );
        const r = await req("/access-control/teams", "POST", {
          name: "Access QA Team",
          departmentId: department.id,
        });
        assert.equal(r.status, 201);
        team = r.data;
        assert.equal(
          (await req("/org-masters/teams")).data.some(
            (t: any) => t.id === team.id,
          ),
          true,
        );
        assert.equal(
          (
            await req(`/access-control/teams/${team.id}`, "PATCH", {
              departmentId: foreignDepartment.id,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(`/org-masters/teams/${team.id}`, "PATCH", {
              departmentId: foreignDepartment.id,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(`/access-control/teams/${team.id}`, "PATCH", {
              description: "Changed",
            })
          ).status,
          200,
        );
      },
    );
    await check(
      "team memberships deduplicate and legacy writes use identical validation",
      async () => {
        const results = await Promise.all(
          [1, 2].map(() =>
            req(`/access-control/teams/${team.id}/members`, "POST", {
              userId: member.id,
            }),
          ),
        );
        assert.ok(results.every((r) => r.status === 201));
        assert.equal(
          await db.flowMembership.count({
            where: {
              companyId: company.id,
              kind: "team",
              referenceId: team.id,
              userId: member.id,
            },
          }),
          1,
        );
        assert.equal(
          (await req(`/access-control/teams/${team.id}/members`)).data.total,
          1,
        );
        assert.equal(
          (await req("/access-control/teams")).data.items[0].memberCount,
          1,
        );
        assert.equal(
          (
            await req("/workflows/memberships", "POST", {
              kind: "team",
              referenceId: team.id,
              userId: member.id,
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await req("/workflows/memberships", "POST", {
              kind: "team",
              referenceId: team.id,
              userId: outsider.id,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(`/access-control/teams/${team.id}/members`, "POST", {
              userId: outsider.id,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(`/access-control/teams/${team.id}/members`, "POST", {
              userId: inactive.id,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(
              `/access-control/teams/${team.id}/members`,
              "GET",
              undefined,
              otherToken,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(
              `/access-control/teams/${team.id}/members/${outsider.id}`,
              "DELETE",
            )
          ).status,
          404,
        );
        const options = (await req("/access-control/users/options")).data.items;
        assert.ok(
          options.every(
            (u: any) =>
              !("passwordHash" in u) &&
              !("role" in u) &&
              ![outsider.id, inactive.id].includes(u.id),
          ),
        );
        assert.equal(
          (await req(`/access-control/teams/${team.id}`, "DELETE")).status,
          409,
        );
      },
    );
    await check(
      "workflow assignments honor active teams and preserve existing candidates",
      async () => {
        const doc = blankDocument();
        doc.nodes.find((n) => n.id === "review")!.config.assignment = {
          kind: "team",
          values: [team.id],
        };
        const created = await req("/workflows", "POST", {
          name: "Access team assignment",
          document: doc,
        });
        assert.equal(created.status, 201);
        assert.equal(
          (
            await req(`/workflows/${created.data.id}/publish`, "POST", {
              revision: 1,
            })
          ).status,
          201,
        );
        const instance = await req(
          `/workflows/${created.data.id}/start`,
          "POST",
          { data: { summary: "Assignment test" }, key: `access:${uid}` },
        );
        assert.equal(instance.status, 201);
        const task = await db.flowTask.findFirstOrThrow({
          where: { instanceId: instance.data.id },
        });
        assert.deepEqual(task.candidates, [member.id]);
        await req(`/access-control/teams/${team.id}/status`, "PATCH", {
          isActive: false,
        });
        assert.deepEqual(
          await new FlowAssignment().resolve(
            db,
            company.id,
            admin.id,
            { kind: "team", values: [team.id] },
            doc,
            {},
          ),
          [],
        );
        assert.deepEqual(
          (await db.flowTask.findUniqueOrThrow({ where: { id: task.id } }))
            .candidates,
          [member.id],
        );
        await req(
          `/access-control/teams/${team.id}/members/${member.id}`,
          "DELETE",
        );
        assert.equal(
          (await req(`/access-control/teams/${team.id}`, "DELETE")).status,
          409,
        ); // Published graph still references it.
        await req(`/access-control/teams/${team.id}/status`, "PATCH", {
          isActive: true,
        });
        await req(`/access-control/teams/${team.id}/members`, "POST", {
          userId: member.id,
        });
        const bad = blankDocument();
        bad.nodes.find((n) => n.id === "review")!.config.assignment = {
          kind: "team",
          values: ["unknown-team"],
        };
        assert.equal(
          (
            await req("/workflows", "POST", {
              name: "Unknown team",
              document: bad,
            })
          ).status,
          400,
        );
      },
    );
    await check(
      "deleting an unused team succeeds and auditing is transactional",
      async () => {
        const r = await req("/access-control/teams", "POST", {
          name: "Unused",
        });
        assert.equal(r.status, 201);
        assert.equal(
          (await req(`/access-control/teams/${r.data.id}`, "DELETE")).status,
          200,
        );
        const actions = (
          await db.securityAuditLog.findMany({
            where: { companyId: company.id },
          })
        ).map((l) => l.action);
        for (const a of [
          "ACCESS_LEVEL_CREATED",
          "ACCESS_LEVEL_UPDATED",
          "TEAM_CREATED",
          "TEAM_UPDATED",
          "TEAM_MEMBER_ADDED",
          "TEAM_MEMBER_REMOVED",
          "TEAM_DELETED",
        ])
          assert.ok(actions.includes(a));
        assert.equal(
          await db.securityAuditLog.count({
            where: { companyId: company.id, action: "ACCESS_LEVEL_CREATED" },
          }),
          4,
        );
        assert.equal(
          await db.approvalRequest.count({ where: { id: "legacy-request" } }),
          1,
        );
      },
    );
    writeFileSync(
      "/tmp/hrms-access-qa-fixture.json",
      JSON.stringify({
        email: admin.email,
        memberEmail: member.email,
        password,
        teamId: team.id,
        companyId: company.id,
      }),
    );
    console.log(`${count} Access Control Postgres/HTTP checks passed.`);
  } finally {
    await app.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
