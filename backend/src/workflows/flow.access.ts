import { ForbiddenException } from "@nestjs/common";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { FlowDocument } from "./flow.types";
export const isAdmin = (u: RequestUser) =>
  ["org_admin", "platform_admin"].includes(u.role) || !!u.delegatedAccess;
export function policyAccess(
  doc: FlowDocument,
  user: RequestUser,
  permission: "authors" | "publishers" | "operators" | "starters" | "viewers",
) {
  const allowed = doc.policies[permission];
  if (allowed?.length)
    return allowed.includes(user.sub) || allowed.includes(user.role);
  return permission === "starters" || permission === "viewers"
    ? true
    : isAdmin(user);
}
export function requirePolicy(
  doc: FlowDocument,
  user: RequestUser,
  permission: Parameters<typeof policyAccess>[2],
) {
  if (!policyAccess(doc, user, permission))
    throw new ForbiddenException("Workflow permission denied");
}
export async function lock(tx: any, key: string) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${key}))`;
}
