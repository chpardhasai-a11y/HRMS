import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true, users: true } }
      }
    });
  }

  async current(user: RequestUser) {
    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      include: { _count: { select: { employees: true, users: true } } }
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(dto: CreateCompanyDto) {
    const passwordHash = await bcrypt.hash(dto.orgAdminPassword, 10);
    const adminEmployeeCode = this.adminEmployeeCode(dto.slug);
    const adminName = [dto.adminFirstName, dto.adminLastName].filter(Boolean).join(' ').trim() || dto.orgAdminEmail.split('@')[0];
    try {
      return await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            domain: dto.domain,
            country: dto.country || 'India',
            timezone: dto.timezone || 'Asia/Kolkata',
            logoUrl: dto.logoUrl,
            hrContactEmail: dto.hrContactEmail || dto.orgAdminEmail
          },
          include: {
            _count: { select: { employees: true, users: true } }
          }
        });

        await tx.employee.create({
          data: {
            companyId: company.id,
            code: adminEmployeeCode,
            name: adminName,
            email: dto.orgAdminEmail.toLowerCase(),
            phone: dto.adminPhone,
            role: dto.adminDesignation || dto.adminRole || 'Organization Super Admin',
            department: 'Administration',
            entity: dto.legalName || dto.name,
            location: dto.country || 'India',
            manager: 'Platform Admin',
            type: 'Permanent',
            grade: 'Admin',
            joinDate: new Date(),
            profile: { create: { companyId: company.id } }
          }
        });

        await tx.user.create({
          data: {
            companyId: company.id,
            email: dto.orgAdminEmail.toLowerCase(),
            passwordHash,
            role: UserRole.org_admin,
            employeeCode: adminEmployeeCode
          }
        });

        return tx.company.findUniqueOrThrow({
          where: { id: company.id },
          include: {
            _count: { select: { employees: true, users: true } }
          }
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
        if (target.includes('slug')) throw new ConflictException('Organization code already exists.');
        if (target.includes('email')) throw new ConflictException('Organization admin email already exists.');
        if (target.includes('code')) throw new ConflictException('Organization admin employee code already exists.');
        throw new ConflictException('Organization already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.ensureCompany(id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  private async ensureCompany(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  private adminEmployeeCode(slug: string) {
    return `ADMIN-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)}`;
  }
}
