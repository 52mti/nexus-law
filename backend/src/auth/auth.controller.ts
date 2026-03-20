import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 发送手机验证码
   * POST /auth/send-verification-code
   */
  @Post('send-verification-code')
  async sendVerificationCode(
    @Body() sendVerificationCodeDto: SendVerificationCodeDto,
  ): Promise<ResponseDto> {
    const result = await this.authService.sendVerificationCode(
      sendVerificationCodeDto,
    );
    return ResponseDto.success(result);
  }

  /**
   * 用户注册
   * POST /auth/register
   */
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const result = await this.authService.register(registerDto);
    return ResponseDto.success(result);
  }

  /**
   * 用户登录
   * POST /auth/login
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const result = await this.authService.login(loginDto);
    return ResponseDto.success(result);
  }

  /**
   * 重置密码
   * POST /auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResponseDto> {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return ResponseDto.success(result);
  }
}
