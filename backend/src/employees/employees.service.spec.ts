import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  const actor = { sub: 'u1', companyId: 'c1', email: 'admin@nw18.com', role: 'super_admin' };

  it('updates status and writes an audit entry', async () => {
    const prisma = {
      employee: {
        findUnique: jest.fn().mockResolvedValue({ code: 'EMP001245', companyId: 'c1', status: 'Active', profile: null, documents: [] }),
        update: jest.fn().mockResolvedValue({ code: 'EMP001245', companyId: 'c1', status: 'Inactive', profile: null, documents: [] })
      },
      auditLog: { create: jest.fn() }
    };
    const service = new EmployeesService(prisma as any);

    await expect(service.updateStatus('EMP001245', { status: 'Inactive' as any }, actor)).resolves.toMatchObject({ status: 'Inactive' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'employee.status_updated', companyId: 'c1', employeeCode: 'EMP001245' })
    }));
  });

  it('scopes employee lists to the caller company', async () => {
    const prisma = {
      employee: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new EmployeesService(prisma as any);

    await service.findAll(actor, {});
    expect(prisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'c1' }
    }));
  });
});
