import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(['employee', 'admin'])
  audience?: 'employee' | 'admin';
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Password must include uppercase, lowercase, number and symbol'
  })
  password!: string;
}
