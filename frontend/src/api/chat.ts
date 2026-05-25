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

/**
 * 保存或更新会话本身（用于获取或初始化会话 ID）
 */
export const saveOrUpdateConsultation = (data: {
  id?: string
  response?: string
}) => {
  return request.post<any, any>('/consultation/saveOrUpdate', data)
}

/**
 * 保存或更新会话消息到业务数据库
 */
export const saveOrUpdateConsultationSession = (data: {
  consultationId: string
  content: string
  type: number // 0: 问题, 1: 回答
}) => {
  return request.post<any, any>('/consultationSession/saveOrUpdate', data)
}

