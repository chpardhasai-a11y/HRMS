import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CountriesModule } from './countries/countries.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { IndustriesModule } from './industries/industries.module';
import { LookupsModule } from './lookups/lookups.module';
import { PrismaModule } from './prisma/prisma.module';
import { TimeZonesModule } from './time-zones/time-zones.module';
import { UsersModule } from './users/users.module';
import { LegalEntitiesModule } from './org-masters/legal-entities/legal-entities.module';

import { BusinessUnitsModule } from './org-masters/business-units/business-units.module';
import { DepartmentsModule } from './org-masters/departments/departments.module';
import { TeamsModule } from './org-masters/teams/teams.module';
import { LocationsModule } from './org-masters/locations/locations.module';
import { CostCentersModule } from './org-masters/cost-centers/cost-centers.module';
import { JobFamiliesModule } from './org-masters/job-families/job-families.module';
import { GradeBandsModule } from './org-masters/grade-bands/grade-bands.module';
import { JobTitlesModule } from './org-masters/job-titles/job-titles.module';
import { PayComponentsModule } from './org-masters/pay-components/pay-components.module';
import { EmploymentTypesModule } from './org-masters/employment-types/employment-types.module';
import { WorkModesModule } from './org-masters/work-modes/work-modes.module';
import { WorkShiftsModule } from './org-masters/work-shifts/work-shifts.module';
import { HolidayCalendarsModule } from './org-masters/holiday-calendars/holiday-calendars.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'backend/.env'] }),
    PrismaModule,
    UsersModule,
    CompaniesModule,
    AuthModule,
    EmployeesModule,
    MailModule,
    IndustriesModule,
    CountriesModule,
    CurrenciesModule,
    TimeZonesModule,
    LegalEntitiesModule,
    BusinessUnitsModule,
    DepartmentsModule,
    TeamsModule,
    LocationsModule,
    CostCentersModule,
    JobFamiliesModule,
    GradeBandsModule,
    JobTitlesModule,
    PayComponentsModule,
    EmploymentTypesModule,
    WorkModesModule,
    WorkShiftsModule,
    HolidayCalendarsModule,
    ApprovalsModule,
    LookupsModule,
    AuditModule,
    HealthModule
  ]
})
export class AppModule {}

