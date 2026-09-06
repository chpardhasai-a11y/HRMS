import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { LookupsModule } from './lookups/lookups.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'backend/.env'] }),
    PrismaModule,
    UsersModule,
    CompaniesModule,
    AuthModule,
    EmployeesModule,
    LookupsModule,
    AuditModule,
    HealthModule
  ]
})
export class AppModule {}
