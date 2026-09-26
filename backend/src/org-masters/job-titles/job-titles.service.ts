import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateJobTitleDto, UpdateJobTitleDto } from './dto';

@Injectable()
export class JobTitlesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.jobTitle.count({ where: { companyId } });
    return `DES-${String(count + 1).padStart(3, '0')}`;
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

    return this.prisma.jobTitle.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        jobFamily: { select: { id: true, name: true, code: true, stream: true } },
        gradeBand: { select: { id: true, name: true, code: true, levelRank: true, minSalary: true, maxSalary: true, currency: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.jobTitle.findFirst({
      where: { id, companyId: user.companyId },
      include: { jobFamily: true, gradeBand: true }
    });
    if (!record) throw new NotFoundException('Designation / Job Title not found');
    return record;
  }

  async create(dto: CreateJobTitleDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.jobTitle.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Job Title with this name or code already exists');

    return this.prisma.jobTitle.create({
      data: {
        companyId,
        code,
        name: dto.name,
        jobFamilyId: dto.jobFamilyId || null,
        gradeBandId: dto.gradeBandId || null,
        description: dto.description,
        isActive: dto.isActive ?? true
      },
      include: { jobFamily: true, gradeBand: true }
    });
  }

  async update(id: string, dto: UpdateJobTitleDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.jobTitle.update({
      where: { id },
      data: dto,
      include: { jobFamily: true, gradeBand: true }
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.jobTitle.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.jobTitle.delete({ where: { id } });
  }
}
