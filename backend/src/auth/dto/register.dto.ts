import { IsEmail, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsPhoneNumber('CN') // 中国手机号验证
  phone: string;

  @IsString()
  @MinLength(4)
  verificationCode: string; // 手机验证码
}
