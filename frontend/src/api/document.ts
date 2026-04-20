// src/api/document.ts
import request from '@/utils/request'

// 新的文书生成参数类型
export interface GenerateDocumentParams {
  scene: string // 场景，如 "商事经营合同"
  document_type: string // 文书类型，如 "股权转让协议"
  party_a: string // 甲方显示名
  party_b: string // 乙方显示名
  content_desc: string // 内容描述
}

// 响应数据类型（保持兼容）
export interface DocumentResponse {
  code: number
  data: {
    title: string
    markdownContent: string
  }
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

