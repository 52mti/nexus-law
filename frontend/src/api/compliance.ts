import request from '@/utils/request'

// 定义出参类型
interface ComplianceResponse {
  code: number
  message: string
  data: string // 后端返回的 Markdown 字符串
}

// 🚀 导出请求函数 (注意入参是 FormData 类型)
export const analyzeComplianceApi = (formData: FormData) => {
  return request.post<any, ComplianceResponse>('/api/compliance/analyze', formData, {
    // 💡 告诉 axios 这是一个包含文件的表单请求
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export interface ComplianceRecord {
  id?: string
  angleId?: string
  attachments?: string
  content?: string
}

export const getComplianceDetail = (id: string) => {
  return request.post<any, { code: number; message: string; data: ComplianceRecord }>(
    `/complianceReview/getById`,
    { id },
  )
}

export interface ComplianceReview {
  id?: string // ID
  attachments?: string // 附件
  angleId?: string // 角度
  content?: string // 结果内容
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateComplianceReview = (data: ComplianceReview) => {
  return request.post<any, any>('/complianceReview/saveOrUpdate', data)
}
