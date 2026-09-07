import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  it('creates a company with enterprise defaults', async () => {
    const prisma: any = {
      company: {
        create: jest.fn().mockResolvedValue({ id: 'c2', name: 'Acme Media', country: 'India', timezone: 'Asia/Kolkata' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'c2', name: 'Acme Media', country: 'India', timezone: 'Asia/Kolkata', _count: { employees: 1, users: 1 } })
      },
      employee: { create: jest.fn() },
      user: { create: jest.fn() }
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    const service = new CompaniesService(prisma as any);

    await expect(service.create({ name: 'Acme Media', slug: 'acme-media', orgAdminEmail: 'admin@acme.test', orgAdminPassword: 'Password@123' })).resolves.toMatchObject({
      name: 'Acme Media',
      country: 'India',
      timezone: 'Asia/Kolkata'
    });
    expect(prisma.employee.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ code: 'ADMIN-ACME-MEDIA', email: 'admin@acme.test' })
    }));
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ employeeCode: 'ADMIN-ACME-MEDIA', email: 'admin@acme.test' })
    }));
  });

  it('returns a conflict when the organization code already exists', async () => {
    const prisma: any = {
      company: {
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: ['slug'] }
          })
        )
      }
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    const service = new CompaniesService(prisma as any);

    await expect(
      service.create({ name: 'Acme Media', slug: 'acme-media', orgAdminEmail: 'admin@acme.test', orgAdminPassword: 'Password@123' })
    ).rejects.toThrow(ConflictException);
  });
});
