import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsPhoneNumber('CN')
  phone: string;

  @IsString()
  @MinLength(4)
  verificationCode: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
