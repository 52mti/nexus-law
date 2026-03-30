import React, { useState, useEffect } from 'react'
import { Input, App, Spin } from 'antd' // 🚀 引入 Spin 用于加载动画
import {
  SearchOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { PageContainer } from '@/components/layout/PageContainer'
import { useNavigate } from 'react-router-dom'
import { deleteConsultation, deleteDoc, deleteCompliance } from '@/api/delete'

// 引入三个接口
import { getConsultationList, getDocumentList, getComplianceReviewList } from '@/api/common'

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

  // 🚀 1. 新增：加载状态与动态数据
  const [loading, setLoading] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])

  const navigate = useNavigate()

  // ==========================================
  // 🚀 2. 核心数据转换引擎：把后端拉平的数据，按日期分组
  // ==========================================
  const formatHistoryData = (records: any[], tabType: string) => {
    const groups: Record<string, any[]> = {}

    records.forEach(item => {
      // 提取日期 (假设后端返回 createTime: '2026-06-25 14:30:00')
      const fullTime = item.createTime || item.createdAt || ''
      const dateMatch = fullTime.match(/\d{4}-(\d{2}-\d{2})/)
      const dateKey = dateMatch ? dateMatch[1] : '未知时间' // 提取 '06-25'

      const timeMatch = fullTime.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/)
      const timeVal = timeMatch ? timeMatch[1] : '' // 提取 '14:30'

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }

      // 💡 架构师提示：这里需要根据你三个接口实际返回的字段名进行微调！
      // 假设这三个接口返回的 标题 和 内容 字段名不同，我们在这里做兼容适配
      let title = '历史记录'
      let desc = item.content || item.description || item.summary || '-'
      let detail = item.content || '-'

      if (tabType === 'doc') {
        title = item.title || item.docName || '法律文书生成'
      } else if (tabType === 'consult') {
        title = item.title || '智能法律咨询'
      } else if (tabType === 'compliance') {
        title = item.fileName || item.title || '合同合规审查'
      }

      groups[dateKey].push({
        id: item.id,
        title: title,
        desc: desc,
        detail: detail,
        time: `${dateKey} ${timeVal}`,
        raw: item // 保留原始数据备用
      })
    })

    // 将对象转为数组，并按日期倒序排列 (最新的日期在前面)
    const result = Object.keys(groups).map(date => ({
      date,
      items: groups[date]
    }))

    result.sort((a, b) => b.date.localeCompare(a.date))
    return result
  }

  // ==========================================
  // 🚀 3. 监听 activeTab 变化，请求对应接口
  // ==========================================
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        let res: any;
        const pageParams = { current: 1, size: 50 }; // 获取最近的 50 条记录

        // 根据当前的 Tab 调用不同的 API
        if (activeTab === 'doc') {
          res = await getDocumentList(pageParams)
        } else if (activeTab === 'consult') {
          res = await getConsultationList(pageParams)
        } else if (activeTab === 'compliance') {
          res = await getComplianceReviewList(pageParams)
        }

        if (res?.successful && res?.data?.records) {
          // 清洗数据并赋值
          const formattedData = formatHistoryData(res.data.records, activeTab)
          setHistoryData(formattedData)
        } else {
          setHistoryData([])
        }
      } catch (error) {
        console.error('获取历史记录异常:', error)
        message.error('无法获取历史记录')
        setHistoryData([])
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [activeTab, message]) // 当 activeTab 变化时，重新触发请求

  // 核心：删除确认弹窗逻辑
  const showDeleteConfirm = (idToDelete: string) => {
    modal.confirm({
      title: '确定要删除这条历史记录吗？',
      icon: <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />,
      content: '删除后将无法恢复，相关文书数据将一并清理。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      // 🚀 修改点：将 onOk 改为 async 函数，直接请求后端接口
      async onOk() {
        try {
          let res: any;

          // 根据当前所在的 Tab 调用对应的删除接口，传入卡片 id
          if (activeTab === 'doc') {
            res = await deleteDoc(idToDelete);
          } else if (activeTab === 'consult') {
            res = await deleteConsultation(idToDelete);
          } else if (activeTab === 'compliance') {
            res = await deleteCompliance(idToDelete);
          }

          // 判断接口是否调用成功（这里根据你之前接口的返回结构判断）
          if (res?.successful || res?.code === 200) {
            // 接口删除成功后，执行乐观更新：直接在前端状态中移除该项
            const newData = historyData
              .map(group => ({
                ...group,
                items: group.items.filter((item: any) => item.id !== idToDelete)
              }))
              .filter(group => group.items.length > 0); // 如果某一天的数据都被删光了，就把这一天也过滤掉

            setHistoryData(newData);
            message.success('删除成功');
          } else {
            // 后端返回业务错误
            message.error(res?.message || res?.msg || '删除失败，请稍后重试');
            // 返回 Promise.reject() 可以阻止弹窗自动关闭，让用户看到错误
            return Promise.reject(new Error('删除失败'));
          }
        } catch (error) {
          console.error('删除操作异常:', error);
          message.error('网络异常，删除失败');
          return Promise.reject(error);
        }
      },
    })
  }

  return (
    <PageContainer>
      <div className='flex-1 flex flex-col overflow-hidden relative'>

        {/* 🚀 4. 全局 Loading 遮罩 */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <Spin size="large" tip="正在加载历史记录..." />
          </div>
        )}

        {/* 1. 顶部：导航与搜索区 */}
        <div className='flex justify-between items-center mb-8 shrink-0'>
          <div className='flex items-center gap-2'>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <div
                  key={tab.key}
                  onClick={() => !loading && setActiveTab(tab.key)} // 加载时禁止切换
                  className={`px-5 py-2 rounded-full text-[14px] cursor-pointer transition-all ${isActive
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
            className='w-72 h-10 rounded-lg bg-white border-transparent hover:border-transparent focus:border-primary -translate-x-px translate-y-px'
          />
        </div>

        {/* 2. 主体：时间轴 + 卡片网格 */}
        <div className='flex-1 overflow-y-auto custom-scrollbar pr-4'>
          {/* 如果数据被删空了，给个空状态提示 */}
          {!loading && historyData.length === 0 ? (
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
                    {group.items.map((item: any) => (
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
                          <span className='font-bold text-gray-800 line-clamp-1'>
                            {item.title}
                          </span>
                        </div>

                        <div className='flex-1 mb-6'>
                          <div className='text-[13px] text-gray-800 mb-2 line-clamp-1'>
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
                              showDeleteConfirm(item.id);
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