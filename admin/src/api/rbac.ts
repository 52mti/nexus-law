import { apiGet, apiPost } from '@/lib/request'
import type { AdminPermission, AdminRole, AdminUser, PageResult } from '@/lib/types'

export function listUsers(params: {
  keyword?: string
  status?: string
  role_code?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<AdminUser>>('/admin/user/list', params)
}

export function getUserDetail(id: string) {
  return apiGet<AdminUser>('/admin/user/detail', { id })
}

export function updateUserStatus(id: string, status: 'active' | 'disabled') {
  return apiPost<AdminUser>('/admin/user/status/update', { id, status })
}

export function assignUserRoles(id: string, role_codes: string[]) {
  return apiPost<AdminUser>('/admin/user/roles/assign', { id, role_codes })
}

export function adjustUserPoints(id: string, change: number, remark?: string) {
  return apiPost<AdminUser>('/admin/user/points/adjust', { id, change, remark })
}

export function listRoles() {
  return apiGet<PageResult<AdminRole>>('/admin/role/list')
}

export function getRoleDetail(id: string) {
  return apiGet<AdminRole>('/admin/role/detail', { id })
}

export function createRole(body: { code: string; name: string; description?: string }) {
  return apiPost<AdminRole>('/admin/role/create', body)
}

export function updateRole(body: { id: string; name?: string; description?: string }) {
  return apiPost<AdminRole>('/admin/role/update', body)
}

export function deleteRole(id: string) {
  return apiPost<{ id: string }>('/admin/role/delete', { id })
}

export function listPermissions() {
  return apiGet<PageResult<AdminPermission>>('/admin/permission/list')
}

export function bindRolePermissions(id: string, permission_codes: string[]) {
  return apiPost<AdminRole>('/admin/role/permissions/bind', { id, permission_codes })
}
