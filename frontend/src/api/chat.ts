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

function agentHeaders() {
  const token = localStorage.getItem('token')
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * 分页读取 Agent 会话列表（current/size 与现有历史页分页一致）
 */
export const listConversations = async (pagination: { current: number; size: number }) => {
  const params = new URLSearchParams({
    current: String(pagination.current),
    size: String(pagination.size),
  })
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/conversations?${params}`,
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
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/conversations/${conversationId}/messages`,
    { headers: agentHeaders() },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<{ data?: ConversationMessage[] }>
}
