import request from '@/utils/request'

export interface ConversationItem {
  id: string
  title: string | null
  content: string | null
  created_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at?: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/'

function agentHeaders() {
  const token = localStorage.getItem('token')
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function unwrap<T>(envelope: { code?: number; message?: string; data?: T } | undefined): T {
  if (!envelope || typeof envelope.code !== 'number') {
    throw new Error('服务响应异常')
  }
  if (envelope.code !== 0) {
    throw new Error(envelope.message || '请求失败')
  }
  return envelope.data as T
}

/**
 * 分页读取 Agent 会话列表（current/size 与现有历史页分页一致）
 */
export const listConversations = async (pagination: {
  current: number
  size: number
  user_id?: string
}) => {
  const params = new URLSearchParams({
    current: String(pagination.current),
    size: String(pagination.size),
  })
  if (pagination.user_id) {
    params.set('user_id', pagination.user_id)
  }
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/conversations?${params}`,
    { headers: agentHeaders() },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<{
    success?: boolean
    data?: {
      records: ConversationItem[]
      total: number
      current: number
      size: number
      pages: number
    }
  }>
}

/**
 * 读取 Agent 自动落库的会话消息
 */
export const getConversationMessages = async (conversationId: string) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/conversations/${conversationId}/messages`,
    { headers: agentHeaders() },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<{ data?: ConversationMessage[] }>
}

/**
 * 逻辑删除会话 POST /api/v1/conversation/delete
 */
export const deleteConversation = async (conversationId: string) => {
  const res = await request.post<
    unknown,
    { code: number; message: string; data: { id: string } }
  >(
    '/api/v1/conversation/delete',
    { conversation_id: conversationId },
    { baseURL: API_BASE },
  )
  return unwrap(res)
}
