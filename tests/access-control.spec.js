import { test, expect } from "@playwright/test";
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
    page.getByText("User Management", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidenav-coming-next")).toHaveCount(0);
  await expect(
    page
      .locator(".access-page")
      .getByRole("button", { name: /Add|Edit|Delete/ }),
  ).toHaveCount(0);
  await page.getByLabel("Filter by module").selectOption("Workflows");
  await expect(page.locator(".access-table tbody tr").first()).toContainText(
    "Workflows",
  );
  await page.getByLabel("Search permissions").fill("not-existing-catalog-key");
  await expect(
    page.getByText("No records found.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search permissions").fill("");
  await page.getByLabel("Filter by module").selectOption("");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
});
test("levels create, validate duplicates, reopen and deactivate", async ({
  page,
}) => {
  const number = 100000 + (Date.now() % 10000000);
  await page.goto("/org-admin/access-control/levels");
  await page.getByRole("button", { name: "Add Level", exact: true }).click();
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
  await page.getByRole("button", { name: "Add Level", exact: true }).click();
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
  await page.getByRole("button", { name: "Add Team", exact: true }).click();
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
  await page.getByRole("button", { name: "Add Team", exact: true }).click();
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
        return response.json();
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
  await nav
    .getByRole("link", { name: "Teams Management", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Teams Management", exact: true }),
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

test("permission action filters preserve catalog totals and expose complete restrictions", async ({
  page,
  request,
}) => {
  const response = await request.get(
    `${api}/access-control/permissions?pageSize=1`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  );
  const catalog = await response.json();
  await page.goto("/org-admin/access-control/permissions");
  await expect(
    page
      .locator(".access-detail-stat")
      .filter({ hasText: "Total permissions" })
      .locator("strong"),
  ).toHaveText(String(catalog.catalogTotal));
  await page.getByLabel("Filter by action").selectOption(catalog.actions[0]);
  const expected = await (
    await request.get(
      `${api}/access-control/permissions?action=${encodeURIComponent(catalog.actions[0])}`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } },
    )
  ).json();
  await expect(page.locator(".access-result-count")).toHaveText(
    `${expected.total} of ${catalog.catalogTotal} permissions`,
  );
  const actions = page.locator(".access-action-tag");
  await expect(actions).toHaveCount(expected.items.length);
  for (const action of await actions.allTextContents())
    expect(action).toBe(catalog.actions[0]);
  const description = page.locator(".access-permission-description").first();
  await description.locator("summary").click();
  await expect(description).toHaveAttribute("open", "");
  await expect(description.locator("div")).toContainText(
    expected.items[0].description,
  );
  await page.getByLabel("Search permissions").fill("no-such-permission");
  await expect(
    page.getByText("No records found.", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".access-detail-stat")
      .filter({ hasText: "Total permissions" })
      .locator("strong"),
  ).toHaveText(String(catalog.catalogTotal));
});
