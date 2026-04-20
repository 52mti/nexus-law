import { useState, useRef, useEffect, useCallback } from 'react'
import { Avatar, Button, Layout, Spin, App } from 'antd'
import {
  AudioOutlined,
  SendOutlined,
  SyncOutlined,
  CopyOutlined,
  PlusOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getConsultationHistory } from '@/api/chat'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const { Content } = Layout

// 对话数据类型
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
}

export const AIChatPage = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  // 获取 URL 路由参数
  const { id } = useParams<{ id: string }>()
  const sessionId = id
  const navigate = useNavigate()

  // 使用 useRef 保存实际的 activeSessionId，以在流式请求中同步更新
  const activeSessionIdRef = useRef<string | undefined>(sessionId)
  useEffect(() => {
    activeSessionIdRef.current = sessionId
  }, [sessionId])

  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 标记是否为内部导航，防止重复加载历史记录
  const isNavigatingRef = useRef(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // 如果路径上有 sessionId，说明是已有对话，不展示首次居中 UI
  const isEmpty = messages.length === 0 && !sessionId

  // 加载历史记录
  const loadChatHistory = useCallback(
    async (sessionId: string) => {
      setLoadingHistory(true)
      try {
        const res = await getConsultationHistory(sessionId)
        const records = res?.data || []
        
        // 转换 Dify 格式为前端展示格式
        const historyMessages = records.flatMap((item: any) => [
          {
            id: item.id + '_user',
            role: 'user',
            content: item.query,
          },
          {
            id: item.id + '_ai',
            role: 'ai',
            content: item.answer,
          },
        ])

        setMessages(historyMessages)
      } catch (error) {
        console.error('加载历史记录失败:', error)
        message.error(t('3C2NIj12xCevPmtyzZwZL'))
      } finally {
        setLoadingHistory(false)
      }
    },
    [message, t],
  )

  // 监听路由变化，加载历史记录
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }

    if (isNavigatingRef.current) {
      isNavigatingRef.current = false // 消费掉标记
      return
    }

    loadChatHistory(sessionId)
  }, [sessionId, loadChatHistory])

  // 每次消息更新时，自动滚动到最底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // 新建对话
  const handleNewChat = () => {
    setMessages([])
    setIsStreaming(false)
    activeSessionIdRef.current = undefined
    navigate('/chat')
  }

  // 核心：发送消息并接收流
  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return

    const userText = inputValue
    const userMsgId = Date.now().toString()
    const aiMsgId = (Date.now() + 1).toString()

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
    }
    const emptyAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'ai',
      content: '',
    }

    setInputValue('')
    setMessages((prev) => [...prev, newUserMsg, emptyAiMsg])
    setIsStreaming(true)

    try {
      let currentSessionId = activeSessionIdRef.current
      const token = localStorage.getItem('token')

      await fetchEventSource(`${import.meta.env.VITE_API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        openWhenHidden: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: userText,
          sessionId: currentSessionId,
        }),

        onmessage(ev) {
          // 🚀 接收后端生成的新 sessionId 并回填到 URL
          if (ev.event === 'session_id') {
            const newId = ev.data
            if (!activeSessionIdRef.current) {
              activeSessionIdRef.current = newId
              isNavigatingRef.current = true
              navigate(`/chat/${newId}`, { replace: true })
            }
            return
          }

          // 正常文本流处理
          let data = ev.data
          if (!data) return

          const parsedContent = data.replace(/\\n/g, '\n')

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMsgId) {
                return { ...msg, content: msg.content + parsedContent }
              }
              return msg
            }),
          )
        },

        onclose() {
          // 注意：此处不再手动调用保存提问/回答的接口，由 Dify 端处理持久化
          setIsStreaming(false)
          throw new Error('STOP_RETRY')
        },

        onerror(err) {
          if (err.message === 'STOP_RETRY') {
            throw err
          }
          console.error('流式输出中断:', err)
          message.error(t('pR5PPuOZ-nttTh54MM61X'))
          setIsStreaming(false)
          throw err
        },
      })
    } catch (error) {
      console.error(error)
      setIsStreaming(false)
    }
  }

  const handleResend = () => {
    // 这里可以后续实现重新生成的逻辑
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      message.success(t('Un10bKsoL0mVYYwo8YsAL'))
    })
  }

  return (
    <Content className="flex flex-col h-full bg-[#f5f6f9] relative overflow-hidden">
      {/* 历史记录加载动画遮罩 */}
      {loadingHistory && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f5f6f9]/80 backdrop-blur-sm">
          <Spin size="large" description={t('JpaI47UfcXIj686504RyN')} />
        </div>
      )}

      {/* ================= 1. 聊天记录区域 ================= */}
      {!isEmpty && (
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI 头像 */}
                {msg.role === 'ai' && (
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                    <RobotOutlined className="text-primary text-xl" />
                  </div>
                )}

                {/* 消息气泡 */}
                <div
                  className={`max-w-[85%] ${msg.role === 'user' ? 'flex justify-end' : 'w-full'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="bg-white px-6 py-4 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 text-gray-800 text-[15px]">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 p-6">
                      <div className="prose prose-slate max-w-none text-gray-700 leading-relaxed text-[15px] break-words overflow-x-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content + (isStreaming && msg.id === messages[messages.length - 1].id ? ' ▎' : '')}
                        </ReactMarkdown>
                        {isStreaming && msg.content === '' && (
                          <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-6 text-gray-400">
                        {!isStreaming && (
                          <>
                            <span className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-sm">
                              <SyncOutlined onClick={handleResend} /> {t('1uuruWmc27wCV-iBY3Uh6')}
                            </span>
                            <span
                              className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-sm"
                              onClick={() => handleCopy(msg.content)}
                            >
                              <CopyOutlined /> {t('XgXC4-p2h_nCpQBgD9bma')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 用户头像 */}
                {msg.role === 'user' && (
                  <Avatar size={36} icon={<UserOutlined />} className="bg-primary mt-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 2. 输入与核心控制区域 ================= */}
      <div
        className={`w-full px-8 transition-all duration-500 flex flex-col ${
          isEmpty ? 'flex-1 items-center justify-center pb-30' : 'shrink-0 pt-2 pb-6'
        }`}
      >
        <div className="w-full max-w-4xl mx-auto relative">
          {isEmpty && (
            <div className="text-center mb-10 animate-fade-in">
              <h1 className="text-[28px] font-bold text-gray-800 mb-3 tracking-wider">
                {t('7wxxUzdOZ5afzuT5Qq3Pk')}{' '}
              </h1>
              <p className="text-base text-gray-500">{t('BAZrn84y7bJqZdudEEU0A')}</p>
            </div>
          )}

          {!isEmpty && (
            <div className="mb-4 animate-fade-in">
              <Button
                shape="round"
                icon={<PlusOutlined />}
                disabled={isStreaming}
                className="bg-white/60 border-gray-200 text-gray-600 hover:bg-white transition-all shadow-sm"
                onClick={handleNewChat}
              >
                {t('_UWbNL6-YX--61ut9d5xn')}{' '}
              </Button>
            </div>
          )}

          <div
            className={`relative bg-white rounded-2xl transition-all duration-300 shadow-sm ${
              isEmpty
                ? 'border border-primary h-40'
                : 'border border-transparent focus-within:border-primary h-32'
            } ${isStreaming ? 'opacity-70' : ''}`}
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isStreaming}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!isStreaming) {
                    handleSend()
                  }
                }
              }}
              placeholder={isStreaming ? t('lxLlCb3xZMrxKR5pEkFfj') : t('ZRqISwfsItag5j6jnkXZN')}
              className={`w-full h-full p-4 pb-12 resize-none outline-none bg-transparent rounded-2xl text-[15px] ${isStreaming ? 'cursor-not-allowed' : ''}`}
            />

            <div className="absolute bottom-3 right-3 flex items-center gap-4">
              <AudioOutlined
                className={`text-2xl transition-colors ${
                  isStreaming
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 cursor-pointer hover:text-primary'
                }`}
              />
              <div
                onClick={handleSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  inputValue.trim() && !isStreaming
                    ? 'bg-primary shadow-md shadow-indigo-500/30 hover:bg-secondary'
                    : 'bg-indigo-400 cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <SyncOutlined spin className="text-white scale-125" />
                ) : (
                  <SendOutlined className="text-white text-lg ml-0.5" />
                )}
              </div>
            </div>
          </div>

          {!isEmpty && (
            <div className="text-center text-[12px] text-gray-400 mt-4 animate-fade-in tracking-wide">
              {t('lnbOXxiqcEnYcSpxC_Qyi')}{' '}
            </div>
          )}
        </div>
      </div>
    </Content>
  )
}

export default AIChatPage
