import { apiGet, apiPost } from '@/lib/request'
import type { AdminProfile, LoginResult } from '@/lib/types'

export function loginAdmin(payload: {
  login_type: 'password'
  phone?: string
  email?: string
  password: string
}) {
  return apiPost<LoginResult>('/admin/auth/login', payload)
}

export function fetchAdminProfile() {
  return apiGet<AdminProfile>('/admin/auth/profile')
}
