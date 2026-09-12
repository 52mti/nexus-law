export type StreamEvent =
  | 'thinking'
  | 'status'
  | 'chunk'
  | 'done'
  | 'conversation_meta'
  | 'token'
  | 'tool_start'
  | 'tool_end'
  | 'final'
  | 'error'

export interface StreamPayload {
  id?: string
  sequence?: number
  event: StreamEvent | string
  task_id?: string
  delta: string
  conversation_id?: string
  request_id?: string
}

interface SSEOptions {
  url: string
  body: Record<string, any>
  signal: AbortSignal
  headers?: Record<string, string>
  onMessage: (data: StreamPayload) => void
  onError?: (err: any) => void
  onClose?: () => void
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseSseBlock(block: string): StreamPayload | null {
  let eventName = ''
  const dataParts: string[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).replace(/^ /, ''))
    }
  }

  const raw = dataParts.join('\n')
  if (!raw) return null
  if (raw === '[DONE]') {
    return { event: 'done', delta: '' }
  }

  try {
    const parsed = JSON.parse(raw)
    const envelope = asRecord(parsed)
    if (envelope) {
      const name = typeof envelope.event === 'string' ? envelope.event : eventName
      const payload = envelope.data

      if (name === 'conversation_meta') {
        const meta = asRecord(payload) ?? envelope
        const conversationId = String(meta.conversation_id ?? '')
        return {
          event: 'conversation_meta',
          delta: '',
          conversation_id: conversationId,
          request_id: meta.request_id ? String(meta.request_id) : undefined,
        }
      }

      if (name === 'token') {
        const text =
          typeof payload === 'string'
            ? payload
            : asRecord(payload)?.content != null
              ? String(asRecord(payload)?.content)
              : typeof envelope.delta === 'string'
                ? envelope.delta
                : ''
        if (!text) return null
        return { event: 'chunk', delta: text.replace(/\\n/g, '\n') }
      }

      if (name === 'error' || envelope.event === 'error') {
        const error = asRecord(payload) ?? envelope
        return {
          event: 'error',
          delta: String(error.message ?? error.delta ?? raw),
          request_id: error.request_id ? String(error.request_id) : undefined,
        }
      }

      if (name === 'tool_start' || name === 'tool_end' || name === 'final') {
        return { event: name, delta: '' }
      }

      if (typeof envelope.delta === 'string') {
        return {
          id: typeof envelope.id === 'string' ? envelope.id : undefined,
          sequence: typeof envelope.sequence === 'number' ? envelope.sequence : undefined,
          event: name || 'chunk',
          task_id: typeof envelope.task_id === 'string' ? envelope.task_id : undefined,
          delta: envelope.delta,
        }
      }

      if (typeof payload === 'string') {
        return {
          event: name || 'chunk',
          delta: payload.replace(/\\n/g, '\n'),
        }
      }
    }
  } catch {
    // 非 JSON 帧，走下方纯文本兼容逻辑
  }

  if (eventName === 'conversation_meta') {
    try {
      const meta = asRecord(JSON.parse(raw))
      return {
        event: 'conversation_meta',
        delta: '',
        conversation_id: meta?.conversation_id ? String(meta.conversation_id) : raw,
        request_id: meta?.request_id ? String(meta.request_id) : undefined,
      }
    } catch {
      return { event: 'conversation_meta', delta: '', conversation_id: raw }
    }
  }

  if (eventName === 'tool_start' || eventName === 'tool_end' || eventName === 'final') {
    return { event: eventName, delta: '' }
  }

  return {
    event: eventName || 'chunk',
    delta: raw.replace(/\\n/g, '\n'),
  }
}

/**
 * 原生 Fetch 自定义 SSE 流读取器
 */
export async function fetchSSE({ url, body, signal, headers, onMessage, onError, onClose }: SSEOptions) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...headers,
      },
      body: JSON.stringify(body),
      signal, // 绑定中断信号
    })

    if (!response.ok || !response.body) {
      throw new Error(`HTTP 异常: ${response.status} ${response.statusText}`)
    }

    // 获取 ReadableStream 的读取器
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = '' // 增量缓冲区，处理被跨包截断的 JSON

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        if (buffer.trim()) {
          const leftover = parseSseBlock(buffer)
          if (leftover) onMessage(leftover)
        }
        onClose?.()
        break
      }

      // 将 Uint8Array 转化为字符串并存入缓冲区
      buffer += decoder.decode(value, { stream: true })

      // SSE 协议中，消息之间以 \n\n 分隔
      const lines = buffer.split('\n\n')
      // 最后一个元素可能是不完整的帧，留在 buffer 中等待下一次 chunk 拼接
      buffer = lines.pop() || ''

      for (const block of lines) {
        if (!block.trim()) continue
        const parsedData = parseSseBlock(block)
        if (parsedData) onMessage(parsedData)
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('SSE 连接已被前端主动 Abort 中断')
    } else {
      onError?.(err)
    }
  }
}
