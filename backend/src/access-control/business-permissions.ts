export type BusinessAction = {
  id: string;
  label: string;
  description: string;
  kind: "create" | "read" | "edit" | "delete" | "special";
  permissionKeys: string[];
};
export type BusinessPermissionGroup = {
  section: string;
  assignable?: boolean;
  id: string;
  label: string;
  description: string;
  actions: BusinessAction[];
};
import definitions = require("./permission-groups.json");
import adminDefinitions = require("./admin-permission-groups.json");

// Shared with the frontend so older API responses can use the same definitions.
export const BUSINESS_PERMISSION_GROUPS =
  definitions as BusinessPermissionGroup[];

// Administrator-only entries are visible in the catalog, never role grants.
export const ADMIN_PERMISSION_GROUPS =
  adminDefinitions as BusinessPermissionGroup[];
export const CATALOG_PERMISSION_GROUPS = [
  ...BUSINESS_PERMISSION_GROUPS,
  ...ADMIN_PERMISSION_GROUPS,
];

export function businessActionCount(keys: readonly string[]): number {
  const selected = new Set(keys);
  return BUSINESS_PERMISSION_GROUPS.reduce(
    (count, group) =>
      count +
      group.actions.filter((a) =>
        a.permissionKeys.some((key) => selected.has(key)),
      ).length,
    0,
  );
}
