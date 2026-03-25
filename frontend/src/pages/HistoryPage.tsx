import React, { useState } from 'react'
import { Input, Modal, App } from 'antd' // 🚀 1. 引入 Modal 和 message
import {
  SearchOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleFilled, // 🚀 引入警告图标用于弹窗
} from '@ant-design/icons'
import { PageContainer } from '@/components/layout/PageContainer'
import { useNavigate } from 'react-router-dom'

// ==========================================
// 1. 模拟数据 (我们将它作为初始状态)
// ==========================================
const initialMockData = [
  {
    date: '06-25',
    items: [
      { id: '1', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '2', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '3', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '4', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '5', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '6', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘...', time: '06-25 2:00' },
    ],
  },
  {
    date: '06-22',
    items: [
      { id: '7', title: '民事合同-房屋租赁', desc: '租客违约，要求退租', detail: '相关租赁合同纠纷细节...', time: '06-22 3:00' },
      { id: '8', title: '民事合同-房屋租赁', desc: '租客违约，要求退租', detail: '相关租赁合同纠纷细节...', time: '06-22 3:00' },
    ],
  },
]

// 顶部分类 Tabs
const TABS = [
  { key: 'doc', label: '文书记录' },
  { key: 'consult', label: '咨询记录' },
  { key: 'compliance', label: '合规审查' },
]

// 建立 Tab Key 到 路由路径 的映射字典
const tabToRouteMap: Record<string, string> = {
  doc: '/doc',
  consult: '/chat',
  compliance: '/compliance',
}

export const HistoryPage: React.FC = () => {
  const { message, modal } = App.useApp()
  const [activeTab, setActiveTab] = useState('doc')
  // 🚀 2. 将静态数据转为状态，这样删除后才能触发页面重新渲染
  const [historyData, setHistoryData] = useState(initialMockData) 
  const navigate = useNavigate()

  // 🚀 3. 核心：删除确认弹窗逻辑
  const showDeleteConfirm = (idToDelete: string) => {
    modal.confirm({
      title: '确定要删除这条历史记录吗？',
      icon: <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />,
      content: '删除后将无法恢复，相关文书数据将一并清理。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        return new Promise((resolve) => {
          setTimeout(() => {
            const newData = historyData
              .map(group => ({
                ...group,
                items: group.items.filter(item => item.id !== idToDelete)
              }))
              .filter(group => group.items.length > 0);
            
            setHistoryData(newData);
            
            // 🚀 3. 使用 hooks 实例的 message 方法
            message.success('删除成功'); 
            resolve(true);
          }, 500); 
        });
      },
      onCancel() {
        console.log('取消删除');
      },
    });
  };

  return (
    <PageContainer>
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* 1. 顶部：导航与搜索区 */}
        <div className='flex justify-between items-center mb-8 shrink-0'>
          <div className='flex items-center gap-2'>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <div
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2 rounded-full text-[14px] cursor-pointer transition-all ${
                    isActive
                      ? 'bg-primary text-white font-medium shadow-md shadow-indigo-500/20'
                      : 'text-gray-600 hover:bg-gray-200/50'
                  }`}
                >
                  {tab.label}
                </div>
              )
            })}
          </div>

          <Input
            prefix={<SearchOutlined className='text-gray-400 mr-1' />}
            placeholder='搜索历史记录'
            className='w-72 h-10 rounded-lg bg-white border-transparent hover:border-transparent focus:border-primary '
          />
        </div>

        {/* 2. 主体：时间轴 + 卡片网格 */}
        <div className='flex-1 overflow-y-auto custom-scrollbar pr-4'>
          {/* 🚀 如果数据被删空了，给个空状态提示 */}
          {historyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FileTextOutlined className="text-6xl mb-4 text-gray-200" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className='flex flex-col'>
              {historyData.map((group, groupIndex) => (
                <div key={group.date} className='flex relative pb-10'>
                  {groupIndex !== historyData.length - 1 && (
                    <div className='absolute left-17.5 top-4 bottom-0 w-px bg-gray-200 z-0' />
                  )}

                  <div className='w-24 shrink-0 flex items-start justify-between relative z-10 pt-1 pr-5'>
                    <span className='text-gray-500 text-[15px]'>
                      {group.date}
                    </span>
                    <div className='w-1.75 h-1.75 rounded-full bg-primary mt-1.75 ring-[5px] ring-[#f9fafb]' />
                  </div>

                  <div className='flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const basePath = tabToRouteMap[activeTab]
                          if (basePath) {
                            navigate(`${basePath}/${item.id}`)
                          }
                        }}
                        className='bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer'
                      >
                        <div className='flex items-center gap-2 mb-3'>
                          <FileTextOutlined className='text-primary text-lg' />
                          <span className='font-bold text-gray-800'>
                            {item.title}
                          </span>
                        </div>

                        <div className='flex-1 mb-6'>
                          <div className='text-[13px] text-gray-800 mb-2'>
                            <span className='font-bold'>内容描述：</span>
                            {item.desc}
                          </div>
                          <div className='text-[13px] text-gray-500 leading-relaxed line-clamp-3'>
                            {item.detail}
                          </div>
                        </div>

                        <div className='flex items-center justify-between text-gray-400 mt-auto pt-4 border-t border-gray-50'>
                          <div className='flex items-center gap-1.5 text-[12px]'>
                            <ClockCircleOutlined /> {item.time}
                          </div>
                          <DeleteOutlined
                            className='text-gray-300 hover:text-red-500 transition-colors text-base'
                            onClick={(e) => {
                              e.stopPropagation(); // 阻止冒泡，避免触发卡片跳转
                              showDeleteConfirm(item.id); // 🚀 4. 调用弹窗函数
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

export default HistoryPage