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

export interface ConversationPage {
  records: ConversationItem[]
  total: number
  current: number
  size: number
  pages: number
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/'

function unwrap<T>(envelope: { code?: number; message?: string; data?: T } | undefined): T {
  if (!envelope || typeof envelope.code !== 'number') {
    throw new Error('服务响应异常')
  }
  if (envelope.code !== 0) {
    throw new Error(envelope.message || '请求失败')
  }
  return envelope.data as T
}

function config() {
  return { baseURL: API_BASE }
}

/**
 * 分页读取当前登录用户的会话列表
 */
export const listConversations = async (pagination: { current: number; size: number }) => {
  const res = await request.get<unknown, { code: number; message: string; data: ConversationPage }>(
    '/api/v1/conversations',
    { ...config(), params: pagination },
  )
  return unwrap(res)
}

/**
 * 读取 Agent 自动落库的会话消息
 */
export const getConversationMessages = async (conversationId: string) => {
  const res = await request.get<unknown, { code: number; message: string; data: ConversationMessage[] }>(
    `/api/v1/conversations/${conversationId}/messages`,
    config(),
  )
  return unwrap(res)
}

/**
 * 逻辑删除会话 POST /api/v1/conversation/delete
 */
export const updateConversationTitle = async (conversationId: string, title: string) => {
  const res = await request.post<
    unknown,
    { code: number; message: string; data: ConversationItem }
  >(
    '/api/v1/conversation/title/update',
    { conversation_id: conversationId, title },
    { baseURL: API_BASE },
  )
  return unwrap(res)
}

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
