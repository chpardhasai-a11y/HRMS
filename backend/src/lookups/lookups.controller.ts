import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const departments = ['Engineering', 'Product', 'Design', 'People Ops', 'Finance', 'Sales'];
const locations = ['Mumbai HQ', 'Bengaluru', 'Delhi NCR', 'Remote', 'Hyderabad'];
const grades = ['G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'C3'];

@Controller('lookups')
@UseGuards(JwtAuthGuard)
export class LookupsController {
  @Get('departments')
  departments() {
    return departments;
  }

  @Get('locations')
  locations() {
    return locations;
  }

  @Get('grades')
  grades() {
    return grades;
  }
}
