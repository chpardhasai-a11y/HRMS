import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalDto, RejectApprovalDto } from './dto';

const initialApprovalsSeed = [
  {
    id: 'REQ-2026-0841',
    employeeCode: 'EMP001245',
    employeeName: 'Rahul Sharma',
    department: 'Engineering',
    role: 'Senior Software Engineer',
    category: 'Bank Details',
    submittedAt: new Date('2026-09-24T14:30:00Z'),
    status: 'Pending',
    changes: [
      { field: 'Bank Name', current: 'HDFC Bank', requested: 'ICICI Bank' },
      { field: 'Account Number', current: '•••• •••• 7421', requested: '9876 5432 1098' },
      { field: 'IFSC Code', current: 'HDFC0001234', requested: 'ICIC0000123' },
      { field: 'Account Type', current: 'Salary Account', requested: 'Salary Account' }
    ],
    notes: 'Employee requested updated salary bank account details for upcoming payroll.'
  },
  {
    id: 'REQ-2026-0842',
    employeeCode: 'EMP001008',
    employeeName: 'Sneha Iyer',
    department: 'Engineering',
    role: 'Engineering Manager',
    category: 'Statutory Details',
    submittedAt: new Date('2026-09-24T11:15:00Z'),
    status: 'Pending',
    changes: [
      { field: 'PAN Number', current: 'ABCDE••••F', requested: 'ABCDE5678G' },
      { field: 'Aadhaar Number', current: '•••• •••• 3921', requested: '1234 5678 9012' }
    ],
    notes: 'Updated tax statutory identifiers following government document correction.'
  },
  {
    id: 'REQ-2026-0843',
    employeeCode: 'EMP001192',
    employeeName: 'Diya Rao',
    department: 'People Ops',
    role: 'People Ops Lead',
    category: 'Documents',
    submittedAt: new Date('2026-09-23T16:45:00Z'),
    status: 'Pending',
    changes: [
      { field: 'Address Proof', current: 'Pending', requested: 'Uploaded: Address_Proof_Diya_Rao.pdf' }
    ],
    notes: 'Uploaded electricity bill copy for current residence verification.'
  },
  {
    id: 'REQ-2026-0844',
    employeeCode: 'EMP001055',
    employeeName: 'Amitav Ghosh',
    department: 'Finance',
    role: 'Finance Manager',
    category: 'Bank Details',
    submittedAt: new Date('2026-09-22T09:30:00Z'),
    status: 'Pending',
    changes: [
      { field: 'Bank Name', current: 'State Bank of India', requested: 'Axis Bank' },
      { field: 'Account Number', current: '•••• •••• 1102', requested: '4567 8901 2345' },
      { field: 'IFSC Code', current: 'SBIN0000456', requested: 'UTIB0000789' }
    ],
    notes: 'Salary transfer bank account update.'
  }
];

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async findAll(
    user: RequestUser,
    filters: { search?: string; status?: string; category?: string; employeeCode?: string }
  ) {
    const count = await this.prisma.approvalRequest.count({
      where: { companyId: user.companyId }
    });

    if (count === 0) {
      await this.seedInitialApprovals(user.companyId);
    }

    const where: any = { companyId: user.companyId };

    if (filters.status && filters.status !== 'All') {
      where.status = filters.status;
    }

    if (filters.category && filters.category !== 'All') {
      where.category = filters.category;
    }

    if (filters.employeeCode) {
      where.employeeCode = filters.employeeCode;
    }

    if (filters.search?.trim()) {
      const query = filters.search.trim();
      where.OR = [
        { id: { contains: query, mode: 'insensitive' } },
        { employeeName: { contains: query, mode: 'insensitive' } },
        { employeeCode: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } }
      ];
    }

    return this.prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(dto: CreateApprovalDto, user: RequestUser) {
    const reqId = `REQ-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    return this.prisma.approvalRequest.create({
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
        status: 'Pending'
      }
    });
  }

  async approve(id: string, user: RequestUser) {
    const req = await this.prisma.approvalRequest.findFirst({
      where: { id, companyId: user.companyId }
    });

    if (!req) throw new NotFoundException('Approval request not found');

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'Approved',
        actionDate: new Date()
      }
    });

    // Apply change to employee profile if applicable
    if (req.category === 'Bank Details') {
      const changesList = (req.changes as any[]) || [];
      const updatedBankRows = changesList.map((c) => [c.field, c.requested]);
      const profile = await this.prisma.employeeProfile.findFirst({
        where: { companyId: user.companyId, employeeCode: req.employeeCode }
      });
      if (profile) {
        await this.prisma.employeeProfile.update({
          where: { id: profile.id },
          data: { bankDetails: updatedBankRows }
        });
      }
    } else if (req.category === 'Statutory Details') {
      const changesList = (req.changes as any[]) || [];
      const updatedStatRows = changesList.map((c) => [c.field, c.requested]);
      const profile = await this.prisma.employeeProfile.findFirst({
        where: { companyId: user.companyId, employeeCode: req.employeeCode }
      });
      if (profile) {
        await this.prisma.employeeProfile.update({
          where: { id: profile.id },
          data: { statutoryDetails: updatedStatRows }
        });
      }
    }

    // Fetch employee details to send notification
    const employee = await this.prisma.employee.findFirst({
      where: { companyId: user.companyId, code: req.employeeCode }
    });

    if (employee) {
      await this.prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          employeeCode: req.employeeCode,
          actorUserId: user.sub,
          action: 'APPROVED_PROFILE_REQUEST',
          before: req as any,
          after: updated as any
        }
      });

      this.mailService.sendApprovalNotification({
        email: employee.email,
        employeeName: employee.name,
        reqId: req.id,
        category: req.category,
        status: 'Approved'
      }).catch((err) => console.error('Failed to send approval email notification:', err));
    }

    return updated;
  }

  async reject(id: string, dto: RejectApprovalDto, user: RequestUser) {
    const req = await this.prisma.approvalRequest.findFirst({
      where: { id, companyId: user.companyId }
    });

    if (!req) throw new NotFoundException('Approval request not found');

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'Rejected',
        rejectionNote: dto.rejectionNote || 'Request rejected by HR Admin',
        actionDate: new Date()
      }
    });

    // Fetch employee details to send notification
    const employee = await this.prisma.employee.findFirst({
      where: { companyId: user.companyId, code: req.employeeCode }
    });

    if (employee) {
      await this.prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          employeeCode: req.employeeCode,
          actorUserId: user.sub,
          action: 'REJECTED_PROFILE_REQUEST',
          before: req as any,
          after: updated as any
        }
      });

      this.mailService.sendApprovalNotification({
        email: employee.email,
        employeeName: employee.name,
        reqId: req.id,
        category: req.category,
        status: 'Rejected',
        rejectionNote: updated.rejectionNote || undefined
      }).catch((err) => console.error('Failed to send rejection email notification:', err));
    }

    return updated;
  }

  private async seedInitialApprovals(companyId: string) {
    for (const item of initialApprovalsSeed) {
      await this.prisma.approvalRequest.create({
        data: {
          id: item.id,
          companyId,
          employeeCode: item.employeeCode,
          employeeName: item.employeeName,
          department: item.department,
          role: item.role,
          category: item.category,
          status: item.status,
          changes: item.changes as any,
          notes: item.notes,
          submittedAt: item.submittedAt
        }
      });
    }
  }
}
