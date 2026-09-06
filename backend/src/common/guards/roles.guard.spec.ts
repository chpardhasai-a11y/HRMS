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
    const guard = new RolesGuard({ getAllAndOverride: jest.fn().mockReturnValue([UserRole.hr_admin]) } as unknown as Reflector);
    expect(guard.canActivate(context(UserRole.hr_admin))).toBe(true);
  });

  it('blocks users without a required role', () => {
    const guard = new RolesGuard({ getAllAndOverride: jest.fn().mockReturnValue([UserRole.super_admin]) } as unknown as Reflector);
    expect(guard.canActivate(context(UserRole.employee))).toBe(false);
  });
});
