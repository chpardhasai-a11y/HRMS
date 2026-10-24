import { test, expect } from "@playwright/test";
import { chooseDropdown } from "./helpers/dropdown";
import { readFileSync } from "node:fs";
const groups = JSON.parse(
  readFileSync(
    new URL(
      "../backend/src/access-control/permission-groups.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const user = {
  sub: "compat-admin",
  email: "compat@example.test",
  role: "org_admin",
  companyId: "compat-company",
};
const level = { id: "level", number: 1, isActive: true };
const permissions = groups
  .flatMap((g) =>
    g.actions.flatMap((a) =>
      a.permissionKeys.map((key) => ({ key, name: key, assignable: true })),
    ),
  )
  .filter((p) => p.key !== "workflows.remove");
const adminGroups = JSON.parse(
  readFileSync(
    new URL(
      "../backend/src/access-control/admin-permission-groups.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const adminPermissions = adminGroups.flatMap((g) =>
  g.actions.flatMap((a) =>
    a.permissionKeys.map((key) => ({ key, name: key, assignable: false })),
  ),
);
const original = ["org-masters.departments.findAll"];
let saved;

test.beforeEach(async ({ page }) => {
  saved = null;
  await page.addInitScript((user) => {
    localStorage.setItem("hrms_token", "compat-test-token");
    localStorage.setItem("hrms_user", JSON.stringify(user));
  }, user);
  await page.route("http://localhost:4000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const role = {
      id: "role",
      name: "Legacy role",
      description: "",
      levelId: level.id,
      level,
      isActive: true,
      revision: 1,
      permissionKeys: original,
    };
    let body;
    if (path === "/auth/me") body = user;
    else if (path === "/access-control/roles/options")
      body = {
        levels: [level],
        permissions: [...permissions, ...adminPermissions],
      };
    else if (path === "/access-control/permissions")
      body = { items: [], total: 208 };
    else if (path === "/access-control/roles/role") {
      if (route.request().method() === "PATCH")
        saved = route.request().postDataJSON();
      body = role;
    } else if (path === "/access-control/roles")
      body = {
        items: [role],
        total: 1,
        summary: { totalRoles: 1, activeRoles: 1, assignedPermissions: 1 },
      };
    else if (path.startsWith("/access-control/"))
      body = { items: [], total: 2 };
    else return route.abort();
    await route.fulfill({ json: body });
  });
});

test("overview survives missing grouped metadata and missing role counts", async ({
  page,
}) => {
  await page.goto("/org-admin/access-control");
  const summary = page.getByRole("region", { name: "Access Control summary" });
  await expect(summary).toHaveAttribute("aria-busy", "false");
  await expect(summary.locator("strong")).toHaveText([
    "2",
    "1",
    "2",
    "2",
    "81",
    "1",
  ]);
  await expect(
    page.getByRole("link", { name: "Open Permissions", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".access-page").getByRole("alert")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("NaN");
});

test("older options still show CRUD and preserve exact partial grants on save", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
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
  await expect(
    table.getByRole("columnheader", { name: "Resource", exact: true }),
  ).toHaveCount(0);
  await chooseDropdown(page, "Filter by section", "Master Catalog");
  await expect(table.locator("tbody tr")).toHaveCount(52);
  await expect(
    table.locator("tbody tr").first().locator("td").nth(2),
  ).toHaveText("Master Catalog");
  await chooseDropdown(page, "Filter by module", "org-masters.departments");
  await chooseDropdown(page, "Filter by action", "Read");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator(".access-module-tag")).toHaveText(["Departments"]);
  await chooseDropdown(page, "Filter by section", "Workflows");
  await expect(table.locator(".access-module-tag")).toHaveText(["Workflows"]);
  await chooseDropdown(page, "Filter by section", "");
  await chooseDropdown(page, "Filter by action", "");
  const firstRow = table.locator("tbody tr").first();
  await expect(firstRow.locator("td")).toHaveCount(6);
  await expect(firstRow.locator("td").nth(0)).toHaveText("employees.create");
  await expect(firstRow.locator("code")).toHaveText("employees.create");
  await expect(firstRow.locator(".access-module-tag")).toHaveText("Employees");
  await expect(firstRow).toContainText("Employee records, onboarding");
  await page
    .getByLabel("Search permissions", { exact: true })
    .fill("employees.read");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator(".access-action-tag")).toHaveText(["Read"]);
  await page.getByLabel("Search permissions", { exact: true }).fill("");
  await table.locator("..").evaluate((el) => {
    el.scrollLeft = 0;
  });
  await page.getByRole("heading", { name: "Permissions", exact: true }).click();
  expect(
    await table.locator("tbody td:last-child p").evaluateAll((paragraphs) =>
      paragraphs.every((p) => {
        const cell = p.closest("td").getBoundingClientRect();
        const text = p.getBoundingClientRect();
        return (
          text.left >= cell.left &&
          text.right <= cell.right + 1 &&
          p.scrollWidth <= p.clientWidth + 1 &&
          getComputedStyle(p).whiteSpace === "normal"
        );
      }),
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/hrms-permissions-reference.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    await table.locator("..").evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(table).toContainText("Employee records, onboarding");
  await expect(table).toContainText("Update");
  await expect(table).not.toContainText("Delete workflow definitions");
  await expect(table).not.toContainText("access-control.createUser");
  await page.goto("/org-admin/access-control/roles");
  await expect(page.locator(".access-records tbody")).toContainText(
    "1 permissions",
  );
  await page.getByRole("button", { name: "Edit Role", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Departments: Read", exact: true }),
  ).toHaveAttribute("aria-checked", "mixed");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Unrelated change");
  await page.getByRole("button", { name: "Save Role", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(saved.permissionKeys).toEqual(original);
});

test("section filter works when the API has grouped permissions without section metadata", async ({
  page,
}) => {
  await page.route(
    "http://localhost:4000/access-control/roles/options",
    (route) =>
      route.fulfill({
        json: {
          permissions,
          levels: [level],
          businessGroups: groups.map(({ section, ...group }) => group),
        },
      }),
  );
  await page.goto("/org-admin/access-control/permissions");
  await chooseDropdown(page, "Filter by section", "People Operations");
  const table = page.getByRole("table", { name: "Permissions", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(8);
  await expect(table).not.toContainText("Workflows");
  await expect(
    table.locator("tbody tr").first().locator("td").nth(2),
  ).toHaveText("People Operations");
});

test("Access Control catalog includes all five modules without offering administrator grants in roles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/org-admin/access-control/permissions");
  await chooseDropdown(page, "Filter by section", "Access Control");
  const table = page.getByRole("table", { name: "Permissions", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(15);
  for (const group of adminGroups) {
    await chooseDropdown(page, "Filter by module", group.id);
    await expect(table.locator(".access-action-tag")).toHaveText(
      group.actions.map((a) => a.label),
    );
    await expect(table.locator(".access-admin-only")).toHaveCount(
      group.actions.length,
    );
    await expect(table).toContainText(group.description);
  }
  await chooseDropdown(page, "Filter by module", "");
  await page.screenshot({ path: "/tmp/hrms-access-control-permissions.png" });
  await page.goto("/org-admin/access-control/roles");
  await page.getByRole("button", { name: "New Role", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("checkbox", {
        name: /^(Users|Roles|Levels|Teams|Permissions):/,
      }),
  ).toHaveCount(0);
});
