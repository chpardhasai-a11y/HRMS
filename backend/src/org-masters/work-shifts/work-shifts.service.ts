import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkShiftDto, UpdateWorkShiftDto } from './dto';

@Injectable()
export class WorkShiftsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.workShift.count({ where: { companyId } });
    return `SFT-${String(count + 1).padStart(3, '0')}`;
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

    return this.prisma.workShift.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.workShift.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Work Shift not found');
    return record;
  }

  async create(dto: CreateWorkShiftDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.workShift.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Work Shift with this name or code already exists');

    return this.prisma.workShift.create({
      data: {
        companyId,
        code,
        name: dto.name,
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '18:00',
        gracePeriodMinutes: dto.gracePeriodMinutes ?? 15,
        halfDayHours: dto.halfDayHours ?? 4.0,
        breakDurationMins: dto.breakDurationMins ?? 60,
        isFlexible: dto.isFlexible ?? false,
        isRotational: dto.isRotational ?? false,
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateWorkShiftDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.workShift.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.workShift.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.workShift.delete({ where: { id } });
  }
}
