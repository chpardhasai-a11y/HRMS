import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto } from './dto';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get()
  findAllActive() {
    return this.countries.findAllActive();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  findAllAdmin(
    @Query('search') search?: string,
    @Query('region') region?: string,
    @Query('status') status?: string
  ) {
    return this.countries.findAllAdmin({ search, region, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countries.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  create(@Body() dto: CreateCountryDto) {
    return this.countries.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countries.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  toggleStatus(@Param('id') id: string) {
    return this.countries.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  delete(@Param('id') id: string) {
    return this.countries.delete(id);
  }
}
