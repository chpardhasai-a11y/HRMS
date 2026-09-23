import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  code3?: string;

  @IsString()
  @IsOptional()
  phoneCode?: string;

  @IsString()
  @IsOptional()
  region?: string;
}

export class UpdateCountryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  code3?: string;

  @IsString()
  @IsOptional()
  phoneCode?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
