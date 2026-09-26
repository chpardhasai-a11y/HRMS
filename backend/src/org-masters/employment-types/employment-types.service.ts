import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateEmploymentTypeDto, UpdateEmploymentTypeDto } from './dto';

@Injectable()
export class EmploymentTypesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.employmentType.count({ where: { companyId } });
    return `EMPT-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { category: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;

    return this.prisma.employmentType.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.employmentType.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Employment Type not found');
    return record;
  }

  async create(dto: CreateEmploymentTypeDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.employmentType.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Employment Type with this name or code already exists');

    return this.prisma.employmentType.create({
      data: {
        companyId,
        code,
        name: dto.name,
        category: dto.category || 'Permanent',
        noticePeriodDays: dto.noticePeriodDays ?? 30,
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateEmploymentTypeDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.employmentType.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.employmentType.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.employmentType.delete({ where: { id } });
  }
}
