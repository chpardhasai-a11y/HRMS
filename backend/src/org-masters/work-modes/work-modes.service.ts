import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkModeDto, UpdateWorkModeDto } from './dto';

@Injectable()
export class WorkModesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.workMode.count({ where: { companyId } });
    return `WM-${String(count + 1).padStart(3, '0')}`;
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

    return this.prisma.workMode.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.workMode.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Work Mode not found');
    return record;
  }

  async create(dto: CreateWorkModeDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.workMode.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Work Mode with this name or code already exists');

    return this.prisma.workMode.create({
      data: {
        companyId,
        code,
        name: dto.name,
        allowedRemoteDays: dto.allowedRemoteDays ?? 0,
        requiresGeofencing: dto.requiresGeofencing ?? false,
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateWorkModeDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.workMode.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.workMode.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.workMode.delete({ where: { id } });
  }
}
