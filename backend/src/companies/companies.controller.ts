import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @Roles(UserRole.super_admin)
  findAll() {
    return this.companies.findAll();
  }

  @Get('current')
  @Roles(UserRole.employee, UserRole.hr_admin, UserRole.super_admin)
  current(@CurrentUser() user: RequestUser) {
    return this.companies.current(user);
  }

  @Post()
  @Roles(UserRole.super_admin)
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.super_admin)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(id, dto);
  }
}
