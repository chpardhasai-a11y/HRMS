import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function context(role: UserRole): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) })
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows users with a required role', () => {
    const guard = new RolesGuard({ getAllAndOverride: jest.fn().mockReturnValue([UserRole.org_admin]) } as unknown as Reflector);
    expect(guard.canActivate(context(UserRole.org_admin))).toBe(true);
  });

  it('blocks users without a required role', () => {
    const guard = new RolesGuard({ getAllAndOverride: jest.fn().mockReturnValue([UserRole.platform_admin]) } as unknown as Reflector);
    expect(guard.canActivate(context(UserRole.employee))).toBe(false);
  });
});
