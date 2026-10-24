import { test, expect } from "@playwright/test";
import { chooseDropdown } from "./helpers/dropdown";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("/tmp/hrms-access-qa-fixture.json", "utf8"),
);
const api = process.env.WORKFLOW_TEST_API || "http://localhost:4100";
let session;
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
test("permissions remain read-only and Access Control uses shared navigation", async ({
  page,
}) => {
  await page.goto("/org-admin/access-control/permissions");
  await expect(
    page.getByRole("heading", { name: "Permissions", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".app-sidenav")).toHaveCount(1);
  await expect(
    page
      .getByRole("navigation", { name: "Organization admin navigation" })
      .getByRole("link", { name: "Access Control", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Organization admin navigation" })
      .getByRole("link", { name: "Overview", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".sidenav-coming-next")).toHaveCount(0);
  await expect(
    page
      .locator(".access-page")
      .getByRole("button", { name: /Add|Edit|Delete/ }),
  ).toHaveCount(0);
  await chooseDropdown(page, "Filter by module", "workflows");
  const table = page.getByRole("table", { name: "Permissions", exact: true });
  await expect(table).toContainText("Workflows");
  await expect(table).not.toContainText("Workflow Design");
  await page
    .getByLabel("Search permissions", { exact: true })
    .fill("not-existing-catalog-key");
  await expect(
    page.getByText("No records found.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search permissions", { exact: true }).fill("");
  await chooseDropdown(page, "Filter by module", "");
  await expect(table).toContainText("Access Control");
  await expect(page.getByText("Business actions", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("System details", { exact: true })).toHaveCount(
    0,
  );
});
test("levels create, validate duplicates, reopen and deactivate", async ({
  page,
}) => {
  const number = 100000 + (Date.now() % 10000000);
  await page.goto("/org-admin/access-control/levels");
  await page.getByRole("button", { name: "New Level", exact: true }).click();
  await page.getByLabel("Level number", { exact: false }).fill(String(number));
  await page.getByLabel("Display name", { exact: true }).fill("QA lead");
  await page.getByRole("button", { name: "Save Level", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search levels").fill(`L${number}`);
  const row = page
    .locator(".access-table tbody tr")
    .filter({ hasText: `L${number}` });
  await expect(row).toContainText("QA lead");
  await row
    .getByRole("button", { name: `Edit L${number}`, exact: true })
    .click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "QA lead",
  );
  await page.getByLabel("Description", { exact: true }).fill("Hierarchy only");
  await page.getByRole("button", { name: "Save Level", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await row
    .getByRole("button", { name: `Actions for L${number}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Deactivate", exact: true }).click();
  await expect(row).toContainText("Inactive");
  await page.getByRole("button", { name: "New Level", exact: true }).click();
  await page.getByLabel("Level number", { exact: false }).fill(String(number));
  await page.getByRole("button", { name: "Save Level", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("teams redirect, save, add/remove members and protect referenced teams", async ({
  page,
}) => {
  const name = `Browser team ${Date.now()}`;
  await page.goto("/org-admin/masters/teams");
  await expect(page).toHaveURL(/access-control\/teams$/);
  await page.getByRole("button", { name: "New Team", exact: true }).click();
  await page.getByLabel("Team name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save Team", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search teams").fill(name);
  const row = page.locator(".access-table tbody tr").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: "Manage Members", exact: true })
    .click();
  await page.getByLabel("Search organization users").fill(fixture.memberEmail);
  await page
    .getByRole("button", { name: `Add ${fixture.memberEmail}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Remove ${fixture.memberEmail}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(row).toContainText("1");
  await row
    .getByRole("button", { name: `Actions for ${name}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Team", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Deactivate",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await row
    .getByRole("button", { name: "Manage Members", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Remove ${fixture.memberEmail}`, exact: true })
    .click();
  await expect(
    page.getByText("Member removed.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await row
    .getByRole("button", { name: `Actions for ${name}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Team", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Team deleted.", { exact: true })).toBeVisible();
});
test("permissions, levels and teams fit desktop, tablet and mobile", async ({
  page,
}) => {
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const section of ["permissions", "levels", "teams"]) {
      await page.goto(`/org-admin/access-control/${section}`);
      await expect(
        page.locator(".access-table tbody tr").first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${device} ${section}`,
      ).toBeTruthy();
      await page.locator(".access-heading").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/hrms-access-${device}-${section}.png`,
      });
    }
  }
  await page.getByRole("button", { name: "New Team", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/hrms-access-mobile-team-dialog.png" });
});

test("overview shows live organization counts and opens the existing creation forms", async ({
  page,
  request,
}) => {
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const expected = await Promise.all(
    ["users", "roles", "teams", "levels", "permissions"].map(
      async (section) => {
        const response = await request.get(
          `${api}/access-control/${section}?pageSize=100${section === "permissions" ? "" : "&status=active"}`,
          { headers },
        );
        expect(response.ok()).toBeTruthy();
        const result = await response.json();
        if (section === "permissions")
          result.total = result.catalogGroups.reduce(
            (n, g) => n + g.actions.length,
            0,
          );
        return result;
      },
    ),
  );
  await page.goto("/org-admin/access-control");
  await expect(
    page.getByRole("heading", { name: "Access Control", exact: true }),
  ).toBeVisible();
  const stats = page.getByRole("region", { name: "Access Control summary" });
  await expect(stats).toHaveAttribute("aria-busy", "false");
  for (const [i, label] of [
    "Active users",
    "Active roles",
    "Teams",
    "Levels",
    "Permissions",
  ].entries()) {
    await expect(
      stats
        .locator(".access-stat")
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator("strong"),
    ).toHaveText(new Intl.NumberFormat("en-IN").format(expected[i].total));
  }
  const modules = page.getByRole("region", { name: "Access Control modules" });
  await expect(modules.getByRole("link")).toHaveCount(5);
  for (const section of ["Users", "Roles", "Permissions", "Levels", "Teams"]) {
    await expect(
      modules.getByRole("link", { name: `Open ${section}`, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText("Activity Logs", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Email Logs", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Clusters", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Create Role", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Add Role");
  await expect(page.getByLabel("Role name", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Access Control", exact: true })
    .click();
  await page.getByRole("link", { name: "Add User", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Add User");
  await expect(page.getByLabel("Login email", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("overview recovers from summary errors without showing invented counts", async ({
  page,
}) => {
  await page.route("**/access-control/users?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Summary temporarily unavailable" }),
    }),
  );
  await page.goto("/org-admin/access-control");
  await expect(page.locator(".access-page").getByRole("alert")).toContainText(
    "Summary temporarily unavailable",
  );
  await expect(page.locator(".access-stat strong")).toHaveText([
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
  ]);
  await page.unroute("**/access-control/users?**");
  await page
    .getByRole("button", { name: "Retry summary", exact: true })
    .click();
  await expect(page.locator(".access-page").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Access Control summary" }),
  ).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".access-stat strong").first()).not.toHaveText("—");
});

test("overview adapts to desktop, tablet and mobile without clipping", async ({
  page,
}) => {
  for (const [device, width, height] of [
    ["desktop", 1920, 1080],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/org-admin/access-control");
    await expect(
      page.getByRole("region", { name: "Access Control summary" }),
    ).toHaveAttribute("aria-busy", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      device,
    ).toBeTruthy();
    const cards = page.locator(".access-module-card");
    for (let i = 0; i < (await cards.count()); i++) {
      expect(
        await cards.nth(i).evaluate((el) => el.scrollWidth <= el.clientWidth),
        `${device} card ${i}`,
      ).toBeTruthy();
    }
    await page.screenshot({
      path: `/tmp/hrms-access-overview-${device}.png`,
      fullPage: true,
    });
  }
});

test("row action menus support keyboard navigation and restore focus", async ({
  page,
}) => {
  await page.goto("/org-admin/access-control/levels");
  const trigger = page.getByRole("button", { name: /^Actions for L/ }).first();
  await trigger.click();
  const action = page.getByRole("menuitem").first();
  await expect(action).toBeFocused();
  await page.keyboard.press("End");
  await expect(action).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("mobile navigation starts compact and expands the shared HRMS menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/org-admin/access-control");
  const nav = page.getByRole("navigation", {
    name: "Organization admin navigation",
  });
  const toggle = page.getByRole("button", {
    name: "Open organization navigation",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  expect(
    await page
      .locator(".access-heading")
      .evaluate((el) => el.getBoundingClientRect().top),
  ).toBeLessThan(150);
  await toggle.click();
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Access Control", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Access Control", exact: true }),
  ).toBeVisible();
  await expect(nav).toBeHidden();
  await page
    .getByRole("button", { name: "Open organization navigation", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(
    page.getByRole("button", {
      name: "Open organization navigation",
      exact: true,
    }),
  ).toBeFocused();
});

test("permissions show CRUD and special actions with module and permission descriptions", async ({
  page,
  request,
}) => {
  const response = await request.get(`${api}/access-control/roles/options`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const { businessGroups: groups } = await response.json();
  const total = groups.reduce((n, g) => n + g.actions.length, 0);
  await page.goto("/org-admin/access-control/permissions");
  const table = page.getByRole("table", { name: "Permissions", exact: true });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Permission Name",
    "Code",
    "Section",
    "Module",
    "Action",
    "Description",
  ]);
  await expect(page.locator(".access-result-count")).toHaveText(
    `${total} of ${total} permissions`,
  );
  await chooseDropdown(page, "Filter by module", "employees");
  const employees = groups.find((g) => g.id === "employees");
  await expect(table.locator(".access-action-tag")).toHaveText([
    "Create",
    "Read",
    "Update",
    "Delete",
  ]);
  await expect(table).toContainText(employees.description);
  for (const permission of employees.actions)
    await expect(table).toContainText(permission.description);
  await expect(table).not.toContainText("employees.findAll");
  await chooseDropdown(page, "Filter by module", "");
  await chooseDropdown(page, "Filter by action", "Approve");
  await expect(table.locator(".access-action-tag")).toHaveText(["Approve"]);
  await expect(table).toContainText("HR Approvals");
  await expect(table).toContainText(
    "Approve eligible employee change requests",
  );
  await chooseDropdown(page, "Filter by action", "");
  await page.getByLabel("Search permissions").fill("reporting managers");
  await expect(table.locator(".access-action-tag")).toHaveText(["Update"]);
  await page.getByLabel("Search permissions").fill("no-such-permission");
  await expect(
    page.getByText("No records found.", { exact: true }),
  ).toBeVisible();
});

test("team and role catalogs show live organization summaries while filtering", async ({
  page,
  request,
}) => {
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  for (const [section, title, heading, labels] of [
    [
      "teams",
      "Teams",
      "Team Catalog",
      [
        ["Total Teams", "totalTeams"],
        ["Active Teams", "activeTeams"],
        ["Total Roles", "totalRoles"],
      ],
    ],
    [
      "roles",
      "Roles",
      "Role Catalog",
      [
        ["Total Roles", "totalRoles"],
        ["Active Roles", "activeRoles"],
        ["Assigned Permissions", "assignedBusinessActions"],
      ],
    ],
  ]) {
    const data = await (
      await request.get(`${api}/access-control/${section}`, { headers })
    ).json();
    await page.goto(`/org-admin/access-control/${section}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".app-sidenav")).toHaveCount(1);
    for (const [label, key] of labels)
      await expect(
        page
          .locator(".access-detail-stat")
          .filter({ has: page.getByText(label, { exact: true }) })
          .locator("strong"),
      ).toHaveText(String(data.summary[key]));
    await page
      .getByLabel(`Search ${section}`, { exact: true })
      .fill("no-such-catalog-record");
    await expect(
      page.getByText("No records found.", { exact: true }),
    ).toBeVisible();
    for (const [label, key] of labels)
      await expect(
        page
          .locator(".access-detail-stat")
          .filter({ has: page.getByText(label, { exact: true }) })
          .locator("strong"),
      ).toHaveText(String(data.summary[key]));
    await page.getByLabel(`Search ${section}`, { exact: true }).fill("");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /Unable|Failed/ }),
    ).toHaveCount(0);
  }
});

test("catalog references fit desktop, tablet and mobile with usable creation dialogs", async ({
  page,
}) => {
  for (const [device, width, height] of [
    ["desktop", 1920, 1080],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [section, title, newLabel] of [
      ["teams", "Teams", "New Team"],
      ["levels", "Levels", "New Level"],
      ["roles", "Roles", "New Role"],
    ]) {
      await page.goto(`/org-admin/access-control/${section}`);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(".access-table tbody tr").first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${device} ${section}`,
      ).toBeTruthy();
      await expect(
        page.getByRole("columnheader", { name: "Clusters", exact: true }),
      ).toHaveCount(0);
      if (width <= 980)
        expect(
          await page
            .locator(".access-detail-breadcrumb")
            .evaluate((el) => el.getBoundingClientRect().top),
          `${device} ${section} header position`,
        ).toBeLessThan(120);
      await page.screenshot({
        path: `/tmp/hrms-catalog-${section}-${device}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: newLabel, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("button", { name: "Close dialog", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `/tmp/hrms-catalog-${section}-dialog-${device}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  }
});

test("background user filtering preserves the selected row menu and focus", async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let held = false;
  await page.route("**/access-control/users?**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("search") ===
      fixture.memberEmail
    ) {
      held = true;
      await gate;
    }
    await route.continue();
  });
  try {
    await page.goto("/org-admin/access-control/users");
    const row = page
      .locator(".access-table tbody tr")
      .filter({ hasText: fixture.memberEmail });
    await expect(row).toBeVisible();
    await page
      .getByLabel("Search users", { exact: true })
      .fill(fixture.memberEmail);
    await row
      .getByRole("button", {
        name: `Actions for ${fixture.memberEmail}`,
        exact: true,
      })
      .click();
    await expect.poll(() => held).toBe(true);
    await expect(page.getByRole("menu")).toBeVisible();
    release();
    await expect(page.locator(".access-table")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator(".access-table tbody tr")).toHaveCount(1);
    await expect(page.getByRole("menu")).toBeVisible();
    await page
      .getByRole("menuitem", { name: "View Access", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  } finally {
    release();
  }
});
