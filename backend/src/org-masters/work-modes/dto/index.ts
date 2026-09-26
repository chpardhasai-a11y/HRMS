import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWorkModeDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @IsOptional()
  allowedRemoteDays?: number;

  @IsBoolean()
  @IsOptional()
  requiresGeofencing?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWorkModeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @IsOptional()
  allowedRemoteDays?: number;

  @IsBoolean()
  @IsOptional()
  requiresGeofencing?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
