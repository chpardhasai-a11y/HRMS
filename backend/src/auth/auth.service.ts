import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly forgotPasswordMessage = 'If this email exists, a reset link has been sent.';

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid email or password');

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');

    const payload = {
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        companyId: user.companyId,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode
      }
    };
  }

  async forgotPassword(email: string, audience: 'employee' | 'admin' | 'platform' | 'org' = 'employee') {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user || !user.isActive) return { message: this.forgotPasswordMessage };

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    await this.prisma.passwordResetToken.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    await this.securityAudit(user.companyId, user.id, 'password_reset_requested', { audience });

    const resetPath = {
      employee: '/reset-password',
      admin: '/org-admin/reset-password',
      org: '/org-admin/reset-password',
      platform: '/platform-admin/reset-password'
    }[audience];
    const resetUrl = `${this.frontendUrl()}${resetPath}?token=${token}`;
    this.logger.log(`Password reset link for ${user.email}: ${resetUrl}`);

    return { message: this.forgotPasswordMessage };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetToken || resetToken.usedAt || !resetToken.user.isActive) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      });
      await this.securityAudit(resetToken.companyId, resetToken.userId, 'password_reset_failed_expired', null);
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date()
        }
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() }
      }),
      this.prisma.securityAuditLog.create({
        data: {
          companyId: resetToken.companyId,
          userId: resetToken.userId,
          action: 'password_reset_completed'
        }
      })
    ]);

    return { message: 'Password has been reset. Please login again.' };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private frontendUrl() {
    return this.config.get<string>('FRONTEND_URL') || this.config.get<string>('CORS_ORIGIN')?.split(',')[0] || 'http://localhost:3006';
  }

  private async securityAudit(companyId: string, userId: string, action: string, metadata: unknown) {
    await this.prisma.securityAuditLog.create({
      data: {
        companyId,
        userId,
        action,
        metadata: metadata === null ? Prisma.JsonNull : JSON.parse(JSON.stringify(metadata))
      }
    });
  }
}
