import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWorkShiftDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @IsOptional()
  gracePeriodMinutes?: number;

  @IsNumber()
  @IsOptional()
  halfDayHours?: number;

  @IsNumber()
  @IsOptional()
  breakDurationMins?: number;

  @IsBoolean()
  @IsOptional()
  isFlexible?: boolean;

  @IsBoolean()
  @IsOptional()
  isRotational?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWorkShiftDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @IsOptional()
  gracePeriodMinutes?: number;

  @IsNumber()
  @IsOptional()
  halfDayHours?: number;

  @IsNumber()
  @IsOptional()
  breakDurationMins?: number;

  @IsBoolean()
  @IsOptional()
  isFlexible?: boolean;

  @IsBoolean()
  @IsOptional()
  isRotational?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
