import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.costCenter.count({ where: { companyId } });
    return `CC-${String(count + 1).padStart(3, '0')}`;
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

    return this.prisma.costCenter.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true, code: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.costCenter.findFirst({
      where: { id, companyId: user.companyId },
      include: { department: true }
    });
    if (!record) throw new NotFoundException('Cost center not found');
    return record;
  }

  async create(dto: CreateCostCenterDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.costCenter.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Cost center with this name or code already exists');

    return this.prisma.costCenter.create({
      data: {
        companyId,
        code,
        name: dto.name,
        departmentId: dto.departmentId || null,
        description: dto.description,
        isActive: dto.isActive ?? true
      },
      include: { department: true }
    });
  }

  async update(id: string, dto: UpdateCostCenterDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.costCenter.update({
      where: { id },
      data: dto,
      include: { department: true }
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.costCenter.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.costCenter.delete({ where: { id } });
  }
}
