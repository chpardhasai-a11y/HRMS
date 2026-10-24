import definitions from "../../../backend/src/access-control/permission-groups.json";

import adminDefinitions from "../../../backend/src/access-control/admin-permission-groups.json";

export function catalogPermissionGroups(catalog) {
  if (!catalog) return [];
  if (Array.isArray(catalog.catalogGroups)) return catalog.catalogGroups;
  // Display restricted catalog entries without making them assignable in roles.
  const known = new Set((catalog.permissions || []).map((p) => p.key));
  const admin = adminDefinitions
    .map((group) => ({
      ...group,
      actions: group.actions
        .map((action) => ({
          ...action,
          permissionKeys: action.permissionKeys.filter((key) => known.has(key)),
        }))
        .filter((action) => action.permissionKeys.length),
    }))
    .filter((group) => group.actions.length);
  return [...permissionGroups(catalog), ...admin];
}

export function permissionGroups(catalog) {
  if (Array.isArray(catalog?.businessGroups))
    return catalog.businessGroups.map((group) => ({
      ...group,
      section:
        group.section ||
        definitions.find((entry) => entry.id === group.id)?.section ||
        "Other",
    }));
  if (!Array.isArray(catalog?.permissions)) return [];
  // Only offer grants explicitly allowed by the connected API. Never turn a
  // missing definition into broader access or send keys an older API rejects.
  const allowed = new Set(
    catalog.permissions.filter((p) => p.assignable).map((p) => p.key),
  );
  return definitions
    .map((group) => ({
      ...group,
      actions: group.actions
        .map((action) => ({
          ...action,
          permissionKeys: action.permissionKeys.filter((key) =>
            allowed.has(key),
          ),
        }))
        .filter((action) => action.permissionKeys.length),
    }))
    .filter((group) => group.actions.length);
}
export function rolePermissionCount(role) {
  return Number.isFinite(role.businessActionCount)
    ? role.businessActionCount
    : countBusinessActions(definitions, role.permissionKeys || []);
}

export const CRED = ["create", "read", "edit", "delete"];
export function selectionState(action, keys) {
  const count = action.permissionKeys.filter((key) =>
    keys.includes(key),
  ).length;
  return count === 0
    ? "none"
    : count === action.permissionKeys.length
      ? "all"
      : "partial";
}
export function toggleAction(keys, action, checked) {
  return checked
    ? [...new Set([...keys, ...action.permissionKeys])]
    : keys.filter((key) => !action.permissionKeys.includes(key));
}
export function countBusinessActions(groups = [], keys = []) {
  return groups.reduce(
    (count, group) =>
      count +
      group.actions.filter((action) => selectionState(action, keys) !== "none")
        .length,
    0,
  );
}
export function filterBusinessGroups(groups, search, area = "") {
  const query = search.trim().toLowerCase();
  return groups
    .filter((group) => !area || group.id === area)
    .map((group) => ({
      ...group,
      actions: group.actions.filter(
        (action) =>
          !query ||
          `${group.section} ${group.label} ${group.description} ${action.id} ${action.label} ${action.description} ${action.permissionKeys.join(" ")}`
            .toLowerCase()
            .includes(query),
      ),
    }))
    .filter((group) => group.actions.length);
}
