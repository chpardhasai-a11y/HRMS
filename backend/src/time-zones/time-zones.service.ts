import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeZoneDto, UpdateTimeZoneDto } from './dto';

@Injectable()
export class TimeZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.timeZone.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async findAllAdmin(query: { search?: string; region?: string; status?: string }) {
    const where: Prisma.TimeZoneWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { offset: { contains: query.search, mode: 'insensitive' } },
        { region: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.region) {
      where.region = query.region;
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    return this.prisma.timeZone.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const timeZone = await this.prisma.timeZone.findUnique({ where: { id } });
    if (!timeZone) throw new NotFoundException('Time zone not found');
    return timeZone;
  }

  async create(dto: CreateTimeZoneDto) {
    try {
      return await this.prisma.timeZone.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.toUpperCase().trim(),
          offset: dto.offset.trim(),
          region: dto.region?.trim() || 'Global'
        }
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async update(id: string, dto: UpdateTimeZoneDto) {
    await this.findOne(id);
    const data: Prisma.TimeZoneUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.code) data.code = dto.code.toUpperCase().trim();
    if (dto.offset) data.offset = dto.offset.trim();
    if (dto.region !== undefined) data.region = dto.region?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.timeZone.update({
        where: { id },
        data
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async toggleStatus(id: string) {
    const timeZone = await this.findOne(id);
    return this.prisma.timeZone.update({
      where: { id },
      data: { isActive: !timeZone.isActive }
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.timeZone.delete({ where: { id } });
  }

  private handleConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
      if (target.includes('name')) throw new ConflictException('Time zone name already exists.');
      throw new ConflictException('Time zone record already exists.');
    }
    throw error;
  }
}
