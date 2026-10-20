import { join } from "path";
import { PERMISSIONS } from "./permissions.catalog";
import { AccessControlService } from "./access-control.service";
const { discoverRoutes } = require("../../scripts/permission-routes.cjs");
describe("read-only permission catalog", () => {
  it("covers every business API route exactly once and keeps keys unique", () => {
    expect(new Set(PERMISSIONS.map((p) => p.key)).size).toBe(
      PERMISSIONS.length,
    );
    const endpoints = PERMISSIONS.filter((p) => p.status === "Available")
      .map((p) => p.endpoint)
      .sort();
    const actual = discoverRoutes(join(__dirname, ".."))
      .map((r: any) => `${r.method} ${r.endpoint}`)
      .sort();
    expect(endpoints).toEqual(actual);
    for (const route of discoverRoutes(join(__dirname, ".."))) {
      expect(
        PERMISSIONS.find(
          (p) => p.endpoint === `${route.method} ${route.endpoint}`,
        )?.roles,
      ).toEqual(route.roles);
    }

    expect(
      endpoints.filter((e) => e?.includes("/access-control/permissions")),
    ).toEqual(["GET /access-control/permissions"]);
  });
  it("supports module filtering, search and stable pagination", () => {
    const service = new AccessControlService({} as any);
    const q = { page: 1, pageSize: 2 };
    const first = service.permissions(q),
      second = service.permissions({ ...q, page: 2 });
    expect(first.items).toHaveLength(2);
    expect(
      first.items
        .map((p) => p.key)
        .some((k) => second.items.some((p) => p.key === k)),
    ).toBe(false);
    expect(
      service
        .permissions({ ...q, module: "Workflows", search: "ownership" })
        .items.every((p) => p.module === "Workflows"),
    ).toBe(true);
    expect(
      service.permissions({ ...q, search: "not-a-real-permission-key" }).total,
    ).toBe(0);
    expect(PERMISSIONS.some((p) => p.scope === "Platform")).toBe(true);
    expect(
      PERMISSIONS.filter((p) => p.status === "Planned").every(
        (p) => p.endpoint === null,
      ),
    ).toBe(true);
  });
  it("filters actions across pages and returns unfiltered catalog statistics", () => {
    const service = new AccessControlService({} as any);
    const action = PERMISSIONS[0].action;
    const result = service.permissions({ page: 1, pageSize: 1, action });
    expect(result.total).toBe(
      PERMISSIONS.filter((p) => p.action === action).length,
    );
    expect(result.items.every((p) => p.action === action)).toBe(true);
    expect(result.catalogTotal).toBe(PERMISSIONS.length);
    expect(result.actions.length).toBe(
      new Set(PERMISSIONS.map((p) => p.action)).size,
    );
    const module = PERMISSIONS[0].module;
    expect(
      service
        .permissions({ page: 1, pageSize: 100, module, action })
        .items.every((p) => p.action === action && p.module === module),
    ).toBe(true);
  });
});
