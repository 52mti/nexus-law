import request from '@/utils/request'

// 文书生成历史记录
export const getDocumentList = (pagination: { current: number; size: number }) => {
  return request.post<any, any>(`/legalDocumentTranslation/pageList`, pagination)
}

//  合规审查历史记录
export const getComplianceReviewList = (pagination: { current: number; size: number }) => {
  return request.post<any, any>(`/complianceReview/pageList`, pagination)
}

export const settingList = () => {
  return request.post('/settings/pageList', {})
}

// 数据字典
export const dictList = (dictType: 'SAJE' | 'COUTER_LEVEL') => {
  return request.post('/dict/items', {
      current: 1,
      offset: 0,
      parentCode: dictType,
      size: 999
    }
  )
}