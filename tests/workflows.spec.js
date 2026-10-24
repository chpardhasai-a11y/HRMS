import { test, expect } from "@playwright/test";
test.describe.configure({ mode: "serial" });
const api = process.env.WORKFLOW_TEST_API || "http://localhost:4100";
const email = process.env.WORKFLOW_QA_EMAIL;
if (!email)
  throw new Error(
    "Set WORKFLOW_QA_EMAIL to the isolated integration fixture account",
  );
let session,
  workflowName = `Browser approval ${Date.now()}`,
  definitionId,
  instanceId;
test.beforeAll(async ({ request }) => {
  const response = await request.post(`${api}/auth/login`, {
    data: { email, password: "Workflow-QA-2026!" },
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
test("create, edit, publish and test a workflow through the visual builder", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/org-admin/workflows");
  await expect(
    page.getByRole("heading", { name: "Workflows", exact: true }),
  ).toBeVisible();
  await page
    .locator(".flow-page-heading")
    .getByRole("button", { name: "Create workflow", exact: true })
    .click();
  await page.getByLabel("Workflow name", { exact: true }).fill(workflowName);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create workflow" })
    .click();
  await expect(page).toHaveURL(/builder\?id=/);
  definitionId = new URL(page.url()).searchParams.get("id");
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".app-sidenav")).toHaveCount(1);
  await expect(page.getByText("Flow Studio", { exact: true })).toHaveCount(0);
  await expect(page.locator(".flow-node")).toHaveCount(5);
  await page.getByRole("button", { name: "Lifecycle", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "States, Actions & Transitions",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle configuration" }).click();
  await page.getByRole("button", { name: "Auto layout" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("published");
  await page.screenshot({
    path: "/tmp/workflow-builder-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Test", exact: true }).click();
  await page.getByLabel("Summary *", { exact: true }).fill("Browser execution");
  await page.getByRole("button", { name: "Run test" }).click();
  await expect(page).toHaveURL(/monitoring\?instance=/);
  instanceId = new URL(page.url()).searchParams.get("instance");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("assigned reviewer completes the task through Task Inbox", async ({
  browser,
  request,
}) => {
  expect(instanceId).toBeTruthy();
  const reviewer = email.replace("admin-", "reviewer-");
  const response = await request.post(`${api}/auth/login`, {
    data: { email: reviewer, password: "Workflow-QA-2026!" },
  });
  expect(response.ok()).toBeTruthy();
  const s = await response.json(),
    context = await browser.newContext();
  await context.addInitScript((s) => {
    localStorage.setItem("hrms_token", s.accessToken);
    localStorage.setItem("hrms_user", JSON.stringify(s.user));
  }, s);
  const page = await context.newPage();
  await page.goto(
    `${process.env.WORKFLOW_UI_URL || "http://localhost:3010"}/org-admin/workflows/tasks`,
  );
  const row = page.getByRole("row").filter({ hasText: workflowName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Open", exact: true }).click();
  await page
    .getByLabel("Comment", { exact: true })
    .fill("Reviewed from the browser");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const detail = await request.get(`${api}/workflows/instances/${instanceId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  expect((await detail.json()).status).toBe("COMPLETED");
  await context.close();
});
test("desktop, tablet and mobile pages fit the viewport and navigation works", async ({
  page,
}) => {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/org-admin/workflows");
    await expect(
      page.getByRole("heading", { name: "Workflows", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".flow-card").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/tmp/workflow-dashboard-${name}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("navigation", { name: "Workflow sections" })
    .getByRole("link", { name: "Templates" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Workflow Templates" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/workflow-templates-mobile.png",
    fullPage: true,
  });
  await page.goto(`/org-admin/workflows/builder?id=${definitionId}`);
  await expect(page.locator(".flow-step-row")).toHaveCount(5);
  await page.getByRole("button", { name: "Open building blocks" }).click();
  await expect(
    page.getByRole("heading", { name: "Building blocks", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Time, Events & Exceptions" }).click();
  await expect(
    page.getByRole("heading", { name: "Time, Events & Exceptions" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/workflow-builder-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("private uploads enforce access and webhook deliveries authenticate and deduplicate", async ({
  request,
}) => {
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const templateResponse = await request.get(`${api}/workflows/templates`, {
    headers,
  });
  const document = (await templateResponse.json())[0].document;
  document.nodes[0].config = { event: "manual" };
  document.fields.push({
    id: "evidence",
    label: "Evidence",
    type: "file",
    required: true,
    readRoles: ["org_admin"],
  });
  const created = await request.post(`${api}/workflows`, {
    headers,
    data: { name: "Private upload test", document },
  });
  expect(created.ok()).toBeTruthy();
  const def = await created.json();
  expect(
    (
      await request.post(`${api}/workflows/${def.id}/publish`, {
        headers,
        data: { revision: def.revision },
      })
    ).ok(),
  ).toBeTruthy();
  const uploaded = await request.post(`${api}/workflows/attachments`, {
    headers,
    multipart: {
      file: {
        name: "review.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nsynthetic QA evidence"),
      },
    },
  });
  expect(uploaded.ok()).toBeTruthy();
  const file = await uploaded.json();
  const started = await request.post(`${api}/workflows/${def.id}/start`, {
    headers,
    data: {
      key: `upload-${Date.now()}`,
      data: { summary: "Private upload", evidence: [file.id] },
    },
  });
  expect(started.ok()).toBeTruthy();
  expect(
    (
      await request.get(`${api}/workflows/attachments/${file.id}`, { headers })
    ).status(),
  ).toBe(200);
  const outsider = await request.post(`${api}/auth/login`, {
    data: {
      email: email.replace("admin-", "outsider-"),
      password: "Workflow-QA-2026!",
    },
  });
  const other = await outsider.json();
  expect(
    (
      await request.get(`${api}/workflows/attachments/${file.id}`, {
        headers: { Authorization: `Bearer ${other.accessToken}` },
      })
    ).status(),
  ).toBe(403);
  const invalidFile = await request.post(`${api}/workflows/attachments`, {
    headers,
    multipart: {
      file: {
        name: "not-allowed.exe",
        mimeType: "application/x-msdownload",
        buffer: Buffer.from("synthetic"),
      },
    },
  });
  expect(invalidFile.status()).toBe(400);
  const oversized = await request.post(`${api}/workflows/attachments`, {
    headers,
    multipart: {
      file: {
        name: "too-large.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
      },
    },
  });
  expect(oversized.status()).toBe(413);
  document.nodes[0].config = { event: "webhook" };
  document.fields = document.fields.filter((f) => f.id !== "evidence");
  const hookDef = await (
    await request.post(`${api}/workflows`, {
      headers,
      data: { name: "Signed webhook", document },
    })
  ).json();
  await request.post(`${api}/workflows/${hookDef.id}/publish`, {
    headers,
    data: { revision: hookDef.revision },
  });
  const { createHmac } = await import("node:crypto"),
    timestamp = String(Date.now()),
    event = `browser-${Date.now()}`,
    body = { summary: "Webhook request" },
    signature = createHmac("sha256", "workflow-browser-test-secret")
      .update(`${timestamp}.${hookDef.id}.${event}.${JSON.stringify(body)}`)
      .digest("hex"),
    hookHeaders = {
      "x-workflow-timestamp": timestamp,
      "x-workflow-event": event,
      "x-workflow-signature": signature,
    };
  const first = await request.post(`${api}/workflow-webhooks/${hookDef.id}`, {
    headers: hookHeaders,
    data: body,
  });
  expect(first.status()).toBe(201);
  const firstBody = await first.json();
  const replay = await request.post(`${api}/workflow-webhooks/${hookDef.id}`, {
    headers: hookHeaders,
    data: body,
  });
  expect((await replay.json()).id).toBe(firstBody.id);
  expect(
    (
      await request.post(`${api}/workflow-webhooks/${hookDef.id}`, {
        headers: { ...hookHeaders, "x-workflow-signature": "0".repeat(64) },
        data: body,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`${api}/workflow-webhooks/${hookDef.id}`, {
        headers: { ...hookHeaders, "x-workflow-timestamp": "1" },
        data: body,
      })
    ).status(),
  ).toBe(403);
});

test("a participant submits a shareable form and can view their execution", async ({
  browser,
  request,
}) => {
  const response = await request.post(`${api}/auth/login`, {
    data: {
      email: email.replace("admin-", "requester-"),
      password: "Workflow-QA-2026!",
    },
  });
  expect(response.ok()).toBeTruthy();
  const participant = await response.json(),
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
  await context.addInitScript((s) => {
    localStorage.setItem("hrms_token", s.accessToken);
    localStorage.setItem("hrms_user", JSON.stringify(s.user));
  }, participant);
  const page = await context.newPage();
  await page.goto(
    `${process.env.WORKFLOW_UI_URL || "http://localhost:3010"}/org-admin/workflows/forms/${definitionId}`,
  );
  await expect(
    page.getByRole("heading", { name: workflowName, exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Summary *", { exact: true })
    .fill("A request from a participant");
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Request submitted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View execution" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Execution timeline" }),
  ).toBeVisible();
  await context.close();
});

test("purchase template renders every named branch and supports undo/redo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/org-admin/workflows/templates");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Purchase approval",
      exact: true,
    }),
  });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Use template" }).click();
  await expect(page).toHaveURL(/builder\?id=/);
  await expect(page.locator(".flow-node")).toHaveCount(9);
  await expect(page.locator(".react-flow__edge")).toHaveCount(13);
  await page.getByRole("button", { name: "Delay", exact: true }).click();
  await expect(page.locator(".flow-node")).toHaveCount(10);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".flow-node")).toHaveCount(9);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".flow-node")).toHaveCount(10);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Auto layout" }).click();
  await page.screenshot({
    path: "/tmp/workflow-purchase-builder-desktop.png",
    fullPage: true,
  });
});
