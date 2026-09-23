import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateLegalEntityDto, UpdateLegalEntityDto } from './dto';

@Injectable()
export class LegalEntitiesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.legalEntity.count({ where: { companyId } });
    return `LE-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { taxId: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;

    return this.prisma.legalEntity.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { businessUnits: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.legalEntity.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Legal entity not found');
    return record;
  }

  async create(dto: CreateLegalEntityDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.legalEntity.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Legal entity with this name or code already exists');

    return this.prisma.legalEntity.create({
      data: {
        companyId,
        code,
        name: dto.name,
        taxId: dto.taxId,
        country: dto.country,
        address: dto.address,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdateLegalEntityDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.legalEntity.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.legalEntity.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.legalEntity.delete({ where: { id } });
  }
}
