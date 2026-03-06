import React, { useState } from 'react'
import { Avatar, Badge, Button, Layout, Menu } from 'antd'
import {
  MessageOutlined,
  FileTextOutlined,
  SearchOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  CrownOutlined,
  PayCircleOutlined,
  AudioOutlined,
  SendOutlined,
  SyncOutlined,
  CopyOutlined,
  PlusOutlined,
} from '@ant-design/icons'

const { Sider, Content, Header } = Layout

// 模拟的对话数据类型
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
}

export const AIChatPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  // 默认填充一张原型图中的高保真数据，如果清空数组则显示最后一张图的空状态
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      content: `法律依据
根据《中华人民共和国消费者权益保护法》第二十四条，经营者提供的商品或服务不符合质量要求的，消费者可依照国家规定或当事人约定要求退货、更换、修理等。若经营者拒绝，消费者可通过法律途径解决。

维权步骤
保留证据：保存订单截图、支付记录、商品瑕疵照片/视频、与卖家的沟通记录等。
联系卖家：通过平台投诉渠道要求退货、换货或维修，并明确要求承担运费（若因质量问题导致）。
申请平台介入：若卖家拒绝，向电商平台（如淘宝、京东）提交投诉，平台通常会在7个工作日内处理。
向监管部门投诉：若平台未解决，可向当地消费者协会（12315）或市场监管部门投诉。
法律诉讼：若损失较大（如商品价值高或造成人身伤害），可向法院起诉，要求赔偿损失。

注意事项
网购商品适用“七天无理由退货”规则（定制商品、鲜活易腐品等除外），但质量问题不受此期限限制。
若卖家存在欺诈行为（如售假），可依据《消费者权益保护法》第五十五条要求“退一赔三”，最低赔偿500元。总结FaceTime新增的“裸露行为检测”功能，是苹果在隐私保护与道德责任之间寻求平衡的一次尝试。尽管该功能在保护未成年人安全方面具有重要意义，但其对成年用户的扩展也引发了隐私和误判的争议。未来，苹果需要进一步优化算法并明确功能边界，以平衡安全性与用户隐私的需求。`,
    },
  ])

  // 发送消息逻辑
  const handleSend = () => {
    if (!inputValue.trim()) return
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    }
    setMessages([...messages, newMessage])
    setInputValue('')
  }

  // 侧边栏菜单配置
  const menuItems = [
    { key: 'chat', icon: <MessageOutlined />, label: '法律咨询' },
    { key: 'doc', icon: <FileTextOutlined />, label: '文书生成' },
    { key: 'search', icon: <SearchOutlined />, label: '条文检索' },
    { key: 'case_梳理', icon: <ProfileOutlined />, label: '案件快梳' },
    {
      key: 'compliance',
      icon: <SafetyCertificateOutlined />,
      label: '合规审查',
    },
    { key: 'case_search', icon: <FolderOpenOutlined />, label: '案例搜索' },
    { type: 'divider' },
    { key: 'g_other', type: 'group', label: '其它' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
    { key: 'vip', icon: <CrownOutlined />, label: '会员方案' },
    { key: 'order', icon: <FileTextOutlined />, label: '订单管理' },
    { key: 'points', icon: <PayCircleOutlined />, label: '积分记录' },
  ]

  return (
    <Content className='flex flex-col relative overflow-hidden'>
      {/* 对话列表区域 (如果为空，则不显示，转而显示居中空状态) */}
      <div className='flex-1 overflow-y-auto p-8 pb-32'>
        {messages.length === 0 ? (
          // 空状态：原型图最后一张的居中大标题
          <div className='h-full flex flex-col items-center justify-center animate-fade-in'>
            <h1 className='text-[28px] font-bold text-gray-800 mb-3 tracking-wider'>
              法律问题智能问答
            </h1>
            <p className='text-base text-gray-500 mb-10'>
              你的专属智能法律小助手
            </p>
          </div>
        ) : (
          // 活跃状态：聊天记录
          <div className='max-w-4xl mx-auto space-y-6 animate-fade-in'>
            {messages.map((msg) => (
              <div key={msg.id} className='flex justify-start'>
                {/* AI 回复卡片 */}
                {msg.role === 'ai' && (
                  <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full relative'>
                    <div className='text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]'>
                      {msg.content}
                    </div>
                    {/* 底部操作按钮 */}
                    <div className='flex items-center gap-4 mt-6 text-gray-400'>
                      <span className='flex items-center gap-1.5 cursor-pointer hover:text-[#666cff] transition-colors text-sm'>
                        <SyncOutlined /> 重新生成
                      </span>
                      <span className='flex items-center gap-1.5 cursor-pointer hover:text-[#666cff] transition-colors text-sm'>
                        <CopyOutlined /> 复制
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部输入区域：绝对定位固定在底部 */}
      <div className='absolute bottom-0 w-full bg-gradient-to-t from-[#f5f6f9] via-[#f5f6f9] to-transparent pt-10 pb-8 px-8'>
        <div className='max-w-4xl mx-auto'>
          {/* 新建对话按钮 (仅在有对话时显示) */}
          {messages.length > 0 && (
            <div className='mb-4'>
              <Button
                shape='round'
                icon={<PlusOutlined />}
                className='bg-gray-200/60 border-none text-gray-600 hover:bg-gray-200'
                onClick={() => setMessages([])} // 点击清空进入空状态
              >
                新建对话
              </Button>
            </div>
          )}

          {/* 核心输入框 (还原原型图的高亮紫边 textarea) */}
          <div
            className={`relative bg-white rounded-2xl transition-all shadow-sm ${
              messages.length === 0
                ? 'border border-[#666cff] h-40'
                : 'border border-transparent focus-within:border-[#666cff] h-32'
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
              <AudioOutlined className='text-2xl text-gray-400 cursor-pointer hover:text-[#666cff] transition-colors' />
              <div
                onClick={handleSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  inputValue.trim()
                    ? 'bg-[#666cff] shadow-md shadow-indigo-500/30 hover:bg-[#585ee6]'
                    : 'bg-indigo-400 cursor-default'
                }`}
              >
                <SendOutlined className='text-white text-lg ml-0.5' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Content>
  )
}

export default AIChatPage
