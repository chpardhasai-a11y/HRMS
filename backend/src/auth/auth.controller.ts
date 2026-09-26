import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto, SetupAccountDto, VerifyInviteDto } from './dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.companyId || dto.companySlug);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email, dto.audience);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('verify-invite')
  verifyInvite(@Body() dto: VerifyInviteDto) {
    return this.auth.verifyInviteCode(dto.email, dto.otpOrTempPassword, dto.companyId || dto.companySlug);
  }

  @Post('setup-account')
  setupAccount(@Body() dto: SetupAccountDto) {
    return this.auth.setupEmployeeAccount(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.users.findById(user.sub);
  }
}

