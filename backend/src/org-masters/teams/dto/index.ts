import {
  IsBoolean,
  ValidateIf,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateTeamDto {
  @IsString()
  @Matches(/\S/, { message: "Name is required" })
  @MaxLength(100)
  name!: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^$|\S/, { message: "Code cannot be blank" })
  @MaxLength(100)
  code?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  departmentId?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @ValidateIf((_object, value) => value !== undefined)
  isActive?: boolean;
}

export class UpdateTeamDto {
  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/\S/, { message: "Name is required" })
  @MaxLength(100)
  name?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/\S/, { message: "Code cannot be blank" })
  @MaxLength(100)
  code?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  departmentId?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @ValidateIf((_object, value) => value !== undefined)
  isActive?: boolean;
}
