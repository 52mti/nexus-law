// src/api/auth.ts
import request from '@/utils/request'

// 响应数据类型
export interface AuthResponse {
  id: number
  email: string
  phone: string
  token: string
  expiresIn: number
  nickname: string
  avatarUrl: string
}

// 1. 获取手机验证码
export const getVerificationCode = (data: { phone: string }) => {
  return request.post('/auth/send-verification-code', data)
}

// 2. 用户注册
export const register = (data: {
  email: string
  password: string
  phone: string
  verificationCode: string
}): Promise<AuthResponse> => {
  return request.post('/auth/register', data)
}

// 3. 用户登录（邮箱+密码或手机验证码）
export const login = (data: {
  email?: string
  password?: string
  phone?: string
  verificationCode?: string
  rememberMe?: boolean
}): Promise<AuthResponse> => {
  return request.post('/auth/login', data)
}

// 4. 重置密码
export const resetPassword = (data: {
  phone: string
  verificationCode: string
  newPassword: string
}) => {
  return request.post('/auth/reset-password', data)
}
