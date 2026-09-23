import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTimeZoneDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  offset!: string;

  @IsString()
  @IsOptional()
  region?: string;
}

export class UpdateTimeZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  offset?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
