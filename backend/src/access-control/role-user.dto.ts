import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ListAccessDto } from "./access-control.dto";
export class ListRoleUserDto extends ListAccessDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(["employee", "org_admin"])
  accountType?: "employee" | "org_admin";
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(["recent"])
  activity?: "recent";
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(100)
  roleId?: string;
}
export class CreateRoleDto {
  @IsString() @Matches(/\S/) @MaxLength(100) name!: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(1000)
  description?: string;
  @IsString() @MinLength(1) levelId!: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  permissionKeys!: string[];
  @ValidateIf((_o, v) => v !== undefined) @IsBoolean() isActive?: boolean;
}
export class UpdateRoleDto extends CreateRoleDto {
  @IsInt() @Min(1) revision!: number;
}
export class RoleStatusDto {
  @IsBoolean() isActive!: boolean;
  @IsInt() @Min(1) revision!: number;
}
export class CreateAccessUserDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(["employee", "org_admin"]) role!: "employee" | "org_admin";
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(100)
  employeeCode?: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  roleIds!: string[];
  @IsString() @MinLength(12) @MaxLength(72) password!: string;
  @ValidateIf((_o, v) => v !== undefined) @IsBoolean() isActive?: boolean;
}
export class UpdateAccessUserDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(["employee", "org_admin"]) role!: "employee" | "org_admin";
  @IsString() @MaxLength(100) employeeCode!: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  roleIds!: string[];
  @IsBoolean() isActive!: boolean;
  @IsString() updatedAt!: string;
}
export class UserStatusDto {
  @IsBoolean() isActive!: boolean;
  @IsString() updatedAt!: string;
}
export class UserPasswordDto {
  @IsString() @MinLength(12) @MaxLength(72) password!: string;
  @IsString() updatedAt!: string;
}
