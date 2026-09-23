import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto, UpdateCountryDto } from './dto';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async findAllAdmin(query: { search?: string; region?: string; status?: string }) {
    const where: Prisma.CountryWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { code3: { contains: query.search, mode: 'insensitive' } },
        { phoneCode: { contains: query.search, mode: 'insensitive' } },
        { region: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.region) {
      where.region = query.region;
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    return this.prisma.country.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException('Country not found');
    return country;
  }

  async create(dto: CreateCountryDto) {
    const formattedCode = dto.code.toUpperCase().trim();
    try {
      return await this.prisma.country.create({
        data: {
          name: dto.name.trim(),
          code: formattedCode,
          code3: dto.code3?.toUpperCase().trim() || null,
          phoneCode: dto.phoneCode?.trim() || null,
          region: dto.region?.trim() || 'Global'
        }
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async update(id: string, dto: UpdateCountryDto) {
    await this.findOne(id);
    const data: Prisma.CountryUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.code) data.code = dto.code.toUpperCase().trim();
    if (dto.code3 !== undefined) data.code3 = dto.code3?.toUpperCase().trim() || null;
    if (dto.phoneCode !== undefined) data.phoneCode = dto.phoneCode?.trim() || null;
    if (dto.region !== undefined) data.region = dto.region?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.country.update({
        where: { id },
        data
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async toggleStatus(id: string) {
    const country = await this.findOne(id);
    return this.prisma.country.update({
      where: { id },
      data: { isActive: !country.isActive }
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.country.delete({ where: { id } });
  }

  private handleConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
      if (target.includes('code')) throw new ConflictException('Country ISO code already exists.');
      if (target.includes('name')) throw new ConflictException('Country name already exists.');
      throw new ConflictException('Country record already exists.');
    }
    throw error;
  }
}
