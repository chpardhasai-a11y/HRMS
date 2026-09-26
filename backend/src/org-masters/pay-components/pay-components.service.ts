import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreatePayComponentDto, UpdatePayComponentDto } from './dto';

@Injectable()
export class PayComponentsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(companyId: string): Promise<string> {
    const count = await this.prisma.payComponent.count({ where: { companyId } });
    return `PAY-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(user: RequestUser, options?: { search?: string; status?: string; type?: string }) {
    const companyId = user.companyId;
    const where: any = { companyId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { type: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options?.status === 'active') where.isActive = true;
    if (options?.status === 'inactive') where.isActive = false;
    if (options?.type) where.type = options.type;

    return this.prisma.payComponent.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.payComponent.findFirst({
      where: { id, companyId: user.companyId }
    });
    if (!record) throw new NotFoundException('Pay Component not found');
    return record;
  }

  async create(dto: CreatePayComponentDto, user: RequestUser) {
    const companyId = user.companyId;
    const code = dto.code || (await this.generateCode(companyId));

    const existing = await this.prisma.payComponent.findFirst({
      where: { companyId, OR: [{ name: dto.name }, { code }] }
    });
    if (existing) throw new BadRequestException('Pay Component with this name or code already exists');

    return this.prisma.payComponent.create({
      data: {
        companyId,
        code,
        name: dto.name,
        type: dto.type || 'Earning',
        calculationType: dto.calculationType || 'Fixed Amount',
        value: dto.value ?? 0,
        isTaxable: dto.isTaxable ?? true,
        isStatutory: dto.isStatutory ?? false,
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });
  }

  async update(id: string, dto: UpdatePayComponentDto, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.payComponent.update({
      where: { id },
      data: dto
    });
  }

  async toggleStatus(id: string, user: RequestUser) {
    const record = await this.findOne(id, user);
    return this.prisma.payComponent.update({
      where: { id },
      data: { isActive: !record.isActive }
    });
  }

  async delete(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.payComponent.delete({ where: { id } });
  }
}
