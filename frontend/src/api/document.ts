// src/api/document.ts
import request from '@/utils/request'

// 响应数据类型
export interface DocumentResponse {
  code: number
  data: {
    title: string
    markdownContent: string
  }
}

// 1. 生成文书
export const getDocument = (data: {
  category: string
  docType: string
  partyA: string
  partyB: string
  content: string
}): Promise<DocumentResponse> => {
  return request.post('/api/document/generate', data)
}

// 保存文书
export const saveDocument = (data: {
  senseId: string
  typeId: string
  partyA: string
  partyB: string
  content: string
  result: string
  id: string
}) => {
  return request.post('/legalDocumentTranslation/saveOrUpdate', data)
}

// 获取文书详情
export const getDocumentDetail = (id: string) => {
  return request.post(`/legalDocumentTranslation/getById`, { id })
}
