import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHolidayCalendarDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  type?: string; // Mandatory, Optional, Regional, National

  @IsString()
  @IsOptional()
  applicableLocation?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateHolidayCalendarDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  applicableLocation?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
