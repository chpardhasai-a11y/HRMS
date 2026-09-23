import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.department.count({ where: { companyId } });
    return `DEP-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;

    return this.prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        businessUnit: { select: { id: true, name: true, code: true } },
        _count: { select: { teams: true, costCenters: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.department.findFirst({
      where: { id, companyId: user.companyId },
      include: { businessUnit: true }
    });
    if (!record) throw new NotFoundException('Department not found');
    return record;
  }

  async create(dto: CreateDepartmentDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.department.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Department with this name or code already exists');

    return this.prisma.department.create({
      data: {
        companyId,
        code,
        name: dto.name,
        businessUnitId: dto.businessUnitId || null,
        description: dto.description,
        isActive: dto.isActive ?? true
      },
      include: { businessUnit: true }
    });
  }

  async update(id: string, dto: UpdateDepartmentDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: { businessUnit: true }
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.department.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.department.delete({ where: { id } });
  }
}
