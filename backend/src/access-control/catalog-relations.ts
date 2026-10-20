import { Prisma } from "@prisma/client";

type CatalogDb = Pick<
  Prisma.TransactionClient,
  "accessUserRole" | "flowMembership" | "team"
>;
type TeamLabel = { id: string; name: string; isActive: boolean };

// Membership-derived reporting only; these associations do not scope permissions.
export async function roleRelationships(
  db: CatalogDb,
  companyId: string,
  roleIds: string[],
) {
  const result = new Map<
    string,
    { teams: TeamLabel[]; activeUserIds: string[] }
  >();
  if (!roleIds.length) return result;
  const assignments = await db.accessUserRole.findMany({
    where: {
      companyId,
      roleId: { in: roleIds },
      role: { companyId },
      user: { companyId, role: { not: "platform_admin" } },
    },
    select: {
      userId: true,
      roleId: true,
      user: { select: { isActive: true } },
      role: { select: { isActive: true } },
    },
  });
  const memberships = await db.flowMembership.findMany({
    where: {
      companyId,
      kind: "team",
      userId: { in: [...new Set(assignments.map((a) => a.userId))] },
    },
  });
  const teams = await db.team.findMany({
    where: {
      companyId,
      id: { in: [...new Set(memberships.map((m) => m.referenceId))] },
    },
    select: { id: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });
  const userTeams = new Map<string, Set<string>>();
  for (const membership of memberships) {
    if (!userTeams.has(membership.userId))
      userTeams.set(membership.userId, new Set());
    userTeams.get(membership.userId)!.add(membership.referenceId);
  }
  for (const roleId of roleIds) {
    const links = assignments.filter((a) => a.roleId === roleId);
    const teamIds = new Set(
      links.flatMap((a) => [...(userTeams.get(a.userId) || [])]),
    );
    result.set(roleId, {
      teams: teams.filter((t) => teamIds.has(t.id)),
      activeUserIds: links
        .filter((a) => a.user.isActive && a.role.isActive)
        .map((a) => a.userId),
    });
  }
  return result;
}

export async function teamRoleCounts(
  db: CatalogDb,
  companyId: string,
  teamIds: string[],
) {
  const memberships = await db.flowMembership.findMany({
    where: { companyId, kind: "team", referenceId: { in: teamIds } },
  });
  const assignments = await db.accessUserRole.findMany({
    where: {
      companyId,
      userId: { in: [...new Set(memberships.map((m) => m.userId))] },
      role: { companyId },
      user: { companyId, role: { not: "platform_admin" } },
    },
    select: { userId: true, roleId: true },
  });
  return new Map(
    teamIds.map((id) => {
      const users = new Set(
        memberships.filter((m) => m.referenceId === id).map((m) => m.userId),
      );
      return [
        id,
        new Set(
          assignments.filter((a) => users.has(a.userId)).map((a) => a.roleId),
        ).size,
      ];
    }),
  );
}
