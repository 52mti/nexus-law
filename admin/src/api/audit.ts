import { apiGet } from '@/lib/request'
import type { AuditItem, PageResult } from '@/lib/types'

export function listAudits(params: {
  admin_id?: string
  action?: string
  target_type?: string
  target_id?: string
  start_at?: string
  end_at?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<AuditItem>>('/admin/audit/list', params)
}

export function getAuditDetail(id: string) {
  return apiGet<AuditItem>('/admin/audit/detail', { id })
}
