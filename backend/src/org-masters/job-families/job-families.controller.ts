import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateJobFamilyDto, UpdateJobFamilyDto } from './dto';
import { JobFamiliesService } from './job-families.service';

@Controller('org-masters/job-families')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.org_admin, UserRole.platform_admin)
export class JobFamiliesController {
  constructor(private readonly service: JobFamiliesService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.service.findAll(user, { search, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateJobFamilyDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobFamilyDto, @CurrentUser() user: RequestUser) {
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
