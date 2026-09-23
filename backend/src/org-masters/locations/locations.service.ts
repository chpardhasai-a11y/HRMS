import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateLocationDto, UpdateLocationDto } from './dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.location.count({ where: { companyId } });
    return `LOC-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { city: { contains: options.search, mode: 'insensitive' } },
        { country: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;

    return this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.location.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Office location not found');
    return record;
  }

  async create(dto: CreateLocationDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.location.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Office location with this name or code already exists');

    return this.prisma.location.create({
      data: {
        companyId,
        code,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        timezone: dto.timezone,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateLocationDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.location.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.location.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.location.delete({ where: { id } });
  }
}
