import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

export class ListAccessDto {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsString() @MaxLength(100) module?: string;
  @IsOptional() @IsString() @MaxLength(100) action?: string;
  @IsOptional() @IsIn(["active", "inactive"]) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}
export class CreateLevelDto {
  @IsInt() @Min(1) @Max(2147483647) number!: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  displayName?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  description?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateLevelDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  number?: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  displayName?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  description?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
export class MemberDto {
  @IsString() @MaxLength(100) userId!: string;
}
export class StatusDto {
  @IsBoolean() isActive!: boolean;
}
