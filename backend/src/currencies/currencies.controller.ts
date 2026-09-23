import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}

  @Get()
  findAllActive() {
    return this.currencies.findAllActive();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  findAllAdmin(
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.currencies.findAllAdmin({ search, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.currencies.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  create(@Body() dto: CreateCurrencyDto) {
    return this.currencies.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencies.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  toggleStatus(@Param('id') id: string) {
    return this.currencies.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.platform_admin)
  delete(@Param('id') id: string) {
    return this.currencies.delete(id);
  }
}
