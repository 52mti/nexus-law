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

/**
 * 生成文书 - 流式 SSE 响应
 * 返回 ReadableStream 用于实时接收生成内容
 */
export const generateDocumentStream = async (
  data: GenerateDocumentParams,
): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ''}/api/document/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is empty')
  }

  return response.body
}

/**
 * 解析 SSE 流式响应
 * 将字节流转换为事件对象
 */
export const parseSSEStream = async function* (
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          try {
            const event = JSON.parse(dataStr)
            yield event
          } catch (e) {
            console.error('Failed to parse SSE event:', e)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
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

