import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: { update: jest.fn() },
    passwordResetToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    securityAuditLog: { create: jest.fn() },
    $transaction: jest.fn((operations) => Promise.all(operations))
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a JWT for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('Password@123', 4);
    const service = new AuthService(
      { findByEmail: jest.fn().mockResolvedValue({ id: 'u1', companyId: 'c1', email: 'admin@nw18.com', passwordHash, role: 'super_admin', isActive: true, employeeCode: null }) } as any,
      { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService,
      {} as any,
      prisma as any
    );

    await expect(service.login('admin@nw18.com', 'Password@123')).resolves.toMatchObject({
      accessToken: 'token',
      user: { companyId: 'c1', email: 'admin@nw18.com', role: 'super_admin' }
    });
  });

  it('rejects invalid credentials', async () => {
    const service = new AuthService(
      { findByEmail: jest.fn().mockResolvedValue(null) } as any,
      { signAsync: jest.fn() } as unknown as JwtService,
      {} as any,
      prisma as any
    );

    await expect(service.login('missing@nw18.com', 'Password@123')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not reveal whether a forgot-password email exists', async () => {
    const service = new AuthService(
      { findByEmail: jest.fn().mockResolvedValue(null) } as any,
      { signAsync: jest.fn() } as unknown as JwtService,
      {} as any,
      prisma as any
    );

    await expect(service.forgotPassword('missing@nw18.com')).resolves.toMatchObject({
      message: 'If this email exists, a reset link has been sent.'
    });
  });

  it('resets a password when the token is valid', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't1',
      companyId: 'c1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      user: { isActive: true }
    });
    const service = new AuthService(
      { findByEmail: jest.fn() } as any,
      { signAsync: jest.fn() } as unknown as JwtService,
      {} as any,
      prisma as any
    );

    await expect(service.resetPassword('token', 'Password@123')).resolves.toMatchObject({
      message: 'Password has been reset. Please login again.'
    });
  });
});
