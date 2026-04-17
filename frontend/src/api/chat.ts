import request from '@/utils/request'

/**
 * 获取会话历史记录
 */
export const getConsultationHistory = (sessionId: string, params?: { firstId?: string; limit?: number; userId?: string }) => {
  return request.get<any, any>(`/api/chat/history/${sessionId}`, { params: { ...params, userId: params?.userId || 'guest' } });
};

/**
 * 获取 Dify 的会话列表
 */
export const getDifyConversations = (params?: {
  lastId?: string
  limit?: number
  user?: string
}) => {
  return request.get<any, any>(`/api/chat/conversations`, { params })
}

/**
 * 删除 Dify 的会话
 */
export const deleteDifyConversation = (sessionId: string) => {
  return request.delete<any, any>(`/api/chat/conversations/${sessionId}`)
}
