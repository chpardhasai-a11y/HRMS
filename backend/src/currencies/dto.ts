import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  decimalDigits?: number;
}

export class UpdateCurrencyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  decimalDigits?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
