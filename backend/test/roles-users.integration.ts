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
  throw new Error("Use disposable flowtest on port 5544 only");
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const db = app.get(PrismaService),
    base = await app.getUrl(),
    uid = Date.now(),
    password = "Roles-Users-QA-2026!";
  let passed = 0;
  async function check(name: string, fn: () => Promise<void>) {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  }
  try {
    const company = await db.company.create({
        data: { name: "Role User QA", slug: `role-user-qa-${uid}` },
      }),
      other = await db.company.create({
        data: { name: "Other Role User QA", slug: `other-role-user-qa-${uid}` },
      }),
      passwordHash = await bcrypt.hash(password, 4);
    const admin = await db.user.create({
        data: {
          companyId: company.id,
          email: `role-admin-${uid}@workflow.test`,
          role: "org_admin",
          passwordHash,
        },
      }),
      foreign = await db.user.create({
        data: {
          companyId: other.id,
          email: `role-other-${uid}@workflow.test`,
          role: "org_admin",
          passwordHash,
        },
      }),
      platform = await db.user.create({
        data: {
          companyId: company.id,
          email: `role-platform-${uid}@workflow.test`,
          role: "platform_admin",
          passwordHash,
        },
      });
    async function login(email: string, p = password) {
      const r = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: p }),
      });
      return { status: r.status, data: await r.json() };
    }
    const adminSession = (await login(admin.email)).data,
      otherSession = (await login(foreign.email)).data;
    let token = adminSession.accessToken;
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
          Authorization: `Bearer ${bearer}`,
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      return { status: r.status, data: await r.json() };
    }
    const level = (
        await req("/access-control/levels", "POST", {
          number: 1,
          displayName: "Head",
        })
      ).data,
      foreignLevel = await db.accessLevel.create({
        data: { companyId: other.id, number: 1 },
      }),
      inactiveLevel = await db.accessLevel.create({
        data: { companyId: company.id, number: 2, isActive: false },
      });
    const readKey = "org-masters.departments.findAll",
      createKey = "org-masters.departments.create";
    let reader: any, writer: any, user: any, employeeToken: string;
    await check(
      "roles validate levels, stable permission keys, uniqueness and company boundaries",
      async () => {
        const r = await req("/access-control/roles", "POST", {
          name: "Department reader",
          levelId: level.id,
          permissionKeys: [readKey],
        });
        assert.equal(r.status, 201);
        reader = r.data;
        for (const [levelId, permissionKeys] of [
          [foreignLevel.id, [readKey]],
          [inactiveLevel.id, [readKey]],
          [level.id, ["companies.create"]],
          [level.id, ["access-control.createUser"]],
          [level.id, ["not-real"]],
        ] as any[]) {
          assert.equal(
            (
              await req("/access-control/roles", "POST", {
                name: "Invalid",
                levelId,
                permissionKeys,
              })
            ).status,
            400,
          );
        }
        assert.equal(
          (
            await req("/access-control/roles", "POST", {
              name: "DEPARTMENT READER",
              levelId: level.id,
              permissionKeys: [],
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req(
              `/access-control/roles/${reader.id}`,
              "GET",
              undefined,
              otherSession.accessToken,
            )
          ).status,
          404,
        );
        writer = (
          await req("/access-control/roles", "POST", {
            name: "Department creator",
            levelId: level.id,
            permissionKeys: [
              createKey,
              "employees.create",
              "employees.resendInvite",
            ],
          })
        ).data;
        assert.equal(
          (await req("/access-control/roles?pageSize=1")).data.items.length,
          1,
        );
      },
    );
    await check(
      "user accounts create without leaking credentials and reject invalid assignments",
      async () => {
        const email = `role-member-${uid}@workflow.test`;
        const r = await req("/access-control/users", "POST", {
          email,
          role: "employee",
          roleIds: [reader.id],
          password,
        });
        assert.equal(r.status, 201);
        user = r.data;
        assert.equal("passwordHash" in r.data, false);
        assert.equal("password" in r.data, false);
        assert.equal(
          (
            await req("/access-control/users", "POST", {
              email: email.toUpperCase(),
              role: "employee",
              roleIds: [],
              password,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req("/access-control/users", "POST", {
              email: `bad-${uid}@workflow.test`,
              role: "platform_admin",
              roleIds: [],
              password,
            })
          ).status,
          400,
        );
        const foreignRole = await db.accessRole.create({
          data: {
            companyId: other.id,
            name: "Other",
            levelId: foreignLevel.id,
            permissionKeys: [],
          },
        });
        assert.equal(
          (
            await req("/access-control/users", "POST", {
              email: `bad-${uid}@workflow.test`,
              role: "employee",
              roleIds: [foreignRole.id],
              password,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req("/access-control/users", "POST", {
              email: `bad-${uid}@workflow.test`,
              role: "employee",
              roleIds: [],
              password: "short",
            })
          ).status,
          400,
        );
        const response = await login(email);
        assert.equal(response.status, 201);
        assert.equal(response.data.user.role, "employee");
        assert.deepEqual(response.data.user.permissions, [readKey]);
        employeeToken = response.data.accessToken;
      },
    );
    await check(
      "custom permissions authorize real APIs without granting unrelated or administrator access",
      async () => {
        assert.equal(
          (
            await req(
              "/org-masters/departments",
              "GET",
              undefined,
              employeeToken,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              "/org-masters/departments",
              "POST",
              { name: "Forbidden" },
              employeeToken,
            )
          ).status,
          403,
        );
        assert.equal(
          (await req("/employees", "GET", undefined, employeeToken)).status,
          403,
        );
        assert.equal(
          (
            await req(
              "/companies",
              "POST",
              { name: "Forbidden" },
              employeeToken,
            )
          ).status,
          403,
        );
        for (const p of ["/roles", "/users", "/permissions"])
          assert.equal(
            (await req("/access-control" + p, "GET", undefined, employeeToken))
              .status,
            403,
          );
        const identity = (
          await req("/auth/me", "GET", undefined, employeeToken)
        ).data;
        assert.deepEqual(identity.permissions, [readKey]);
        assert.equal("passwordHash" in identity, false);
      },
    );
    await check(
      "permission changes and role deactivation apply to existing sessions",
      async () => {
        const r = await req(
          `/access-control/roles/${reader.id}/status`,
          "PATCH",
          { isActive: false, revision: reader.revision },
        );
        assert.equal(r.status, 200);
        reader = r.data;
        assert.equal(
          (
            await req(
              "/org-masters/departments",
              "GET",
              undefined,
              employeeToken,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(`/access-control/roles/${reader.id}/status`, "PATCH", {
              isActive: true,
              revision: 1,
            })
          ).status,
          409,
        );
        const next = await req(
          `/access-control/roles/${reader.id}/status`,
          "PATCH",
          { isActive: true, revision: reader.revision },
        );
        reader = next.data;
        assert.equal(
          (
            await req(
              "/org-masters/departments",
              "GET",
              undefined,
              employeeToken,
            )
          ).status,
          200,
        );
        const results = await Promise.all(
          [1, 2].map(() =>
            req(`/access-control/roles/${writer.id}/status`, "PATCH", {
              isActive: true,
              revision: writer.revision,
            }),
          ),
        );
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        writer = results.find((r) => r.status === 200)!.data;
      },
    );
    await check(
      "multiple role assignments combine permissions and revoke stale user sessions",
      async () => {
        user = (await req(`/access-control/users/${user.id}/detail`)).data;
        const r = await req(`/access-control/users/${user.id}`, "PATCH", {
          email: user.email,
          role: "employee",
          employeeCode: "",
          roleIds: [reader.id, writer.id],
          isActive: true,
          updatedAt: user.updatedAt,
        });
        assert.equal(r.status, 200);
        user = r.data;
        assert.equal(
          (await req("/auth/me", "GET", undefined, employeeToken)).status,
          401,
        );
        employeeToken = (await login(user.email)).data.accessToken;
        assert.equal(
          (
            await req(
              "/org-masters/departments",
              "GET",
              undefined,
              employeeToken,
            )
          ).status,
          200,
        );
        const created = await req(
          "/org-masters/departments",
          "POST",
          { name: "Allowed department" },
          employeeToken,
        );
        assert.equal(created.status, 201);
        assert.equal(
          (
            await req(
              `/org-masters/departments/${created.data.id}`,
              "DELETE",
              undefined,
              employeeToken,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(`/access-control/users/${user.id}`, "PATCH", {
              email: user.email,
              role: "employee",
              employeeCode: "",
              roleIds: [],
              isActive: true,
              updatedAt: "2000-01-01T00:00:00.000Z",
            })
          ).status,
          409,
        );
      },
    );
    await check(
      "account deactivation blocks login and revokes live sessions",
      async () => {
        user = (await req(`/access-control/users/${user.id}/detail`)).data;
        const r = await req(
          `/access-control/users/${user.id}/status`,
          "PATCH",
          { isActive: false, updatedAt: user.updatedAt },
        );
        assert.equal(r.status, 200);
        user = r.data;
        assert.equal(
          (await req("/auth/me", "GET", undefined, employeeToken)).status,
          401,
        );
        assert.equal((await login(user.email)).status, 401);
        const active = await req(
          `/access-control/users/${user.id}/status`,
          "PATCH",
          { isActive: true, updatedAt: user.updatedAt },
        );
        assert.equal(active.status, 200);
        user = active.data;
        employeeToken = (await login(user.email)).data.accessToken;
      },
    );
    await check(
      "password resets revoke sessions and cannot use invitation bypasses",
      async () => {
        user = (await req(`/access-control/users/${user.id}/detail`)).data;
        const newPassword = "New-Roles-QA-2026!";
        assert.equal(
          (
            await req(`/access-control/users/${user.id}/password`, "POST", {
              password: newPassword,
              updatedAt: user.updatedAt,
            })
          ).status,
          201,
        );
        assert.equal((await login(user.email)).status, 401);
        assert.equal(
          (await req("/auth/me", "GET", undefined, employeeToken)).status,
          401,
        );
        assert.equal((await login(user.email, newPassword)).status, 201);
        assert.equal(
          (
            await req("/auth/verify-invite", "POST", {
              email: user.email,
              otpOrTempPassword: "123456",
            })
          ).status,
          400,
        );
        user = (await req(`/access-control/users/${user.id}/detail`)).data;
        await req(`/access-control/users/${user.id}/password`, "POST", {
          password,
          updatedAt: user.updatedAt,
        });
        user = (await req(`/access-control/users/${user.id}/detail`)).data;
      },
    );
    await check(
      "self lockout, platform modification and cross-company access are blocked",
      async () => {
        const current = (await req(`/access-control/users/${admin.id}/detail`))
          .data;
        assert.equal(
          (
            await req(`/access-control/users/${admin.id}/status`, "PATCH", {
              isActive: false,
              updatedAt: current.updatedAt,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await req(`/access-control/users/${admin.id}`, "PATCH", {
              email: admin.email,
              role: "employee",
              employeeCode: "",
              roleIds: [],
              isActive: true,
              updatedAt: current.updatedAt,
            })
          ).status,
          403,
        );
        assert.equal(
          (await req(`/access-control/users/${platform.id}/detail`)).status,
          404,
        );
        assert.equal(
          (
            await req(
              `/access-control/users/${user.id}/detail`,
              "GET",
              undefined,
              otherSession.accessToken,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(
              `/access-control/users/${user.id}/password`,
              "POST",
              { password, updatedAt: user.updatedAt },
              otherSession.accessToken,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(
              "/access-control/users",
              "GET",
              undefined,
              otherSession.accessToken,
            )
          ).data.items.some((u: any) => u.id === user.id),
          false,
        );
      },
    );
    await check(
      "employee links and workflow custom role assignment share company boundaries",
      async () => {
        const employee = await db.employee.create({
          data: {
            companyId: company.id,
            code: "ROLE-QA",
            name: "Role QA Person",
            email: user.email,
            role: "Analyst",
            department: "QA",
            entity: "QA",
            location: "QA",
            manager: "QA",
            type: "Full Time",
            grade: "G1",
            joinDate: new Date(),
          },
        });
        const r = await req(`/access-control/users/${user.id}`, "PATCH", {
          email: user.email,
          role: "employee",
          employeeCode: employee.code,
          roleIds: [reader.id, writer.id],
          isActive: true,
          updatedAt: user.updatedAt,
        });
        assert.equal(r.status, 200);
        user = r.data;
        assert.equal(
          (
            await req("/access-control/users", "POST", {
              email: `duplicate-link-${uid}@workflow.test`,
              role: "employee",
              roleIds: [],
              employeeCode: employee.code,
              password,
            })
          ).status,
          409,
        );
        const doc = blankDocument();
        const candidates = await new FlowAssignment().resolve(
          db,
          company.id,
          admin.id,
          { kind: "role", values: [reader.id] },
          doc,
          {},
        );
        assert.deepEqual(candidates, [user.id]);
      },
    );
    await check(
      "delegated onboarding cannot replace existing administrator credentials",
      async () => {
        const before = await db.user.findUniqueOrThrow({
          where: { id: admin.id },
        });
        const memberSession = (await login(user.email)).data.accessToken;
        const record = await req(
          "/employees",
          "POST",
          {
            code: `EXISTING-ACCOUNT-${uid}`,
            name: "Existing account employee",
            email: admin.email,
            role: "Analyst",
            department: "QA",
            entity: "QA",
            location: "QA",
            manager: "QA",
            type: "Full Time",
            grade: "G1",
            joinDate: "2026-10-20",
          },
          memberSession,
        );
        assert.equal(record.status, 201);
        assert.equal(record.data.inviteDetails, null);
        assert.equal(
          (
            await req(
              `/employees/EXISTING-ACCOUNT-${uid}/resend-invite`,
              "POST",
              {},
              memberSession,
            )
          ).status,
          409,
        );
        const after = await db.user.findUniqueOrThrow({
          where: { id: admin.id },
        });
        assert.equal(after.passwordHash, before.passwordHash);
        assert.equal(after.authVersion, before.authVersion);
        assert.equal(after.employeeCode, before.employeeCode);
      },
    );
    await check(
      "audit history and all user responses exclude passwords and hashes",
      async () => {
        const logs = await db.securityAuditLog.findMany({
          where: { companyId: company.id },
        });
        const text = JSON.stringify(logs);
        assert.ok(!text.includes(password) && !text.includes("passwordHash"));
        for (const action of [
          "ACCESS_ROLE_CREATED",
          "ACCESS_ROLE_STATUS_CHANGED",
          "ACCESS_USER_CREATED",
          "ACCESS_USER_UPDATED",
          "ACCESS_USER_STATUS_CHANGED",
          "ACCESS_USER_PASSWORD_RESET",
        ])
          assert.ok(logs.some((l) => l.action === action));
        const list = await req("/access-control/users");
        assert.equal(JSON.stringify(list.data).includes("passwordHash"), false);
      },
    );

    await check(
      "user summaries, recent activity, role filters and organization relationships remain tenant scoped",
      async () => {
        const ownTeam = await db.team.create({
          data: {
            companyId: company.id,
            code: `DETAIL-${uid}`,
            name: "Detail team",
          },
        });
        const foreignTeam = await db.team.create({
          data: {
            companyId: other.id,
            code: `FOREIGN-${uid}`,
            name: "Hidden team",
          },
        });
        await db.flowMembership.createMany({
          data: [
            {
              companyId: company.id,
              userId: user.id,
              kind: "team",
              referenceId: ownTeam.id,
            },
            {
              companyId: company.id,
              userId: user.id,
              kind: "manager",
              referenceId: admin.id,
            },
            {
              companyId: company.id,
              userId: user.id,
              kind: "team",
              referenceId: foreignTeam.id,
            },
            {
              companyId: company.id,
              userId: user.id,
              kind: "manager",
              referenceId: foreign.id,
            },
          ],
        });
        const reportingLevel = await db.accessLevel.create({
          data: {
            companyId: company.id,
            number: 3,
            displayName: "Reporting level",
          },
        });
        const reportingRoles = await Promise.all(
          [1, 2].map((n) =>
            db.accessRole.create({
              data: {
                companyId: company.id,
                levelId: reportingLevel.id,
                name: `Catalog reporting ${n}`,
                permissionKeys: n === 1 ? [readKey] : [],
              },
            }),
          ),
        );
        await db.accessUserRole.createMany({
          data: reportingRoles.map((r) => ({
            companyId: company.id,
            userId: user.id,
            roleId: r.id,
          })),
        });
        const catalog = await req(
          "/access-control/roles?search=Catalog%20reporting",
        );
        assert.equal(catalog.data.total, 2);
        assert.ok(catalog.data.summary.totalRoles > catalog.data.total);
        assert.ok(catalog.data.summary.assignedPermissions >= 1);
        assert.ok(
          catalog.data.items.every(
            (r: any) =>
              r.memberTeams.length === 1 && r.memberTeams[0].id === ownTeam.id,
          ),
        );
        const teamCatalog = await req(
          "/access-control/teams?search=Detail%20team",
        );
        assert.ok(teamCatalog.data.items[0].memberRoleCount >= 2);
        assert.equal(
          teamCatalog.data.summary.totalRoles,
          catalog.data.summary.totalRoles,
        );
        const hierarchy = await req("/access-control/levels?search=L3");
        assert.equal(hierarchy.data.items[0].roleCount, 2);
        assert.equal(hierarchy.data.items[0].activeUserCount, 1);
        assert.deepEqual(
          hierarchy.data.items[0].teams.map((t: any) => t.id),
          [ownTeam.id],
        );
        for (const r of reportingRoles) {
          await req(`/access-control/roles/${r.id}/status`, "PATCH", {
            isActive: false,
            revision: r.revision,
          });
        }
        const after = await req("/access-control/levels?search=L3");
        assert.equal(after.data.items[0].activeUserCount, 0);
        assert.equal(after.data.items[0].roleCount, 2);
        const recentUser = await db.user.create({
          data: {
            companyId: company.id,
            email: `recent-${uid}@workflow.test`,
            role: "employee",
            passwordHash,
            lastLoginAt: new Date(),
          },
        });
        const oldUser = await db.user.create({
          data: {
            companyId: company.id,
            email: `old-${uid}@workflow.test`,
            role: "employee",
            passwordHash,
            lastLoginAt: new Date(Date.now() - 40 * 86400000),
          },
        });
        const inactiveUser = await db.user.create({
          data: {
            companyId: company.id,
            email: `inactive-${uid}@workflow.test`,
            role: "employee",
            passwordHash,
            isActive: false,
            lastLoginAt: new Date(),
          },
        });
        const all = await req("/access-control/users?pageSize=100");
        assert.equal(all.status, 200);
        const own = await db.user.findMany({
          where: { companyId: company.id, role: { not: "platform_admin" } },
        });
        assert.equal(
          all.data.summary.active,
          own.filter((p) => p.isActive).length,
        );
        assert.equal(
          all.data.summary.inactive,
          own.filter((p) => !p.isActive).length,
        );
        assert.equal(
          all.data.items.some(
            (p: any) => p.id === foreign.id || p.id === platform.id,
          ),
          false,
        );
        const detailed = all.data.items.find((p: any) => p.id === user.id);
        assert.deepEqual(
          detailed.teams.map((t: any) => t.id),
          [ownTeam.id],
        );
        assert.deepEqual(
          detailed.managers.map((t: any) => t.id),
          [admin.id],
        );
        const recent = await req(
          "/access-control/users?activity=recent&pageSize=100",
        );
        assert.ok(recent.data.items.some((p: any) => p.id === recentUser.id));
        assert.equal(
          recent.data.items.some((p: any) =>
            [oldUser.id, inactiveUser.id].includes(p.id),
          ),
          false,
        );
        const filtered = await req(`/access-control/users?roleId=${reader.id}`);
        assert.ok(
          filtered.data.items.every((p: any) =>
            p.accessRoles.some((r: any) => r.role.id === reader.id),
          ),
        );
        const administrators = await req(
          "/access-control/users?accountType=org_admin",
        );
        assert.ok(
          administrators.data.items.every((p: any) => p.role === "org_admin"),
        );
        assert.equal(
          (await req("/access-control/users?accountType=platform_admin"))
            .status,
          400,
        );
        assert.equal(
          (await req("/access-control/users?activity=unknown")).status,
          400,
        );
      },
    );
    writeFileSync(
      "/tmp/hrms-roles-users-qa-fixture.json",
      JSON.stringify({
        email: admin.email,
        password,
        memberEmail: user.email,
        memberId: user.id,
        levelId: level.id,
        roleId: reader.id,
        companyId: company.id,
      }),
    );
    console.log(`${passed} Roles and Users PostgreSQL/HTTP scenarios passed.`);
  } finally {
    await app.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
