import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateGradeBandDto, UpdateGradeBandDto } from './dto';

@Injectable()
export class GradeBandsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.gradeBand.count({ where: { companyId } });
    return `GRD-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { currency: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;

    return this.prisma.gradeBand.findMany({
      where,
      orderBy: { levelRank: 'asc' },
      include: {
        _count: { select: { jobTitles: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.gradeBand.findFirst({
      where: { id, companyId: user.companyId },
      include: { jobTitles: true }
    });
    if (!record) throw new NotFoundException('Grade & Salary Band not found');
    return record;
  }

  async create(dto: CreateGradeBandDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.gradeBand.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Grade with this name or code already exists');

    return this.prisma.gradeBand.create({
      data: {
        companyId,
        code,
        name: dto.name,
        levelRank: dto.levelRank ?? 1,
        minSalary: dto.minSalary ?? 0,
        maxSalary: dto.maxSalary ?? 0,
        currency: dto.currency || 'INR',
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateGradeBandDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.gradeBand.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.gradeBand.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.gradeBand.delete({ where: { id } });
  }
}
