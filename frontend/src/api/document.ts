// src/api/document.ts
import request from '@/utils/request'

// 响应数据类型
export interface DocumentResponse {
  code: number
  data: {
    title: string;
    markdownContent: string;
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
