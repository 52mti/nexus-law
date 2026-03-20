import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class LoginDto {
  // 邮箱+密码登录
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  // 手机验证码登录
  @IsPhoneNumber('CN')
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  verificationCode?: string;

  @IsOptional()
  rememberMe?: boolean; // 保持登录状态
}
