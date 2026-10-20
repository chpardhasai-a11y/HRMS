import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { chooseDropdown } from "./helpers/dropdown";
const fixture = JSON.parse(
  readFileSync("/tmp/hrms-access-qa-fixture.json", "utf8"),
);
const api = process.env.WORKFLOW_TEST_API || "http://localhost:4112";
let session;
test.beforeAll(async ({ request }) => {
  const response = await request.post(`${api}/auth/login`, {
    data: { email: fixture.email, password: fixture.password },
  });
  expect(response.ok()).toBeTruthy();
  session = await response.json();
});
test.beforeEach(async ({ context }) => {
  await context.addInitScript((s) => {
    localStorage.setItem("hrms_token", s.accessToken);
    localStorage.setItem("hrms_user", JSON.stringify(s.user));
    localStorage.setItem("hrms_active_company_id", s.user.companyId);
  }, session);
});

test("all five modules use the shared searchable dropdowns", async ({
  page,
}) => {
  for (const [section, label] of [
    ["users", "Filter users by role"],
    ["roles", "Filter by status"],
    ["levels", "Filter by status"],
    ["teams", "Filter by status"],
    ["permissions", "Filter by module"],
  ]) {
    await page.goto(`/org-admin/access-control/${section}`);
    await expect(page.locator(".access-page select")).toHaveCount(0);
    const trigger = page.getByRole("button", { name: label, exact: true });
    await expect(trigger).toHaveClass("dropdown-select-trigger");
    await trigger.click();
    const menu = page.getByRole("listbox", { name: label, exact: true });
    await expect(menu).toBeVisible();
    const search = menu.getByRole("textbox", {
      name: `Search ${label}`,
      exact: true,
    });
    await expect(search).toBeFocused();
    await search.fill("no matching dropdown option");
    await expect(
      menu.getByText("No matching options", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    if (section !== "users" && section !== "permissions") {
      await trigger.click();
      await page
        .getByRole("listbox", { name: label, exact: true })
        .getByRole("textbox")
        .fill("Inactive");
      await page.keyboard.press("Enter");
      await expect(trigger).toContainText("Inactive");
    }
  }
});

test("dialog dropdowns support keyboard selection, validation, Escape and Tab", async ({
  page,
  request,
}) => {
  const options = await (
    await request.get(`${api}/access-control/roles/options`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
  ).json();
  const level = options.levels.find((l) => l.isActive);
  expect(level).toBeTruthy();
  await page.goto("/org-admin/access-control/roles");
  await page.getByRole("button", { name: "New Role", exact: true }).click();
  await page
    .getByLabel("Role name", { exact: true })
    .fill("Dropdown validation example");
  await page.getByRole("button", { name: "Save Role", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Select a level",
  );
  const trigger = page.getByRole("button", { name: "Level", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("listbox", { name: "Level", exact: true });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu
    .getByRole("textbox")
    .fill(
      `L${level.number}${level.displayName ? ` · ${level.displayName}` : ""}`,
    );
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText(`L${level.number}`);
  await trigger.click();
  await page.keyboard.press("Tab");
  await expect(menu).toHaveCount(0);
  await expect(page.getByLabel("Description", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("dropdowns stay inside the viewport and remain visible above dialog boundaries", async ({
  page,
}) => {
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [section, create, label] of [
      ["teams", "New Team", "Department"],
      ["roles", "New Role", "Permission module"],
      ["users", "Add User", "Account type"],
    ]) {
      await page.goto(`/org-admin/access-control/${section}`);
      await page.getByRole("button", { name: create, exact: true }).click();
      await page.getByRole("button", { name: label, exact: true }).click();
      const menu = page.getByRole("listbox", { name: label, exact: true });
      await expect(menu).toBeVisible();
      const box = await menu.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      expect(await menu.evaluate((el) => !!el.closest(".access-dialog"))).toBe(
        false,
      );
      expect(
        await menu.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(
              r.x + r.width / 2,
              r.y + Math.min(r.height / 2, 40),
            ),
          );
        }),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/hrms-dropdown-${section}-${device}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
    }
  }
});

test("team department selection and self-account restrictions are preserved", async ({
  page,
}) => {
  await page.goto("/org-admin/access-control/teams");
  await page.getByRole("button", { name: "New Team", exact: true }).click();
  await chooseDropdown(page, "Department", "");
  await expect(
    page.getByRole("button", { name: "Department", exact: true }),
  ).toContainText("No department");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.goto("/org-admin/access-control/users");
  await page.getByLabel("Search users", { exact: true }).fill(fixture.email);
  await page
    .locator(".access-table tbody tr")
    .filter({ hasText: fixture.email })
    .getByRole("button", { name: "Edit User", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Account type", exact: true }),
  ).toBeDisabled();
});

test("the existing HRMS dropdown continues to work without portal placement", async ({
  page,
}) => {
  await page.goto("/org-admin");
  const filters = page.getByLabel("Employee filters");
  const trigger = filters.getByRole("button", { name: "Status", exact: true });
  await trigger.click();
  const menu = page.getByRole("listbox", { name: "Status", exact: true });
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((el) => !!el.closest(".dropdown-select"))).toBe(
    true,
  );
  await menu
    .getByRole("textbox", { name: "Search Status", exact: true })
    .fill("Active");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText("Active");
});

test("keyboard navigation reveals the active option in long dropdowns", async ({
  page,
}) => {
  await page.goto("/org-admin/access-control/permissions");
  await page
    .getByRole("button", { name: "Filter by action", exact: true })
    .click();
  const menu = page.getByRole("listbox", {
    name: "Filter by action",
    exact: true,
  });
  await page.keyboard.press("End");
  const active = menu.locator(".dropdown-select-option.active");
  const box = await active.boundingBox(),
    container = await menu.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(container.y);
  expect(box.y + box.height).toBeLessThanOrEqual(
    container.y + container.height,
  );
  await page.keyboard.press("Home");
  const first = await menu
    .locator(".dropdown-select-option.active")
    .boundingBox();
  const search = await menu.locator(".dropdown-select-search").boundingBox();
  expect(first.y).toBeGreaterThanOrEqual(search.y + search.height);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Filter by action", exact: true }),
  ).toContainText("All actions");
});
