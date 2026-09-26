import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateJobFamilyDto, UpdateJobFamilyDto } from './dto';

@Injectable()
export class JobFamiliesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.jobFamily.count({ where: { companyId } });
    return `JF-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { stream: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;

    return this.prisma.jobFamily.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { jobTitles: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.jobFamily.findFirst({
      where: { id, companyId: user.companyId },
      include: { jobTitles: true }
    });
    if (!record) throw new NotFoundException('Job Family not found');
    return record;
  }

  async create(dto: CreateJobFamilyDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.jobFamily.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Job Family with this name or code already exists');

    return this.prisma.jobFamily.create({
      data: {
        companyId,
        code,
        name: dto.name,
        stream: dto.stream || 'Individual Contributor',
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateJobFamilyDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.jobFamily.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.jobFamily.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.jobFamily.delete({ where: { id } });
  }
}
