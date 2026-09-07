import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus, Prisma, UserRole } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEmployeeDto,
  DocumentNoteDto,
  TransferEmployeeDto,
  UpdateEmployeeDto,
  UpdateManagerDto,
  UpdateStatusDto
} from './dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { code },
      include: this.includeProfile()
    });
    if (!employee || employee.companyId !== this.companyId(user)) {
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
          profile: { create: { companyId: this.companyId(actor) } }
        },
        include: this.includeProfile()
      });
      await this.audit(employee.code, actor, 'employee.created', null, employee);
      return employee;
    } catch (error) {
      this.handleEmployeeConflict(error);
    }
  }

  async update(code: string, dto: UpdateEmployeeDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    try {
      const employee = await this.prisma.employee.update({
        where: { code },
        data: dto,
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
      where: { code },
      data: { status: dto.status },
      include: this.includeProfile()
    });
    await this.audit(code, actor, 'employee.status_updated', { status: before.status }, { status: employee.status });
    return employee;
  }

  async updateManager(code: string, dto: UpdateManagerDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    const employee = await this.prisma.employee.update({
      where: { code },
      data: { manager: dto.manager },
      include: this.includeProfile()
    });
    await this.audit(code, actor, 'employee.manager_updated', { manager: before.manager }, { manager: employee.manager });
    return employee;
  }

  async transfer(code: string, dto: TransferEmployeeDto, actor: RequestUser) {
    const before = await this.findByCode(code, actor);
    const employee = await this.prisma.employee.update({
      where: { code },
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
      where: { code },
      data: {
        documentNote: note,
        documents: {
          create: {
            companyId: this.companyId(actor),
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
      if (target.includes('code')) throw new ConflictException('Employee code already exists.');
      if (target.includes('email')) throw new ConflictException('Employee email already exists.');
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
