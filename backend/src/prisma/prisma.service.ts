import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a tenant-scoped Prisma Client instance that automatically injects `companyId`
   * filter into query operations to guarantee strict multi-tenant data isolation.
   */
  forTenant(companyId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantModels = [
              'Employee',
              'User',
              'EmployeeProfile',
              'EmployeeDocument',
              'AuditLog',
              'SecurityAuditLog',
              'PasswordResetToken'
            ];
            if (model && tenantModels.includes(model)) {
              if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                const currentWhere = (args as Record<string, unknown>).where || {};
                (args as Record<string, unknown>).where = { ...currentWhere, companyId };
              }
            }
            return query(args);
          }
        }
      }
    });
  }
}
