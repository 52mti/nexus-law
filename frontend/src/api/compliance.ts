import request from '@/utils/request'

// 定义出参类型
interface ComplianceResponse {
  code: number
  message: string
  data: string // 后端返回的 Markdown 字符串
}

// 🚀 导出请求函数 (注意入参是 FormData 类型)
export const analyzeComplianceApi = (formData: FormData) => {
  return request.post<any, ComplianceResponse>(
    '/compliance/analyze',
    formData,
    {
      // 💡 告诉 axios 这是一个包含文件的表单请求
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
}
