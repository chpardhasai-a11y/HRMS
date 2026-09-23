import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string, companyId?: string) {
    const formattedEmail = email.toLowerCase();
    if (companyId) {
      return this.prisma.user.findFirst({
        where: { email: formattedEmail, companyId }
      });
    }
    return this.prisma.user.findFirst({
      where: { email: formattedEmail }
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        email: true,
        role: true,
        isActive: true,
        employeeCode: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        createdAt: true
      }
    });
  }
}
