import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateIndustryDto, UpdateIndustryDto } from './dto';
import { IndustriesService } from './industries.service';

@Controller('industries')
export class IndustriesController {
  constructor(private readonly industries: IndustriesService) {}

  @Get()
  findAllActive() {
    return this.industries.findAllActive();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  findAllAdmin(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string
  ) {
    return this.industries.findAllAdmin({ search, category, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.industries.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  create(@Body() dto: CreateIndustryDto) {
    return this.industries.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  update(@Param('id') id: string, @Body() dto: UpdateIndustryDto) {
    return this.industries.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  toggleStatus(@Param('id') id: string) {
    return this.industries.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  delete(@Param('id') id: string) {
    return this.industries.delete(id);
  }
}
