import { PERMISSIONS } from "./permissions.catalog";
import { RequestUser } from "../common/decorators/current-user.decorator";

// Grants extend employee capabilities. Platform and Access Control administration
// remain available only to their built-in administrator account types.
export function delegablePermission(p: (typeof PERMISSIONS)[number]) {
  return (
    p.status === "Available" &&
    p.scope === "Organization" &&
    ![
      "Access Control",
      "Authentication",
      "Organizations",
      "Reference Lookups",
      "Organization Masters · Teams",
    ].includes(p.module)
  );
}
export const grantableKeys = () =>
  new Set(PERMISSIONS.filter(delegablePermission).map((p) => p.key));
export function scopedActor(user: RequestUser, key: string): RequestUser {
  return {
    ...user,
    permissionKey: key,
    delegatedAccess:
      user.role === "employee" &&
      grantableKeys().has(key) &&
      !!user.permissions?.includes(key),
  };
}
export function permissionKeysFromRoles(memberships: any[]): string[] {
  const allowed = grantableKeys();
  return [
    ...new Set<string>(
      memberships
        .filter((m) => m.role.isActive)
        .flatMap((m) => m.role.permissionKeys as string[]),
    ),
  ]
    .filter((k) => allowed.has(k))
    .sort();
}
