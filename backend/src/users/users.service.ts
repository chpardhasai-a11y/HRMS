import { permissionKeysFromRoles } from "../access-control/permission-context";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string, companyId?: string) {
    const formattedEmail = email.toLowerCase();
    if (companyId) {
      return this.prisma.user.findFirst({
        where: { email: formattedEmail, companyId },
      });
    }
    return this.prisma.user.findFirst({
      where: { email: formattedEmail },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        accessRoles: { include: { role: true } },
        id: true,
        companyId: true,
        email: true,
        role: true,
        isActive: true,
        employeeCode: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        createdAt: true,
      },
    });
    if (!user) return null;
    const { accessRoles, ...safe } = user;
    return {
      ...safe,
      permissions: permissionKeysFromRoles(accessRoles),
      customRoles: accessRoles.map((m) => ({
        id: m.role.id,
        name: m.role.name,
        isActive: m.role.isActive,
      })),
    };
  }
}
