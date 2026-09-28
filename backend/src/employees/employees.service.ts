import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEmployeeDto,
  DocumentNoteDto,
  TransferEmployeeDto,
  UpdateEmployeeDto,
  UpdateManagerDto,
  UpdateOnboardingDto,
  UpdateStatusDto
} from './dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  private includeProfile() {
    return {
      profile: true,
      documents: { orderBy: { createdAt: 'asc' as const } }
    };
  }

  private companyId(user: RequestUser) {
    return user.companyId;
  }

  async findAll(user: RequestUser, query: { search?: string; status?: string; department?: string; location?: string; type?: string }) {
    const where: Prisma.EmployeeWhereInput = { companyId: this.companyId(user) };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { role: { contains: query.search, mode: 'insensitive' } },
        { manager: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.status && Object.values(EmployeeStatus).includes(query.status as EmployeeStatus)) {
      where.status = query.status as EmployeeStatus;
    }
    if (query.department) where.department = query.department;
    if (query.location) where.location = query.location;
    if (query.type) where.type = query.type;

    return this.prisma.employee.findMany({
      where,
      orderBy: { code: 'asc' },
      include: this.includeProfile()
    });
  }

  async findByCode(code: string, user: RequestUser) {
    this.assertCanReadEmployee(code, user);
    const employee = await this.prisma.employee.findUnique({
      where: {
        companyId_code: {
          companyId: this.companyId(user),
          code
        }
      },
      include: this.includeProfile()
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${code} not found`);
    }
    return employee;
  }

  async create(dto: CreateEmployeeDto, actor: RequestUser) {
    try {
      const employee = await this.prisma.employee.create({
        data: {
          ...dto,
          companyId: this.companyId(actor),
          joinDate: new Date(dto.joinDate),
          profile: { create: {} }
        },
        include: this.includeProfile()
      });

      const tempPassword = `Hrms#${Math.floor(100000 + Math.random() * 900000)}`;
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await this.prisma.user.upsert({
        where: {
          companyId_email: {
            companyId: this.companyId(actor),
            email: dto.email.toLowerCase()
          }
        },
        create: {
          companyId: this.companyId(actor),
          email: dto.email.toLowerCase(),
          passwordHash,
          role: UserRole.employee,
          employeeCode: employee.code,
          isActive: true
        },
        update: {
          passwordHash,
          employeeCode: employee.code,
          isActive: true
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
      const loginUrl = `${frontendUrl}/onboard?email=${encodeURIComponent(employee.email)}&code=${employee.code}&otp=${otpCode}`;

      const inviteDetails = {
        sentToEmail: employee.email,
        sentToPhone: employee.phone || '+91 98765 43210',
        loginUrl,
        tempPassword,
        otpCode,
        instructions: '1. Click the HRMS onboarding link.\n2. Verify email/mobile using OTP or Temporary Password.\n3. Create your new password.\n4. Access HRMS.'
      };

      // Trigger asynchronous onboarding invite email delivery
      this.mailService.sendOnboardingInvite({
        email: employee.email,
        employeeName: employee.name,
        employeeCode: employee.code,
        loginUrl,
        tempPassword,
        otpCode
      }).catch((err) => console.error('Failed to send onboarding email:', err));

      await this.audit(employee.code, actor, 'employee.invited', null, { ...employee, inviteDetails });

      return {
        ...employee,
        inviteDetails
      };
    } catch (error) {
      this.handleEmployeeConflict(error);
    }
  }

  async resendInvite(code: string, actor: RequestUser) {
    const employee = await this.findByCode(code, actor);
    const tempPassword = `Hrms#${Math.floor(100000 + Math.random() * 900000)}`;
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.upsert({
      where: {
        companyId_email: {
          companyId: this.companyId(actor),
          email: employee.email.toLowerCase()
        }
      },
      create: {
        companyId: this.companyId(actor),
        email: employee.email.toLowerCase(),
        passwordHash,
        role: UserRole.employee,
        employeeCode: employee.code,
        isActive: true
      },
      update: {
        passwordHash,
        employeeCode: employee.code,
        isActive: true
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
    const loginUrl = `${frontendUrl}/onboard?email=${encodeURIComponent(employee.email)}&code=${employee.code}&otp=${otpCode}`;

    const inviteDetails = {
      sentToEmail: employee.email,
      sentToPhone: employee.phone || '+91 98765 43210',
      loginUrl,
      tempPassword,
      otpCode,
      instructions: '1. Click the HRMS onboarding link.\n2. Verify email/mobile using OTP or Temporary Password.\n3. Create your new password.\n4. Access HRMS.'
    };

    // Trigger asynchronous onboarding invite email delivery
    this.mailService.sendOnboardingInvite({
      email: employee.email,
      employeeName: employee.name,
      employeeCode: employee.code,
      loginUrl,
      tempPassword,
      otpCode
    }).catch((err) => console.error('Failed to resend onboarding email:', err));

    await this.audit(code, actor, 'employee.invite_resent', null, inviteDetails);

    return {
      ...employee,
      inviteDetails
    };
  }

  async update(code: string, dto: UpdateEmployeeDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    
    if (actor.role === UserRole.employee) {
      if (actor.employeeCode !== code) {
        throw new ForbiddenException('Employees can only edit their own profile');
      }
      const hrRestrictedFields = ['role', 'department', 'entity', 'type', 'grade', 'manager'];
      const attemptedRestricted = hrRestrictedFields.filter((field) => dto[field as keyof UpdateEmployeeDto] !== undefined);
      if (attemptedRestricted.length > 0) {
        throw new ForbiddenException(
          `Employees cannot directly edit HR-controlled fields: ${attemptedRestricted.join(', ')}`
        );
      }
    }

    try {
      const { profile, ...employeeData } = dto;

      const employee = await this.prisma.employee.update({
        where: {
          companyId_code: {
            companyId: this.companyId(actor),
            code
          }
        },
        data: {
          ...employeeData,
          ...(profile
            ? {
                profile: {
                  upsert: {
                    create: {
                      company: { connect: { id: this.companyId(actor) } },
                      ...profile
                    },
                    update: profile
                  }
                }
              }
            : {})
        },
        include: this.includeProfile()
      });
      await this.audit(code, actor, 'employee.updated', before, employee);
      return employee;
    } catch (error) {
      this.handleEmployeeConflict(error);
    }
  }

  async updateStatus(code: string, dto: UpdateStatusDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    const employee = await this.prisma.employee.update({
      where: {
        companyId_code: {
          companyId: this.companyId(actor),
          code
        }
      },
      data: { status: dto.status },
      include: this.includeProfile()
    });
    await this.audit(code, actor, 'employee.status_updated', { status: before.status }, { status: employee.status });
    return employee;
  }

  async updateManager(code: string, dto: UpdateManagerDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    const employee = await this.prisma.employee.update({
      where: {
        companyId_code: {
          companyId: this.companyId(actor),
          code
        }
      },
      data: { manager: dto.manager },
      include: this.includeProfile()
    });
    await this.audit(code, actor, 'employee.manager_updated', { manager: before.manager }, { manager: employee.manager });
    return employee;
  }

  async transfer(code: string, dto: TransferEmployeeDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    const employee = await this.prisma.employee.update({
      where: {
        companyId_code: {
          companyId: this.companyId(actor),
          code
        }
      },
      data: dto,
      include: this.includeProfile()
    });
    await this.audit(
      code,
      actor,
      'employee.transferred',
      { department: before.department, location: before.location, role: before.role, grade: before.grade },
      dto
    );
    return employee;
  }

  async recordDocumentNote(code: string, dto: DocumentNoteDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    const note = `${dto.documentType} uploaded${dto.uploadNote ? `: ${dto.uploadNote}` : ''}`;
    const employee = await this.prisma.employee.update({
      where: {
        companyId_code: {
          companyId: this.companyId(actor),
          code
        }
      },
      data: {
        documentNote: note,
        documents: {
          create: {
            type: dto.documentType,
            status: 'Pending',
            note: dto.uploadNote
          }
        }
      },
      include: this.includeProfile()
    });
    await this.audit(code, actor, 'employee.document_note_added', { documentNote: before.documentNote }, { documentNote: note });
    return employee;
  }

  async getAudit(code: string, user: RequestUser) {
    await this.findByCode(code, user);
    return this.prisma.auditLog.findMany({
      where: { companyId: this.companyId(user), employeeCode: code },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true, role: true } } }
    });
  }

  async getOnboardingQueue(actor: RequestUser) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId: this.companyId(actor) },
      orderBy: { joinDate: 'asc' },
      include: this.includeProfile()
    });

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const queue = employees.map((emp) => {
      const joinDateObj = new Date(emp.joinDate);
      const isPreJoining = emp.status !== EmployeeStatus.Active && emp.status !== EmployeeStatus.Terminated;

      const stage1_inviteSent = true;
      const stage2_docsVerified = Boolean(emp.documents && emp.documents.length > 0) || emp.documentNote !== 'No recent uploads';
      const stage3_assetsAllocated = Boolean(emp.profile?.workMode || emp.profile?.shift);
      const stage4_bankVerified = Boolean(emp.profile?.bankDetails || emp.profile?.statutoryDetails);

      const completedCount = [stage1_inviteSent, stage2_docsVerified, stage3_assetsAllocated, stage4_bankVerified].filter(Boolean).length;
      const completionPercentage = Math.round((completedCount / 4) * 100);

      let currentStageName = 'Stage 1: Invite Sent';
      if (!stage2_docsVerified) currentStageName = 'Stage 2: Pending Document Verification';
      else if (!stage3_assetsAllocated) currentStageName = 'Stage 3: Pending IT Asset Allocation';
      else if (!stage4_bankVerified) currentStageName = 'Stage 4: Pending Bank & Statutory Setup';
      else currentStageName = 'Stage 4: 100% Onboarding Complete';

      const isReadyForDayOne = completionPercentage === 100;
      const isJoiningThisWeek = joinDateObj >= now && joinDateObj <= oneWeekFromNow;

      return {
        ...emp,
        isPreJoining,
        onboardingProgress: {
          completedCount,
          totalCount: 4,
          completionPercentage,
          currentStageName,
          isReadyForDayOne,
          isJoiningThisWeek,
          stages: {
            stage1_inviteSent,
            stage2_docsVerified,
            stage3_assetsAllocated,
            stage4_bankVerified
          }
        }
      };
    });

    const totalPreJoinees = queue.length;
    const joiningThisWeek = queue.filter((q) => q.onboardingProgress.isJoiningThisWeek).length;
    const pendingVerification = queue.filter((q) => !q.onboardingProgress.stages.stage2_docsVerified).length;
    const readyForDayOne = queue.filter((q) => q.onboardingProgress.isReadyForDayOne).length;

    return {
      metrics: {
        totalPreJoinees,
        joiningThisWeek,
        pendingVerification,
        readyForDayOne
      },
      queue
    };
  }

  async updateOnboardingStage(code: string, dto: UpdateOnboardingDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    let updateData: Prisma.EmployeeUpdateInput = {};

    if (dto.markDayOneJoined) {
      updateData.status = EmployeeStatus.Active;
    }

    if (dto.note) {
      updateData.documentNote = `Onboarding update: ${dto.note}`;
    }

    const employee = await this.prisma.employee.update({
      where: {
        companyId_code: {
          companyId: this.companyId(actor),
          code
        }
      },
      data: updateData,
      include: this.includeProfile()
    });

    await this.audit(
      code,
      actor,
      dto.markDayOneJoined ? 'employee.onboarding_day1_activated' : 'employee.onboarding_stage_updated',
      before,
      employee
    );

    return employee;
  }

  async remove(code: string, actor: RequestUser) {
    const employee = await this.findByCode(code, actor);

    await this.prisma.$transaction([
      this.prisma.user.deleteMany({
        where: { companyId: this.companyId(actor), employeeCode: code }
      }),
      this.prisma.employeeDocument.deleteMany({
        where: { employeeCode: code }
      }),
      this.prisma.employeeProfile.deleteMany({
        where: { companyId: this.companyId(actor), employeeCode: code }
      }),
      this.prisma.employee.delete({
        where: {
          companyId_code: {
            companyId: this.companyId(actor),
            code
          }
        }
      })
    ]);

    await this.audit(code, actor, 'employee.deleted', employee, null);
    return { success: true, message: `Employee ${code} successfully deleted.` };
  }

  private async audit(employeeCode: string, actor: RequestUser, action: string, before: unknown, after: unknown) {
    await this.prisma.auditLog.create({
      data: {
        employeeCode,
        companyId: this.companyId(actor),
        actorUserId: actor?.sub,
        action,
        before: this.toJson(before),
        after: this.toJson(after)
      }
    });
  }

  private toJson(value: unknown) {
    if (value === null || value === undefined) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private handleEmployeeConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
      if (target.includes('code')) throw new ConflictException('Employee code already exists in this organization.');
      if (target.includes('email')) throw new ConflictException('Employee email already exists in this organization.');
      throw new ConflictException('Employee already exists.');
    }
    throw error;
  }

  private assertCanReadEmployee(code: string, user: RequestUser) {
    if (user.role === UserRole.employee && user.employeeCode !== code) {
      throw new ForbiddenException('Employees can only access their own profile');
    }
  }
}
