import request from '@/utils/request'

// 1. 定义入参类型（严格对应后端的 DTO）
export interface SearchCaseParams {
  categoryId?: string // 案件大类 (如果侧边栏组件有传的话)
  docType: string // 关键词信息
  content?: string[] // 判决时间范围 [开始日期, 结束日期]
  partyA?: string // 涉案金额枚举值
  partyB?: string // 判决法院等级枚举值
}

// 2. 定义出参类型
interface CaseSearchResponse {
  code: number
  message: string
  data: string // 后端返回的 Markdown 字符串
}

// 3. 导出请求函数 (纯 JSON 请求，不需要 FormData)
export const searchCaseApi = (data: SearchCaseParams) => {
  return request.post<any, CaseSearchResponse>('/case-search/search', data)
}
