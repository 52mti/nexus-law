import request from '@/utils/request'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/'

export type NotificationType =
  | 'feature_launch'
  | 'payment_success'
  | 'rebate_success'
  | 'refund_success'
  | string

export interface NotificationExtra {
  amount?: string
  points?: number | string
  plan_name?: string
  [key: string]: string | number | null | undefined
}

export interface NotificationRecord {
  id: string
  type: NotificationType
  title: string
  content: string
  biz_id: string | null
  extra: NotificationExtra
  is_read: boolean
  created_at: string | null
}

export interface NotificationPage {
  records: NotificationRecord[]
  total: number
  current: number
  size: number
  pages: number
  unread: number
}

interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
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

function config() {
  return { baseURL: API_BASE }
}

export const listNotifications = async (pagination: { current: number; size: number }) => {
  const res = await request.get<unknown, ApiEnvelope<NotificationPage>>('/api/v1/notification/list', {
    ...config(),
    params: pagination,
  })
  return unwrap(res)
}

/** idList 为空时标记当前用户可见的全部通知为已读 */
export const markNotificationsRead = async (idList: string[] = []) => {
  const res = await request.post<unknown, ApiEnvelope<{ updated: number }>>(
    '/api/v1/notification/read',
    { id_list: idList },
    config(),
  )
  return unwrap(res)
}
