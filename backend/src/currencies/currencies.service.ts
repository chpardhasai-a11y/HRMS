import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    });
  }

  async findAllAdmin(query: { search?: string; status?: string }) {
    const where: Prisma.CurrencyWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { symbol: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;

    return this.prisma.currency.findMany({
      where,
      orderBy: { code: 'asc' }
    });
  }

  async findOne(id: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException('Currency not found');
    return currency;
  }

  async create(dto: CreateCurrencyDto) {
    const formattedCode = dto.code.toUpperCase().trim();
    try {
      return await this.prisma.currency.create({
        data: {
          name: dto.name.trim(),
          code: formattedCode,
          symbol: dto.symbol.trim(),
          decimalDigits: dto.decimalDigits ?? 2
        }
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async update(id: string, dto: UpdateCurrencyDto) {
    await this.findOne(id);
    const data: Prisma.CurrencyUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.code) data.code = dto.code.toUpperCase().trim();
    if (dto.symbol) data.symbol = dto.symbol.trim();
    if (dto.decimalDigits !== undefined) data.decimalDigits = dto.decimalDigits;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.currency.update({
        where: { id },
        data
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async toggleStatus(id: string) {
    const currency = await this.findOne(id);
    return this.prisma.currency.update({
      where: { id },
      data: { isActive: !currency.isActive }
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.currency.delete({ where: { id } });
  }

  private handleConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
      if (target.includes('code')) throw new ConflictException('Currency code already exists.');
      throw new ConflictException('Currency record already exists.');
    }
    throw error;
  }
}
