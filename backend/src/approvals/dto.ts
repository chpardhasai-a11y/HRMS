import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApprovalChangeDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsString()
  current!: string;

  @IsString()
  requested!: string;
}

export class CreateApprovalDto {
  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @IsString()
  @IsNotEmpty()
  employeeName!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsArray()
  changes!: ApprovalChangeDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectApprovalDto {
  @IsString()
  @IsOptional()
  rejectionNote?: string;
}
