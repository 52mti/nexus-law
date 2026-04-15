import request from '@/utils/request'

/** ConsultationSession 表单数据 (由脚本抽取) */
export interface ConsultationSession {
  consultationId: string; // 咨询id
  content: string; // 咨询内容
  type: number; // 咨询类型 0用户 1ai
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateConsultationSession = (data: ConsultationSession) => {
  return request.post<any, any>('/consultationSession/saveOrUpdate', data);
};

/** Consultation 表单数据 (由脚本抽取) */
export interface Consultation {
  id: string;
  content: string; // 咨询内容
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateConsultation = (data: Consultation) => {
  return request.post<any, any>('/consultation/saveOrUpdate', data);
};

export const getConsultationHistory = (sessionId: string, params?: { firstId?: string; limit?: number; userId?: string }) => {
  return request.get<any, any>(`/api/chat/history/${sessionId}`, { params: { ...params, userId: params?.userId || 'guest' } });
};

/**
 * 获取 Dify 格式的聊天记录
 * @param sessionId 会话ID
 */
export const getDifyChatHistory = (
  sessionId: string,
  params?: { firstId?: string; limit?: number },
) => {
  return request.get<any, any>(`/api/chat/history/${sessionId}`, { params })
}

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
