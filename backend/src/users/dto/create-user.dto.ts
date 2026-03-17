import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';

export class CreateUserDto {
  // 我们需要在这里定义前端传过来的具体字段及其类型
  @IsString()
  nickname: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  @Length(6, 20, { message: '密码长度必须在 6 到 20 个字符之间' })
  password: string;

  @IsEmail()
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;
}
