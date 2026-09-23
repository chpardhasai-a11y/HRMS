import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTimeZoneDto, UpdateTimeZoneDto } from './dto';
import { TimeZonesService } from './time-zones.service';

@Controller('time-zones')
export class TimeZonesController {
  constructor(private readonly timeZones: TimeZonesService) {}

  @Get()
  findAllActive() {
    return this.timeZones.findAllActive();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  findAllAdmin(
    @Query('search') search?: string,
    @Query('region') region?: string,
    @Query('status') status?: string
  ) {
    return this.timeZones.findAllAdmin({ search, region, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeZones.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  create(@Body() dto: CreateTimeZoneDto) {
    return this.timeZones.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  update(@Param('id') id: string, @Body() dto: UpdateTimeZoneDto) {
    return this.timeZones.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  toggleStatus(@Param('id') id: string) {
    return this.timeZones.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  delete(@Param('id') id: string) {
    return this.timeZones.delete(id);
  }
}
