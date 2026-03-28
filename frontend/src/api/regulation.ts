import request from '@/utils/request'

// 1. 定义入参类型（严格对应后端的 DTO）
export interface SearchRegulationParams {
  lawType: string
  articleNumber?: string
  keyword: string
}

// 2. 定义出参类型（根据你的拦截器，最终拿到的是包含 data 字段的对象）
interface SearchRegulationResponse {
  code: number
  message: string
  data: string // 后端返回的 Markdown 字符串
}

// 3. 导出请求函数
export const searchRegulationApi = (data: SearchRegulationParams) => {
  // 因为你的拦截器直接 return 了 response.data，所以这里泛型传入即可
  return request.post<any, SearchRegulationResponse>('/api/regulation/search', data)
}