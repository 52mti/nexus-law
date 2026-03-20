import { IsPhoneNumber } from 'class-validator';

export class SendVerificationCodeDto {
  @IsPhoneNumber('CN')
  phone: string;
}
