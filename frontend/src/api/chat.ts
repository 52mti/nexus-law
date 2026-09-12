export interface ConversationMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at?: string
}

/**
 * 读取 Agent 自动落库的会话消息
 */
export const getConversationMessages = async (conversationId: string) => {
  const token = localStorage.getItem('token')
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/conversations/${conversationId}/messages`,
    {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<{ data?: ConversationMessage[] }>
}
