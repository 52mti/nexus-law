import request from '@/utils/request'

const ACCOUNT_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/'

export type CodeScene = 'register' | 'login' | 'reset_password' | 'bind_contact'
export type LoginType = 'password' | 'code'

export interface ApiEnvelope<T = unknown> {
  code: number
  message: string
  data: T
}

export interface MembershipInfo {
  id?: string
  plan_id?: string
  status?: string
  start_at?: string | null
  expire_at?: string | null
  name?: string
  plan?: {
    id?: string
    name?: string
    period?: string | null
    benefits?: { code?: string | null }
  } | null
}

export interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  nickname: string | null
  avatar_url: string | null
  points: number
  status: string
  role_codes: string[]
  exclusiveLink?: string | null
  membership: MembershipInfo | null
}

export function membershipDisplayName(
  membership: MembershipInfo | null | undefined,
  fallback: string,
) {
  if (!membership) return fallback
  return membership.plan?.name || membership.name || fallback
}

export interface AuthResult {
  access_token: string
  token_type: 'bearer'
  expires_in_hours: number
  user: UserProfile
}

export interface SendCodeReq {
  scene: CodeScene
  phone?: string
  email?: string
}

export interface SendCodeResp {
  expire_seconds: number
  code?: string
}

export interface RegisterReq {
  code: string
  password: string
  phone?: string
  email?: string
  nickname?: string
}

export interface LoginReq {
  login_type: LoginType
  phone?: string
  email?: string
  password?: string
  code?: string
}

export interface ResetPasswordReq {
  code: string
  new_password: string
  phone?: string
  email?: string
}

export interface ProfileUpdateReq {
  nickname?: string
  phone?: string
  email?: string
  code?: string
}

export interface PasswordUpdateReq {
  old_password: string
  new_password: string
}

function unwrap<T>(envelope: ApiEnvelope<T> | undefined): T {
  if (!envelope || typeof envelope.code !== 'number') {
    throw new Error('服务响应异常')
  }
  if (envelope.code !== 0) {
    throw new Error(envelope.message || '请求失败')
  }
  return envelope.data
}

function accountConfig(extra?: Record<string, unknown>) {
  return { baseURL: ACCOUNT_BASE_URL, ...extra }
}

function publicAccountConfig(extra?: Record<string, unknown>) {
  return accountConfig({ skipAuth: true, ...extra })
}

export function contactFromAccount(account: string): { phone?: string; email?: string } {
  const value = account.trim()
  if (!value) return {}
  if (value.includes('@')) return { email: value }
  return { phone: value }
}

export function getApiErrorMessage(error: unknown, fallback = '请求失败') {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      message?: string
      response?: { data?: { message?: string } }
    }
    if (maybe.response?.data?.message) return maybe.response.data.message
    if (maybe.message) return maybe.message
  }
  return fallback
}

export const sendCode = async (data: SendCodeReq) => {
  const res = await request.post<unknown, ApiEnvelope<SendCodeResp>>(
    '/api/v1/auth/send_code',
    data,
    publicAccountConfig(),
  )
  return unwrap(res)
}

export const register = async (data: RegisterReq) => {
  const res = await request.post<unknown, ApiEnvelope<AuthResult>>(
    '/api/v1/auth/register',
    data,
    publicAccountConfig(),
  )
  return unwrap(res)
}

export const login = async (data: LoginReq) => {
  const res = await request.post<unknown, ApiEnvelope<AuthResult>>(
    '/api/v1/auth/login',
    data,
    publicAccountConfig(),
  )
  return unwrap(res)
}

export const resetPassword = async (data: ResetPasswordReq) => {
  const res = await request.post<unknown, ApiEnvelope<Record<string, never>>>(
    '/api/v1/auth/reset_password',
    data,
    publicAccountConfig(),
  )
  return unwrap(res)
}

export const getProfile = async () => {
  const res = await request.get<unknown, ApiEnvelope<UserProfile>>(
    '/api/v1/user/profile',
    accountConfig(),
  )
  return unwrap(res)
}

export const updateProfile = async (data: ProfileUpdateReq) => {
  const res = await request.post<unknown, ApiEnvelope<UserProfile>>(
    '/api/v1/user/profile/update',
    data,
    accountConfig(),
  )
  return unwrap(res)
}

export const updatePassword = async (data: PasswordUpdateReq) => {
  const res = await request.post<unknown, ApiEnvelope<Record<string, never>>>(
    '/api/v1/user/password/update',
    data,
    accountConfig(),
  )
  return unwrap(res)
}

export const uploadAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await request.post<unknown, ApiEnvelope<UserProfile>>(
    '/api/v1/user/avatar/upload',
    formData,
    accountConfig(),
  )
  return unwrap(res)
}
