import { EmployeeStatus } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  role!: string;

  @IsString()
  department!: string;

  @IsString()
  entity!: string;

  @IsString()
  location!: string;

  @IsString()
  manager!: string;

  @IsString()
  type!: string;

  @IsString()
  grade!: string;

  @IsDateString()
  joinDate!: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  documentNote?: string;
}

export class UpdateStatusDto {
  @IsEnum(EmployeeStatus)
  status!: EmployeeStatus;
}

export class UpdateManagerDto {
  @IsString()
  manager!: string;
}

export class TransferEmployeeDto {
  @IsString()
  department!: string;

  @IsString()
  location!: string;

  @IsString()
  role!: string;

  @IsString()
  grade!: string;
}

export class DocumentNoteDto {
  @IsString()
  documentType!: string;

  @IsOptional()
  @IsString()
  uploadNote?: string;
}
