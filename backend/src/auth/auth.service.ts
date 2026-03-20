import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  private readonly tokenExpireTime = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly verificationCodeExpireTime = 10 * 60 * 1000; // 10 minutes

  /**
   * 发送验证码到手机
   * 实际环境中应该集成SMS服务（如阿里云、腾讯云等）
   */
  async sendVerificationCode(
    sendVerificationCodeDto: SendVerificationCodeDto,
  ): Promise<{ message: string }> {
    const { phone } = sendVerificationCodeDto;

    // 验证手机号
    if (!this.isValidPhone(phone)) {
      throw new BusinessException(ErrorCode.INVALID_PHONE);
    }

    // 生成6位验证码
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + this.verificationCodeExpireTime);

    // 保存验证码到数据库
    await this.prisma.verificationCode.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // TODO: 这里应该集成真实的SMS服务
    console.log(`[SMS] Verification code for ${phone}: ${code}`);

    return { message: 'Verification code sent successfully' };
  }

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, phone, verificationCode } = registerDto;

    // 验证邮箱和手机号
    if (!this.isValidEmail(email)) {
      throw new BusinessException(ErrorCode.INVALID_EMAIL);
    }
    if (!this.isValidPhone(phone)) {
      throw new BusinessException(ErrorCode.INVALID_PHONE);
    }

    // 验证密码强度
    if (!this.isValidPassword(password)) {
      throw new BusinessException(ErrorCode.INVALID_PASSWORD);
    }

    // 检查邮箱是否已存在
    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmailUser) {
      throw new BusinessException(ErrorCode.EMAIL_ALREADY_REGISTERED);
    }

    // 检查手机号是否已存在
    const existingPhoneUser = await this.prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhoneUser) {
      throw new BusinessException(ErrorCode.PHONE_ALREADY_REGISTERED);
    }

    // 验证手机验证码
    await this.verifyVerificationCode(phone, verificationCode);

    // 密码加密
    const hashedPassword = await this.hashPassword(password);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
      },
    });

    // 标记验证码已使用
    await this.prisma.verificationCode.updateMany({
      where: {
        phone,
        code: verificationCode,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // 生成token
    const token = this.generateToken(user.id);
    const expiresIn = Math.floor(this.tokenExpireTime / 1000);

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      token,
      expiresIn,
    };
  }

  /**
   * 用户登录
   * 支持邮箱+密码登录和手机验证码登录
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password, phone, verificationCode, rememberMe } = loginDto;

    let user: User | null = null;

    // 邮箱+密码登录
    if (email && password) {
      if (!this.isValidEmail(email) || !this.isValidPassword(password)) {
        throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
      }

      user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
      }

      // 验证密码
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
      }
    }
    // 手机验证码登录
    else if (phone && verificationCode) {
      if (!this.isValidPhone(phone)) {
        throw new BusinessException(ErrorCode.INVALID_PHONE);
      }

      user = await this.prisma.user.findUnique({ where: { phone } });
      if (!user) {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
      }

      // 验证手机验证码
      await this.verifyVerificationCode(phone, verificationCode);

      // 标记验证码已使用
      await this.prisma.verificationCode.updateMany({
        where: {
          phone,
          code: verificationCode,
          used: false,
        },
        data: {
          used: true,
        },
      });
    } else {
      throw new BusinessException(ErrorCode.INVALID_PASSWORD);
    }

    // 生成token
    const token = this.generateToken(user.id);
    let expiresIn = Math.floor(this.tokenExpireTime / 1000);

    // 如果记住登录状态，延长token过期时间
    if (rememberMe) {
      expiresIn = 30 * 24 * 60 * 60; // 30 days
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      token,
      expiresIn,
    };
  }

  /**
   * 重置密码
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { phone, verificationCode, newPassword } = resetPasswordDto;

    // 验证手机号和密码
    if (!this.isValidPhone(phone)) {
      throw new BusinessException(ErrorCode.INVALID_PHONE);
    }
    if (!this.isValidPassword(newPassword)) {
      throw new BusinessException(ErrorCode.INVALID_PASSWORD);
    }

    // 查找用户
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    }

    // 验证手机验证码
    await this.verifyVerificationCode(phone, verificationCode);

    // 密码加密
    const hashedPassword = await this.hashPassword(newPassword);

    // 更新密码
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 标记验证码已使用
    await this.prisma.verificationCode.updateMany({
      where: {
        phone,
        code: verificationCode,
        used: false,
      },
      data: {
        used: true,
      },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * 验证验证码
   */
  private async verifyVerificationCode(
    phone: string,
    code: string,
  ): Promise<void> {
    const verificationRecord = await this.prisma.verificationCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationRecord) {
      throw new BusinessException(ErrorCode.VERIFICATION_CODE_EXPIRED);
    }
  }

  /**
   * 生成验证码
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 生成token
   */
  private generateToken(userId: number): string {
    // 简单的token生成方式
    // 实际生产环境应使用JWT库（@nestjs/jwt）
    const payload = {
      sub: userId,
      iat: Date.now(),
      exp: Date.now() + this.tokenExpireTime,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * 密码加密
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * 验证密码
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式（中国）
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证密码强度
   */
  private isValidPassword(password: string): boolean {
    return Boolean(password && password.length >= 6);
  }
}
