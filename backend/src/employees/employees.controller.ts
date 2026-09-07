import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateEmployeeDto,
  DocumentNoteDto,
  TransferEmployeeDto,
  UpdateEmployeeDto,
  UpdateManagerDto,
  UpdateStatusDto
} from './dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @Roles(UserRole.org_admin)
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('location') location?: string,
    @Query('type') type?: string
  ) {
    return this.employees.findAll(user, { search, status, department, location, type });
  }

  @Post()
  @Roles(UserRole.org_admin)
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: RequestUser) {
    return this.employees.create(dto, user);
  }

  @Get(':code')
  @Roles(UserRole.employee, UserRole.org_admin)
  findOne(@Param('code') code: string, @CurrentUser() user: RequestUser) {
    return this.employees.findByCode(code, user);
  }

  @Patch(':code')
  @Roles(UserRole.org_admin)
  update(@Param('code') code: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: RequestUser) {
    return this.employees.update(code, dto, user);
  }

  @Patch(':code/status')
  @Roles(UserRole.org_admin)
  updateStatus(@Param('code') code: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: RequestUser) {
    return this.employees.updateStatus(code, dto, user);
  }

  @Patch(':code/manager')
  @Roles(UserRole.org_admin)
  updateManager(@Param('code') code: string, @Body() dto: UpdateManagerDto, @CurrentUser() user: RequestUser) {
    return this.employees.updateManager(code, dto, user);
  }

  @Patch(':code/transfer')
  @Roles(UserRole.org_admin)
  transfer(@Param('code') code: string, @Body() dto: TransferEmployeeDto, @CurrentUser() user: RequestUser) {
    return this.employees.transfer(code, dto, user);
  }

  @Patch(':code/documents')
  @Roles(UserRole.org_admin)
  recordDocument(@Param('code') code: string, @Body() dto: DocumentNoteDto, @CurrentUser() user: RequestUser) {
    return this.employees.recordDocumentNote(code, dto, user);
  }

  @Get(':code/audit')
  @Roles(UserRole.org_admin)
  audit(@Param('code') code: string, @CurrentUser() user: RequestUser) {
    return this.employees.getAudit(code, user);
  }
}
