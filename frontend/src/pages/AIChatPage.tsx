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
// 🚀 1. 移除了 saveOrUpdateConsultation
import { saveOrUpdateConsultationSession, getConsultationHistory, saveOrUpdateConsultation } from '@/api/chat'

const { Content } = Layout

// 对话数据类型
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
}

export const AIChatPage = () => {
  const { message } = App.useApp()
  // 获取 URL 路由参数
  const { id } = useParams<{ id: string }>()
  const sessionId = id;
  const navigate = useNavigate()

  // 由于流式请求和保存接口使用了 history.replaceState 静默更新URL，
  // 导致 useParams 无法感知最新 sessionId，因此使用 useRef 保存实际的 activeSessionId
  const activeSessionIdRef = useRef<string | undefined>(sessionId)
  useEffect(() => {
    activeSessionIdRef.current = sessionId
  }, [sessionId])

  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 阻止发散：拦截创建新对话时被动触发的历史纪录强刷
  const isNavigatingRef = useRef(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  // 如果路径上有 sessionId，说明是已有对话哪怕此时刚刷新还没拿到数据，也不应该展示首次中间居中的 UI
  const isEmpty = messages.length === 0 && !sessionId

  // 请求真实历史记录（仅打印不渲染）
  const loadChatHistory = useCallback(async (sessionId: string) => {
    console.log('🚗 开始请求历史记录, sessionId:', sessionId)
    setLoadingHistory(true)
    try {
      const res = await getConsultationHistory(sessionId)
      console.log('====== 历史聊天记录接口返回数据 ======', res)

      const records = res?.data?.records || []
      // 后端默认按时间倒序（最新的在最前），前端聊天流需要顺序展示（最旧的在最前）
      const historyMessages = records
        .map((item: any) => ({
          id: item.id || Date.now().toString() + Math.random(),
          role: item.type === 0 ? 'user' : 'ai',
          content: item.content || ''
        }))
        .reverse()

      setMessages(historyMessages)
    } catch (error) {
      console.error(error)
      message.error('拉取历史记录失败')
    } finally {
      setLoadingHistory(false)
    }
  }, [message])

  // 监听路由变化，加载历史记录
  useEffect(() => {
    console.log('🧐 useEffect 侦测到路由变动, 当前的 sessionId =', sessionId);
    if (!sessionId) {
      setMessages([])
      return
    }

    // ⭐ 核心修复：如果是自己在聊天组件内部发起的 navigate，拦截这里的强刷
    if (isNavigatingRef.current) {
      console.log('拦截一次历史记录拉取（因为是自己产生的 sessionId）');
      isNavigatingRef.current = false; // 消费掉标记
      return;
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
    activeSessionIdRef.current = undefined // 清空当前会话ID引用
    navigate('/chat') // 清空路由参数，回到纯净状态
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
      let currentSessionId = activeSessionIdRef.current;
      let aiFullResponse = '';

      try {
        // 🚀 2. 如果是完全新的对话，前端直接生成 UUID 作为 Session ID
        if (!currentSessionId) {
          // 现代浏览器原生支持 crypto.randomUUID()
          currentSessionId = crypto.randomUUID();
          activeSessionIdRef.current = currentSessionId; // 及时更新全局

          saveOrUpdateConsultation({
            id: currentSessionId,
            content: userText
          });

          isNavigatingRef.current = true; // 拦截 useEffect 强刷
          navigate(`/chat/${currentSessionId}`, { replace: true });
        }

        // 🚀 3. 直接保存用户的提问内容（type 0 为用户）
        await saveOrUpdateConsultationSession({
          consultationId: currentSessionId,
          content: userText,
          type: 0
        });
      } catch (err) {
        console.error('保存用户提问失败', err);
        message.warning('无法同步您的对话到历史记录');
      }

      // 4. 开始向后端大模型请求流式返回
      const token = localStorage.getItem('token');
      await fetchEventSource(`${import.meta.env.VITE_API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        openWhenHidden: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: [...messages, newUserMsg].slice(-6).map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.content
          })),
          sessionId: currentSessionId // 将前端确定的 ID 传给后端
        }),

        onmessage(ev) {
          // （如果后端依然会发回 session_id 事件，这里做个兜底，但通常不再需要了）
          if (ev.event === 'session_id') {
            const newSessionId = ev.data;
            if (!activeSessionIdRef.current) {
              activeSessionIdRef.current = newSessionId;
              isNavigatingRef.current = true;
              navigate(`/chat/${newSessionId}`, { replace: true });
            }
            return;
          }

          // 正常文本流处理
          const content = ev.data;
          if (!content) return;

          const parsedContent = content.replace(/\\n/g, '\n');
          aiFullResponse += parsedContent; // 实时累积 AI 发出的话

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMsgId) {
                return { ...msg, content: msg.content + parsedContent };
              }
              return msg;
            })
          );
        },

        onclose() {
          // 🚀 5. 流正常结束时，保存 AI 的完整回复（type 1 为 AI）
          if (currentSessionId && aiFullResponse.trim()) {
            saveOrUpdateConsultationSession({
              consultationId: currentSessionId,
              content: aiFullResponse,
              type: 1
            }).catch(err => console.error('保存 AI 回复记录失败', err));
          }
          setIsStreaming(false);
          throw new Error('STOP_RETRY');
        },

        onerror(err) {
          if (err.message === 'STOP_RETRY') {
            throw err;
          }
          console.error('流式输出中断:', err);
          message.error('网络连接异常，AI 回复中断');
          setIsStreaming(false);
          throw err;
        },
      });
    } catch (error) {
      console.error(error)
      setIsStreaming(false);
    }
  }

  const handleResend = () => {
    // 这里可以后续实现重新生成的逻辑
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      message.success('复制成功');
    });
  };

  return (
    <Content className='flex flex-col h-full bg-[#f5f6f9] relative overflow-hidden'>
      {/* 历史记录加载动画遮罩 */}
      {loadingHistory && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f5f6f9]/80 backdrop-blur-sm">
          <Spin size="large" description="正在同步历史记录..." />
        </div>
      )}

      {/* ================= 1. 聊天记录区域 ================= */}
      {!isEmpty && (
        <div
          ref={chatContainerRef}
          className='flex-1 overflow-y-auto p-8 scroll-smooth'
        >
          <div className='max-w-4xl mx-auto space-y-8 animate-fade-in pb-4'>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI 头像 */}
                {msg.role === 'ai' && (
                  <div className='w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1'>
                    <RobotOutlined className='text-primary text-xl' />
                  </div>
                )}

                {/* 消息气泡 */}
                <div
                  className={`max-w-[85%] ${msg.role === 'user' ? 'flex justify-end' : 'w-full'}`}
                >
                  {msg.role === 'user' ? (
                    <div className='bg-white px-6 py-4 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 text-gray-800 text-[15px]'>
                      {msg.content}
                    </div>
                  ) : (
                    <div className='bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 p-6'>
                      <div className='text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]'>
                        {msg.content}
                        {isStreaming && msg.content === '' && (
                          <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                        )}
                      </div>
                      <div className='flex items-center gap-4 mt-6 text-gray-400'>
                        {!isStreaming && (
                          <>
                            <span className='flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-sm'>
                              <SyncOutlined onClick={handleResend} /> 重新生成
                            </span>
                            <span
                              className='flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-sm'
                              onClick={() => handleCopy(msg.content)}
                            >
                              <CopyOutlined /> 复制
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 用户头像 */}
                {msg.role === 'user' && (
                  <Avatar
                    size={36}
                    icon={<UserOutlined />}
                    className='bg-primary mt-1 shrink-0'
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 2. 输入与核心控制区域 ================= */}
      <div
        className={`w-full px-8 transition-all duration-500 flex flex-col ${isEmpty ? 'flex-1 items-center justify-center pb-30' : 'shrink-0 pt-2 pb-6'
          }`}
      >
        <div className='w-full max-w-4xl mx-auto relative'>
          {isEmpty && (
            <div className='text-center mb-10 animate-fade-in'>
              <h1 className='text-[28px] font-bold text-gray-800 mb-3 tracking-wider'>
                法律问题智能问答
              </h1>
              <p className='text-base text-gray-500'>你的专属智能法律小助手</p>
            </div>
          )}

          {!isEmpty && (
            <div className='mb-4 animate-fade-in'>
              <Button
                shape='round'
                icon={<PlusOutlined />}
                disabled={isStreaming}
                className='bg-white/60 border-gray-200 text-gray-600 hover:bg-white transition-all shadow-sm'
                onClick={handleNewChat}
              >
                新建对话
              </Button>
            </div>
          )}

          <div
            className={`relative bg-white rounded-2xl transition-all duration-300 shadow-sm ${isEmpty
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
              placeholder={isStreaming ? 'AI 正在思考并回答中...' : '请输入您的问题或需求'}
              className={`w-full h-full p-4 pb-12 resize-none outline-none bg-transparent rounded-2xl text-[15px] ${isStreaming ? 'cursor-not-allowed' : ''}`}
            />

            <div className='absolute bottom-3 right-3 flex items-center gap-4'>
              <AudioOutlined
                className={`text-2xl transition-colors ${isStreaming ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 cursor-pointer hover:text-primary'
                  }`}
              />
              <div
                onClick={handleSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${inputValue.trim() && !isStreaming
                  ? 'bg-primary shadow-md shadow-indigo-500/30 hover:bg-secondary'
                  : 'bg-indigo-400 cursor-not-allowed'
                  }`}
              >
                {isStreaming ? (
                  <SyncOutlined spin className='text-white scale-125' />
                ) : (
                  <SendOutlined className='text-white text-lg ml-0.5' />
                )}
              </div>
            </div>
          </div>

          {!isEmpty && (
            <div className='text-center text-[12px] text-gray-400 mt-4 animate-fade-in tracking-wide'>
              所有内容均由人工智能模型生成，其生成内容的准确性和完整性无法保证
            </div>
          )}
        </div>
      </div>
    </Content>
  )
}

export default AIChatPage