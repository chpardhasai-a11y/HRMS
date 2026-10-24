import {
  BUSINESS_PERMISSION_GROUPS,
  ADMIN_PERMISSION_GROUPS,
  CATALOG_PERMISSION_GROUPS,
  businessActionCount,
} from "./business-permissions";
import { grantableKeys, scopedActor } from "./permission-context";
import { PERMISSIONS } from "./permissions.catalog";
import { RoleUserService } from "./role-user.service";

describe("business permission bundles", () => {
  const actions = BUSINESS_PERMISSION_GROUPS.flatMap((g) => g.actions);
  it("covers each assignable permission exactly once and excludes restricted operations", () => {
    const keys = actions.flatMap((a) => a.permissionKeys);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...grantableKeys()].sort());
    expect(new Set(actions.map((a) => a.id)).size).toBe(actions.length);
    expect(new Set(BUSINESS_PERMISSION_GROUPS.map((g) => g.id)).size).toBe(
      BUSINESS_PERMISSION_GROUPS.length,
    );
    for (const action of actions) {
      expect(action.permissionKeys.length).toBeGreaterThan(0);
      for (const key of action.permissionKeys)
        expect(PERMISSIONS.some((p) => p.key === key)).toBe(true);
    }
  });
  it("groups routine employee operations into CRUD and keeps approval decisions separate", () => {
    const group = BUSINESS_PERMISSION_GROUPS.find((g) => g.id === "employees")!;
    expect(
      group.actions.find((a) => a.kind === "read")!.permissionKeys,
    ).toEqual([
      "employees.findAll",
      "employees.findOne",
      "employees.audit",
      "employees.getOnboardingQueue",
    ]);
    expect(
      group.actions.find((a) => a.kind === "edit")!.permissionKeys,
    ).toEqual([
      "employees.update",
      "employees.recordDocument",
      "employees.updateManager",
      "employees.updateOnboardingStage",
      "employees.transfer",
      "employees.updateStatus",
      "employees.resendInvite",
    ]);
    for (const group of BUSINESS_PERMISSION_GROUPS) {
      const edit = group.actions.find((a) => a.kind === "edit");
      expect(edit?.permissionKeys || []).not.toEqual(
        expect.arrayContaining(["approvals.approve"]),
      );
      expect(edit?.permissionKeys || []).not.toContain("workflows.publish");
    }
  });
  it("uses one workflow module, CRUD for routine actions and meaningful descriptions", () => {
    expect(
      BUSINESS_PERMISSION_GROUPS.filter((g) => g.id.startsWith("workflow")),
    ).toHaveLength(1);
    const special = actions
      .filter((a) => a.kind === "special")
      .map((a) => a.label);
    expect(special).toEqual([
      "Approve",
      "Reject",
      "Publish",
      "Start",
      "Act on task",
    ]);
    for (const group of BUSINESS_PERMISSION_GROUPS) {
      expect(["People Operations", "Master Catalog", "Workflows"]).toContain(
        group.section,
      );
      expect(group.description.length).toBeGreaterThan(25);
      for (const a of group.actions)
        expect(a.description.length).toBeGreaterThan(25);
    }
    expect(
      BUSINESS_PERMISSION_GROUPS.find((g) => g.id === "employees")!.actions.map(
        (a) => a.label,
      ),
    ).toEqual(["Create", "Read", "Update", "Delete"]);
    for (const g of BUSINESS_PERMISSION_GROUPS.filter((g) =>
      g.id.startsWith("org-masters."),
    )) {
      expect(g.actions.map((a) => a.label)).toEqual([
        "Create",
        "Read",
        "Update",
        "Delete",
      ]);
      expect(
        g.actions.find((a) => a.kind === "edit")!.permissionKeys,
      ).toContain(`${g.id}.toggleStatus`);
    }
  });
  it("counts partially granted business actions without expanding grants", () => {
    const keys = ["employees.findAll", "employees.update"];
    expect(businessActionCount(keys)).toBe(2);
    expect(
      businessActionCount(["employees.findAll", "employees.findOne"]),
    ).toBe(1);
    expect(keys).toEqual(["employees.findAll", "employees.update"]);
    const actor = {
      sub: "u",
      companyId: "c",
      email: "u@example.test",
      role: "employee",
      permissions: keys,
    };
    expect(scopedActor(actor, "employees.findAll").delegatedAccess).toBe(true);
    expect(scopedActor(actor, "employees.findOne").delegatedAccess).toBe(false);
  });
  it("displays every Access Control operation exactly once without delegating administrator access", () => {
    const adminKeys = ADMIN_PERMISSION_GROUPS.flatMap((g) =>
      g.actions.flatMap((a) => a.permissionKeys),
    );
    expect([...adminKeys].sort()).toEqual(
      PERMISSIONS.filter((p) => p.module === "Access Control")
        .map((p) => p.key)
        .sort(),
    );
    expect(new Set(adminKeys).size).toBe(adminKeys.length);
    expect(ADMIN_PERMISSION_GROUPS.map((g) => g.label)).toEqual([
      "Users",
      "Roles",
      "Levels",
      "Teams",
      "Permissions",
    ]);
    for (const group of ADMIN_PERMISSION_GROUPS) {
      expect(group.section).toBe("Access Control");
      expect(group.assignable).toBe(false);
    }
    const allowed = grantableKeys();
    expect(adminKeys.some((key) => allowed.has(key))).toBe(false);
  });
  it("adds groups to options without removing existing interfaces", async () => {
    const service = new RoleUserService({
      accessLevel: { findMany: async () => [] },
    } as any);
    const result = await service.roleOptions({ companyId: "c" } as any);
    expect(result.businessGroups).toEqual(BUSINESS_PERMISSION_GROUPS);
    expect(result.catalogGroups).toEqual(CATALOG_PERMISSION_GROUPS);
    expect(result.levels).toEqual([]);
    expect(result.permissions).toHaveLength(PERMISSIONS.length);
    expect(
      result.permissions
        .filter((p) => p.assignable)
        .map((p) => p.key)
        .sort(),
    ).toEqual([...grantableKeys()].sort());
  });
});
