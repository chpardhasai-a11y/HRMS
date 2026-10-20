import { Injectable } from "@nestjs/common";
import { Assignment, FlowDocument } from "./flow.types";
import { valueAt } from "./flow.rules";
@Injectable()
export class FlowAssignment {
  async resolve(
    tx: any,
    companyId: string,
    requesterId: string,
    assignment: Assignment,
    doc: FlowDocument,
    data: any,
  ): Promise<string[]> {
    let ids: string[] = [];
    let values = assignment?.values || [];
    if (assignment?.kind === "team") {
      values = (
        await tx.team.findMany({
          where: { companyId, isActive: true, id: { in: values } },
          select: { id: true },
        })
      ).map((t: any) => t.id);
    }
    if (assignment?.kind === "user") ids = values;
    if (assignment?.kind === "field")
      ids = values
        .flatMap((path) => {
          const v = path === "requesterId" ? requesterId : valueAt(data, path);
          return Array.isArray(v) ? v : [v];
        })
        .filter((v) => typeof v === "string");
    if (assignment?.kind === "role") {
      const builtIn = values.filter((v) =>
        ["employee", "org_admin", "platform_admin"].includes(v),
      );
      ids = (
        await tx.user.findMany({
          where: {
            companyId,
            isActive: true,
            OR: [
              { role: { in: builtIn } },
              {
                accessRoles: {
                  some: {
                    companyId,
                    roleId: { in: values },
                    role: { isActive: true },
                  },
                },
              },
            ],
          },
        })
      ).map((u: any) => u.id);
    }
    if (
      ["department", "team", "workflowRole", "manager"].includes(
        assignment?.kind,
      )
    ) {
      if (assignment.kind === "workflowRole")
        ids = values.flatMap((v) => doc.policies.workflowRoles?.[v] || []);
      else
        ids = (
          await tx.flowMembership.findMany({
            where: {
              companyId,
              kind: assignment.kind,
              ...(assignment.kind === "manager"
                ? { userId: requesterId }
                : { referenceId: { in: values } }),
            },
          })
        ).map((m: any) =>
          assignment.kind === "manager" ? m.referenceId : m.userId,
        );
    }
    const active = await tx.user.findMany({
      where: { companyId, isActive: true, id: { in: ids } },
    });
    ids = active.map((u: any) => u.id);
    if (!doc.policies.allowSelfApproval)
      ids = ids.filter((id) => id !== requesterId);
    if (!ids.length && assignment?.fallback?.length) {
      const fallback = await tx.user.findMany({
        where: { companyId, isActive: true, id: { in: assignment.fallback } },
      });
      ids = fallback
        .map((u: any) => u.id)
        .filter(
          (id: string) => doc.policies.allowSelfApproval || id !== requesterId,
        );
    }
    return [...new Set(ids)];
  }
}
