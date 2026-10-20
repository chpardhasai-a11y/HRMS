import { ForbiddenException, Injectable } from "@nestjs/common";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateApprovalDto, RejectApprovalDto } from "./dto";
import { randomUUID } from "crypto";

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async findAll(
    user: RequestUser,
    filters: {
      search?: string;
      status?: string;
      category?: string;
      employeeCode?: string;
    },
  ) {
    const where: any = { companyId: user.companyId };

    if (filters.status && filters.status !== "All") {
      where.status = filters.status;
    }

    if (filters.category && filters.category !== "All") {
      where.category = filters.category;
    }

    if (user.role === "employee" && !user.delegatedAccess)
      where.employeeCode = user.employeeCode || "__none__";

    if (filters.employeeCode && (user.role !== "employee" || user.delegatedAccess)) {
      where.employeeCode = filters.employeeCode;
    }

    if (filters.search?.trim()) {
      const query = filters.search.trim();
      where.OR = [
        { id: { contains: query, mode: "insensitive" } },
        { employeeName: { contains: query, mode: "insensitive" } },
        { employeeCode: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ];
    }

    const requests = await this.prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    const instances = await this.prisma.flowInstance.findMany({
      where: {
        companyId: user.companyId,
        source: "profile_change",
        entityId: { in: requests.map((r) => r.id) },
      },
      include: { tasks: true },
    });
    return requests.map((req) => {
      const instance = instances.find((i) => i.entityId === req.id);
      return {
        ...req,
        workflowInstanceId: instance?.id,
        canAct:
          !!instance &&
          ["RUNNING", "WAITING"].includes(instance.status) &&
          instance.tasks.some(
            (t) =>
              t.status === "OPEN" &&
              (t.candidates as string[]).includes(user.sub) &&
              (!t.claimedBy || t.claimedBy === user.sub),
          ),
      };
    });
  }

  async create(dto: CreateApprovalDto, user: RequestUser) {
    if (user.role === "employee" && !user.delegatedAccess && dto.employeeCode !== user.employeeCode)
      throw new ForbiddenException("You can only submit your own requests");
    const reqId = `REQ-${new Date().getFullYear()}-${randomUUID()}`;
    return this.prisma.$transaction(
      async (tx) => {
        const req = await tx.approvalRequest.create({
          data: {
            id: reqId,
            companyId: user.companyId,
            employeeCode: dto.employeeCode,
            employeeName: dto.employeeName,
            department: dto.department,
            role: dto.role,
            category: dto.category,
            changes: dto.changes as any,
            notes: dto.notes,
            status: "Awaiting Configuration",
          },
        });

        await this.workflowsService.startHR(req.id, user, tx);

        return tx.approvalRequest.findUnique({ where: { id: req.id } });
      },
      { timeout: 20000 },
    );
  }

  async approve(id: string, user: RequestUser) {
    return this.workflowsService.hrAction(id, "approve", "", user);
  }
  async reject(id: string, dto: RejectApprovalDto, user: RequestUser) {
    return this.workflowsService.hrAction(
      id,
      "reject",
      dto.rejectionNote || "",
      user,
    );
  }
}
