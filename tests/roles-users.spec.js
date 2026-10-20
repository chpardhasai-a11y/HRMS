import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("/tmp/hrms-roles-users-qa-fixture.json", "utf8"),
);
const api = process.env.WORKFLOW_TEST_API || "http://localhost:4111";
let session,
  roleName = `Browser role ${Date.now()}`,
  memberEmail = `browser-role-member-${Date.now()}@workflow.test`;
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => {
  const r = await request.post(`${api}/auth/login`, {
    data: { email: fixture.email, password: fixture.password },
  });
  expect(r.ok()).toBeTruthy();
  session = await r.json();
});
test.beforeEach(async ({ context }) => {
  await context.addInitScript((s) => {
    localStorage.setItem("hrms_token", s.accessToken);
    localStorage.setItem("hrms_user", JSON.stringify(s.user));
    localStorage.setItem("hrms_active_company_id", s.user.companyId);
  }, session);
});
test("create, reopen and edit a level-linked role with real permissions", async ({
  page,
}) => {
  await page.goto("/org-admin/access-control/roles");
  await expect(
    page.getByRole("heading", { name: "Roles Management", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidenav-coming-next")).toHaveCount(0);
  await page.getByRole("button", { name: "Add Role", exact: true }).click();
  await page.getByLabel("Role name", { exact: true }).fill(roleName);
  await page.getByLabel("Level", { exact: true }).selectOption(fixture.levelId);
  await page
    .getByLabel("Search role permissions")
    .fill("org-masters.departments.findAll");
  await page
    .locator(".access-permission-option")
    .filter({ hasText: "org-masters.departments.findAll" })
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: "Save Role", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search roles").fill(roleName);
  const row = page
    .locator(".access-table tbody tr")
    .filter({ hasText: roleName });
  await expect(row).toContainText("L1");
  await row.getByRole("button", { name: "Edit Role", exact: true }).click();
  await expect(page.getByLabel("Role name", { exact: true })).toHaveValue(
    roleName,
  );
  await page
    .getByLabel("Description", { exact: true })
    .fill("Department read access");
  await page.getByRole("button", { name: "Save Role", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Department read access");
});
test("create and manage a user, assign a role, inspect access and reset password", async ({
  page,
  request,
}) => {
  await page.goto("/org-admin/access-control/users");
  await page.getByRole("button", { name: "Add User", exact: true }).click();
  await page.getByLabel("Login email", { exact: true }).fill(memberEmail);
  await page
    .getByLabel("Initial password", { exact: false })
    .fill(fixture.password);
  await page.getByLabel("Search available roles").fill(roleName);
  await page
    .locator(".access-permission-option")
    .filter({ hasText: roleName })
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: "Save User", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search users").fill(memberEmail);
  const row = page
    .locator(".access-table tbody tr")
    .filter({ hasText: memberEmail });
  await expect(row).toContainText(roleName);
  await row
    .getByRole("button", { name: `Actions for ${memberEmail}`, exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "View Access", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "org-masters.departments.findAll",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await row.getByRole("button", { name: "Edit User", exact: true }).click();
  await expect(page.getByLabel("Login email", { exact: true })).toHaveValue(
    memberEmail,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await row
    .getByRole("button", { name: `Actions for ${memberEmail}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Deactivate", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("tab", { name: /^Inactive \(/ }).click();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: `Actions for ${memberEmail}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Activate", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("tab", { name: /^Active \(/ }).click();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: `Actions for ${memberEmail}`, exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Reset Password", exact: true })
    .click();
  await page
    .getByLabel("New password", { exact: false })
    .fill("Browser-reset-QA-2026!");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset Password", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const auth = await request.post(`${api}/auth/login`, {
    data: { email: memberEmail, password: "Browser-reset-QA-2026!" },
  });
  expect(auth.ok()).toBeTruthy();
});
test("delegated account navigates permitted pages and cannot open access administration", async ({
  browser,
  request,
}) => {
  const response = await request.post(`${api}/auth/login`, {
    data: { email: memberEmail, password: "Browser-reset-QA-2026!" },
  });
  expect(response.ok()).toBeTruthy();
  const s = await response.json();
  const context = await browser.newContext();
  await context.addInitScript((s) => {
    localStorage.setItem("hrms_token", s.accessToken);
    localStorage.setItem("hrms_user", JSON.stringify(s.user));
  }, s);
  const page = await context.newPage();
  await page.goto(
    (process.env.WORKFLOW_UI_URL || "http://localhost:3011") +
      "/org-admin/masters/departments",
  );
  await expect(
    page.getByRole("heading", { name: /Departments/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Organization admin navigation" })
      .getByRole("link", { name: "User Management", exact: true }),
  ).toHaveCount(0);
  await page.goto(
    (process.env.WORKFLOW_UI_URL || "http://localhost:3011") +
      "/org-admin/access-control/users",
  );
  await expect(page).toHaveURL(/\/org-admin\/masters\/departments$/);
  await page.goto(
    (process.env.WORKFLOW_UI_URL || "http://localhost:3011") + "/",
  );
  await expect(
    page.getByRole("heading", {
      name: "No employee profile linked",
      exact: true,
    }),
  ).toBeVisible();
  await context.close();
});
test("roles and users follow HRMS styles and fit desktop, tablet and mobile", async ({
  page,
}) => {
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const section of ["roles", "users"]) {
      await page.goto(`/org-admin/access-control/${section}`);
      await expect(page.locator(".access-heading")).toBeVisible();
      await expect(
        page.locator(".access-table tbody tr").first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.locator(".access-heading").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/hrms-${section}-${device}.png` });
      await page
        .getByRole("button", {
          name: section === "roles" ? "Add Role" : "Add User",
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("dialog").getByRole("textbox").first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: `/tmp/hrms-${section}-dialog-${device}.png`,
      });
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
    }
  }
});

test("user summary, role filters, recent sign-ins and CSV export use real data", async ({
  page,
  request,
}) => {
  await page.goto("/org-admin/access-control/users");
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const data = await (
    await request.get(`${api}/access-control/users?status=active&pageSize=1`, {
      headers,
    })
  ).json();
  await expect(
    page
      .locator(".access-detail-stat")
      .filter({ has: page.getByText("Active Users", { exact: true }) })
      .locator("strong"),
  ).toHaveText(String(data.summary.active));
  await expect(
    page
      .locator(".access-detail-stat")
      .filter({ has: page.getByText("Inactive Users", { exact: true }) })
      .locator("strong"),
  ).toHaveText(String(data.summary.inactive));
  const role = data.roleOptions.find((r) => r.name === roleName);
  expect(role).toBeTruthy();
  await page.getByLabel("Filter users by role").selectOption(role.id);
  await expect(page.locator(".access-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".access-table tbody tr")).toContainText(
    memberEmail,
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("hrms-users.csv");
  const csv = readFileSync(await download.path(), "utf8");
  expect(csv).toContain(memberEmail);
  expect(csv).toContain(roleName);
  expect(csv).not.toContain(fixture.email);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.locator(".access-table tbody tr")).toContainText(
    memberEmail,
  );
  await page.getByRole("tab", { name: /^Recently Active/ }).click();
  await expect(
    page.getByText(
      "Active accounts with a successful sign-in in the last 30 days.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".access-table tbody tr")).toContainText(
    memberEmail,
  );
  await page
    .getByLabel("Filter users by role")
    .selectOption("account:org_admin");
  await expect(page.locator(".access-table tbody tr")).toContainText(
    fixture.email,
  );
  await expect(page.locator(".access-table tbody tr")).not.toContainText(
    memberEmail,
  );
});
