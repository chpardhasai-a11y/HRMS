import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePayComponentDto, UpdatePayComponentDto } from './dto';
import { PayComponentsService } from './pay-components.service';

@Controller('org-masters/pay-components')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.org_admin, UserRole.platform_admin)
export class PayComponentsController {
  constructor(private readonly service: PayComponentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    return this.service.findAll(user, { search, status, type });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreatePayComponentDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePayComponentDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.toggleStatus(id, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.delete(id, user);
  }
}
