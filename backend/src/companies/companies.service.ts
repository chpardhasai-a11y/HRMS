import { Injectable, NotFoundException } from '@nestjs/common';
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
    const companyId = user.activeCompanyId || user.companyId;
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { _count: { select: { employees: true, users: true } } }
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  create(dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain,
        country: dto.country || 'India',
        timezone: dto.timezone || 'Asia/Kolkata',
        logoUrl: dto.logoUrl,
        hrContactEmail: dto.hrContactEmail
      }
    });
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
}
