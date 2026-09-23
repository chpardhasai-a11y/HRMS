import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIndustryDto, UpdateIndustryDto } from './dto';

@Injectable()
export class IndustriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async findAllAdmin(query: { search?: string; category?: string; status?: string }) {
    const where: Prisma.IndustryWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    return this.prisma.industry.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const industry = await this.prisma.industry.findUnique({ where: { id } });
    if (!industry) throw new NotFoundException('Industry not found');
    return industry;
  }

  async create(dto: CreateIndustryDto) {
    const formattedCode = dto.code.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    try {
      return await this.prisma.industry.create({
        data: {
          name: dto.name.trim(),
          code: formattedCode,
          category: dto.category || 'General Services',
          description: dto.description
        }
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async update(id: string, dto: UpdateIndustryDto) {
    await this.findOne(id);
    const data: Prisma.IndustryUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.code) data.code = dto.code.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.industry.update({
        where: { id },
        data
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async toggleStatus(id: string) {
    const industry = await this.findOne(id);
    return this.prisma.industry.update({
      where: { id },
      data: { isActive: !industry.isActive }
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.industry.delete({ where: { id } });
  }

  private handleConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
      if (target.includes('code')) throw new ConflictException('Industry code already exists.');
      if (target.includes('name')) throw new ConflictException('Industry name already exists.');
      throw new ConflictException('Industry record already exists.');
    }
    throw error;
  }
}
