import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateBusinessUnitDto, UpdateBusinessUnitDto } from './dto';

@Injectable()
export class BusinessUnitsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.businessUnit.count({ where: { companyId } });
    return `BU-${String(count + 1).padStart(3, '0')}`;
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

    return this.prisma.businessUnit.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        legalEntity: { select: { id: true, name: true, code: true } },
        _count: { select: { departments: true } }
      }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.businessUnit.findFirst({
      where: { id, companyId: user.companyId },
      include: { legalEntity: true }
    });
    if (!record) throw new NotFoundException('Business unit not found');
    return record;
  }

  async create(dto: CreateBusinessUnitDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.businessUnit.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Business unit with this name or code already exists');

    return this.prisma.businessUnit.create({
      data: {
        companyId,
        code,
        name: dto.name,
        legalEntityId: dto.legalEntityId || null,
        description: dto.description,
        isActive: dto.isActive ?? true
      },
      include: { legalEntity: true }
    });
  }

  async update(id: string, dto: UpdateBusinessUnitDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.businessUnit.update({
      where: { id },
      data: dto,
      include: { legalEntity: true }
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.businessUnit.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.businessUnit.delete({ where: { id } });
  }
}
