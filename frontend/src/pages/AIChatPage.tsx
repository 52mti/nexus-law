import React, { useState, useRef, useEffect } from 'react'
import { Avatar, Button, Layout } from 'antd'
import {
  AudioOutlined,
  SendOutlined,
  SyncOutlined,
  CopyOutlined,
  PlusOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons'

const { Content } = Layout

// 模拟的对话数据类型
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
}

export const AIChatPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  // 初始设为空数组，体验居中的空状态
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const isEmpty = messages.length === 0

  // 每次消息更新时，自动滚动到最底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // 发送消息逻辑
  const handleSend = () => {
    if (!inputValue.trim()) return

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    }

    // 模拟 AI 回复
    const newAiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: `关于“${inputValue}”的法律依据如下：\n根据《中华人民共和国消费者权益保护法》相关规定，经营者提供的商品或服务不符合质量要求的，消费者可依照国家规定或当事人约定要求退货、更换、修理等。`,
    }

    setMessages([...messages, newUserMsg, newAiMsg])
    setInputValue('')
  }

  return (
    <Content className='flex flex-col h-full bg-[#f5f6f9] relative overflow-hidden'>
      {/* ================= 1. 聊天记录区域 (仅在激活后显示) ================= */}
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
                {/* AI 头像 (左侧) */}
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
                    // 用户气泡样式
                    <div className='bg-white px-6 py-4 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 text-gray-800 text-[15px]'>
                      {msg.content}
                    </div>
                  ) : (
                    // AI 卡片样式
                    <div className='bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 p-6'>
                      <div className='text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]'>
                        {msg.content}
                      </div>
                      {/* 底部操作按钮 */}
                      <div className='flex items-center gap-4 mt-6 text-gray-400'>
                        <span className='flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-sm'>
                          <SyncOutlined /> 重新生成
                        </span>
                        <span className='flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-sm'>
                          <CopyOutlined /> 复制
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 用户头像 (右侧) */}
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

      {/* ================= 2. 输入与核心控制区域 (通过 flex 动态切换位置) ================= */}
      <div
        className={`w-full px-8 transition-all duration-500 flex flex-col ${
          isEmpty ? 'flex-1 items-center justify-center pb-30' : 'shrink-0 pt-2 pb-6'
        }`}
      >
        <div className='w-full max-w-4xl mx-auto relative'>
          {/* 空状态：居中的标题与副标题 */}
          {isEmpty && (
            <div className='text-center mb-10 animate-fade-in'>
              <h1 className='text-[28px] font-bold text-gray-800 mb-3 tracking-wider'>
                法律问题智能问答
              </h1>
              <p className='text-base text-gray-500'>你的专属智能法律小助手</p>
            </div>
          )}

          {/* 激活状态：左上角的“新建对话”按钮 */}
          {!isEmpty && (
            <div className='mb-4 animate-fade-in'>
              <Button
                shape='round'
                icon={<PlusOutlined />}
                className='bg-white/60 border-gray-200 text-gray-600 hover:bg-white transition-all shadow-sm'
                onClick={() => setMessages([])} // 清空对话，自动回到居中状态
              >
                新建对话
              </Button>
            </div>
          )}

          {/* 核心输入框：保持 DOM 节点不被销毁，实现平滑过渡 */}
          <div
            className={`relative bg-white rounded-2xl transition-all duration-300 shadow-sm ${
              isEmpty
                ? 'border border-primary h-40'
                : 'border border-transparent focus-within:border-primary h-32'
            }`}
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder='请输入您的问题或需求'
              className='w-full h-full p-4 pb-12 resize-none outline-none bg-transparent rounded-2xl text-[15px]'
            />

            {/* 右下角操作区 */}
            <div className='absolute bottom-3 right-3 flex items-center gap-4'>
              <AudioOutlined className='text-2xl text-gray-400 cursor-pointer hover:text-primary transition-colors' />
              <div
                onClick={handleSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  inputValue.trim()
                    ? 'bg-primary shadow-md shadow-indigo-500/30 hover:bg-secondary'
                    : 'bg-indigo-400 cursor-default'
                }`}
              >
                <SendOutlined className='text-white text-lg ml-0.5' />
              </div>
            </div>
          </div>

          {/* 🚀 激活状态：底部的免责声明小字 */}
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
