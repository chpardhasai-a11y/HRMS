import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateHolidayCalendarDto, UpdateHolidayCalendarDto } from './dto';

@Injectable()
export class HolidayCalendarsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.holidayCalendar.count({ where: { companyId } });
    return `HOL-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string; type?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { applicableLocation: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;
    if (options?.type) where.type = options.type;

    return this.prisma.holidayCalendar.findMany({
      where,
      orderBy: { date: 'asc' }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.holidayCalendar.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Holiday not found');
    return record;
  }

  async create(dto: CreateHolidayCalendarDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));
    const dateObj = new Date(dto.date);

    const existing = await this.prisma.holidayCalendar.findFirst({
      where: { companyId, OR: [{ code }, { name: dto.name, date: dateObj }] }
    });
    if (existing) throw new BadRequestException('Holiday with this name/date or code already exists');

    return this.prisma.holidayCalendar.create({
      data: {
        companyId,
        code,
        name: dto.name,
        date: dateObj,
        type: dto.type || 'Mandatory',
        applicableLocation: dto.applicableLocation || 'All Locations',
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateHolidayCalendarDto, user: RequestUser) {
    await this.findOne(id, user);
    const data: any = { ...dto };
    if (dto.date) {
      data.date = new Date(dto.date);
    }
    return this.prisma.holidayCalendar.update({
      where: { id },
      data
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.holidayCalendar.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.holidayCalendar.delete({ where: { id } });
  }
}
