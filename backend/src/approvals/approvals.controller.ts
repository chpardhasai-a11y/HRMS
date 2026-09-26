import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto, RejectApprovalDto } from './dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @Roles(UserRole.employee, UserRole.org_admin)
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('employeeCode') employeeCode?: string
  ) {
    return this.approvals.findAll(user, { search, status, category, employeeCode });
  }

  @Post()
  @Roles(UserRole.employee, UserRole.org_admin)
  create(@Body() dto: CreateApprovalDto, @CurrentUser() user: RequestUser) {
    return this.approvals.create(dto, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.org_admin)
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.approvals.approve(id, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.org_admin)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectApprovalDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.approvals.reject(id, dto, user);
  }
}
