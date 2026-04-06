import request from '@/utils/request'

// 积分记录
export const getPointsHistory = (pagination: { current: number; size: number }) => {
  return request.post<any, any>(`/points/pageList`, pagination)
}

// 系统消息记录
export const getMessageNotification = () => {
  return request.post<any, any>(`/message-notify/pageList`, {})
}

// 咨询历史记录
export const getConsultationList = (pagination: { current: number; size: number }) => {
  return request.post<any, any>(`/consultation/pageList`, pagination)
}

// 文书生成历史记录
export const getDocumentList = (pagination: { current: number; size: number }) => {
  return request.post<any, any>(`/legalDocumentTranslation/pageList`, pagination)
}

//  合规审查历史记录
export const getComplianceReviewList = (pagination: { current: number; size: number }) => {
  return request.post<any, any>(`/complianceReview/pageList`, pagination)
}

// 购买积分套餐
export const pointPlan = () => {
  return request.post('/pointsConfig/pageList', {})
}

// 标记已读
export const markReaded = (ids: string[]) => {
  return request.post('/message-notify/batchRead', {
    idList: ids,
  })
}

export const settingList = () => {
  return request.post('/settings/pageList', {})
}
