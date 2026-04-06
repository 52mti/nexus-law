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
import { useTranslation } from 'react-i18next'
// 引入三个接口
import { getConsultationList, getDocumentList, getComplianceReviewList } from '@/api/common'

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation()
  const { message, modal } = App.useApp()
  const [activeTab, setActiveTab] = useState('doc')

  // 🚀 1. 新增：加载状态与动态数据
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [allRecords, setAllRecords] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerLoader = React.useRef<HTMLDivElement>(null)
  const activeTabRef = React.useRef(activeTab)

  // 保持 ref 与 activeTab 同步
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  const navigate = useNavigate()

  // 顶部分类 Tabs
  const TABS = [
    { key: 'doc', label: t('qfGrHmXmhprHuKRyoa4rd') },
    { key: 'consult', label: t('3uXIGCOFJXXkYQ9s1P9VL') },
    { key: 'compliance', label: t('arNSK77_1mBHqUKeHWOI9') },
  ]

  // 建立 Tab Key 到 路由路径 的映射字典
  const tabToRouteMap: Record<string, string> = {
    doc: '/doc',
    consult: '/chat',
    compliance: '/compliance_review',
  }

  // ==========================================
  // 🚀 2. 核心数据转换引擎：把后端拉平的数据，按日期分组
  // ==========================================
  const formatHistoryData = (records: any[], tabType: string) => {
    const groups: Record<string, any[]> = {}

    records.forEach((item) => {
      // 提取日期 (假设后端返回 createTime: '2026-06-25 14:30:00')
      const fullTime = item.createTime || item.createdAt || ''
      const dateMatch = fullTime.match(/\d{4}-(\d{2}-\d{2})/)
      const dateKey = dateMatch ? dateMatch[1] : t('A0O6IpsZ2Nj7_nQ3BPCly') // 提取 '06-25'

      const timeMatch = fullTime.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/)
      const timeVal = timeMatch ? timeMatch[1] : '' // 提取 '14:30'

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }

      // 💡 架构师提示：这里需要根据你三个接口实际返回的字段名进行微调！
      // 假设这三个接口返回的 标题 和 内容 字段名不同，我们在这里做兼容适配
      let title = t('5McxCVFh594H_M21lerxL')
      let desc = item.content || item.description || item.summary || '-'
      let detail = item.content || '-'

      if (tabType === 'doc') {
        title = item.title || item.docName || t('oyui4_Zm6W2vEYCn7Gw3T')
      } else if (tabType === 'consult') {
        title = item.title || t('0e9hdITecUImJu31SL1t_')
      } else if (tabType === 'compliance') {
        title = item.fileName || item.title || t('m07xTjXME7E5pGCYXDaHd')
      }

      groups[dateKey].push({
        id: item.id,
        title: title,
        desc: desc,
        detail: detail,
        time: `${dateKey} ${timeVal}`,
        raw: item, // 保留原始数据备用
      })
    })

    // 将对象转为数组，并按日期倒序排列 (最新的日期在前面)
    const result = Object.keys(groups).map((date) => ({
      date,
      items: groups[date],
    }))

    result.sort((a, b) => b.date.localeCompare(a.date))
    return result
  }

  // ==========================================
  // 🚀 3. 核心请求逻辑：支持初始加载与分页
  // ==========================================
  const fetchData = async (pageNum: number, isInitial = false) => {
    const currentTab = activeTabRef.current // 保存本次请求对应的 Tab

    if (isInitial) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      let res: any
      const pageParams = { current: pageNum, size: 10 }

      if (currentTab === 'doc') {
        res = await getDocumentList(pageParams)
      } else if (currentTab === 'consult') {
        res = await getConsultationList(pageParams)
      } else if (currentTab === 'compliance') {
        res = await getComplianceReviewList(pageParams)
      }

      // 如果请求完成时，用户已经切走了 Tab，则丢弃结果防止数据错乱
      if (activeTabRef.current !== currentTab) return

      if (res?.successful && res?.data?.records) {
        const newRecords = res.data.records

        setAllRecords((prev) => {
          const nextRecords = isInitial ? newRecords : [...prev, ...newRecords]
          // 同步更新格式化后的数据
          setHistoryData(formatHistoryData(nextRecords, currentTab))
          return nextRecords
        })

        // 判断是否还有更多：当前页 < 总页数
        const totalPages = res.data.pages || 0
        setHasMore(pageNum < totalPages && newRecords.length > 0)
      } else {
        if (isInitial) {
          setAllRecords([])
          setHistoryData([])
        }
        setHasMore(false)
      }
    } catch (error) {
      console.error('获取历史记录异常:', error)
      message.error(t('L_0WlkIJsGCEZUj8o7H_A'))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 监听 Tab 切换，重置分页并执行初始加载
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchData(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ==========================================
  // 🚀 4. 触底加载逻辑：使用 IntersectionObserver
  // ==========================================
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchData(nextPage)
        }
      },
      { threshold: 0.1 },
    )

    if (observerLoader.current) {
      observer.observe(observerLoader.current)
    }

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, page, activeTab])

  // 核心：删除确认弹窗逻辑
  const showDeleteConfirm = (idToDelete: string) => {
    modal.confirm({
      title: t('fbqMT4NZl-MfIz4QGEGbi'),
      icon: <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />,
      content: t('zNdcQIWn8MNoeKQ9A5Sli'),
      okText: t('WO-76WTRYQln-f7RbE2Eq'),
      okType: 'danger',
      cancelText: t('_GHogb_X8_F5-Yq_WFMNL'),
      // 🚀 修改点：将 onOk 改为 async 函数，直接请求后端接口
      async onOk() {
        try {
          let res: any

          // 根据当前所在的 Tab 调用对应的删除接口，传入卡片 id
          if (activeTab === 'doc') {
            res = await deleteDoc(idToDelete)
          } else if (activeTab === 'consult') {
            res = await deleteConsultation(idToDelete)
          } else if (activeTab === 'compliance') {
            res = await deleteCompliance(idToDelete)
          }

          // 判断接口是否调用成功（这里根据你之前接口的返回结构判断）
          if (res?.successful || res?.code === 200) {
            // 接口删除成功后，执行乐观更新：同时更新原始记录和视图数据
            const updatedAllRecords = allRecords.filter((item) => item.id !== idToDelete)
            setAllRecords(updatedAllRecords)
            setHistoryData(formatHistoryData(updatedAllRecords, activeTab))

            message.success(t('MDQ6wyXpqjft7P_fmlTyw'))
          } else {
            // 后端返回业务错误
            message.error(res?.message || res?.msg || t('lo0CH49MwEZc3i9mUsNql'))
            // 返回 Promise.reject() 可以阻止弹窗自动关闭，让用户看到错误
            return Promise.reject(new Error(t('_A_kN-T1d8goEwoxu4yvj')))
          }
        } catch (error) {
          console.error('删除操作异常:', error)
          message.error(t('AAS5LSGbbw3Ad9KJJ8wBx'))
          return Promise.reject(error)
        }
      },
    })
  }

  return (
    <PageContainer>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* 🚀 4. 全局 Loading 遮罩 */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <Spin size="large" description={t('wgSsCBV0Jt0ZbR9li55C8')} />
          </div>
        )}

        {/* 1. 顶部：导航与搜索区 */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <div
                  key={tab.key}
                  onClick={() => !loading && setActiveTab(tab.key)} // 加载时禁止切换
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
            prefix={<SearchOutlined className="text-gray-400 mr-1" />}
            placeholder={t('7oX1I-LIu9ClHF7LnItCL')}
            className="w-72 h-10 rounded-lg bg-white border-transparent hover:border-transparent focus:border-primary -translate-x-px translate-y-px"
          />
        </div>

        {/* 2. 主体：时间轴 + 卡片网格 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          {/* 如果数据被删空了，给个空状态提示 */}
          {!loading && historyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FileTextOutlined className="text-6xl mb-4 text-gray-200" />
              <p>{t('pHLYbZkdJSoL0XUmj9Ct0')}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {historyData.map((group, groupIndex) => (
                <div key={group.date} className="flex relative pb-10">
                  {groupIndex !== historyData.length - 1 && (
                    <div className="absolute left-17.5 top-4 bottom-0 w-px bg-gray-200 z-0" />
                  )}

                  <div className="w-24 shrink-0 flex items-start justify-between relative z-10 pt-1 pr-5">
                    <span className="text-gray-500 text-[15px]">{group.date}</span>
                    <div className="w-1.75 h-1.75 rounded-full bg-primary mt-1.75 ring-[5px] ring-[#f9fafb]" />
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {group.items.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const basePath = tabToRouteMap[activeTab]
                          if (basePath) {
                            navigate(`${basePath}/${item.id}`)
                          }
                        }}
                        className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <FileTextOutlined className="text-primary text-lg" />
                          <span className="font-bold text-gray-800 line-clamp-1">{item.title}</span>
                        </div>

                        <div className="flex-1 mb-6">
                          <div className="text-[13px] text-gray-800 mb-2 line-clamp-1">
                            <span className="font-bold">{t('kgfGputsM1vhCEovI7twA')}</span>
                            {item.desc}
                          </div>
                          <div className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">
                            {item.detail}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-gray-400 mt-auto pt-4 border-t border-gray-50">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            <ClockCircleOutlined /> {item.time}
                          </div>
                          <DeleteOutlined
                            className="text-gray-300 hover:text-red-500 transition-colors text-base"
                            onClick={(e) => {
                              e.stopPropagation() // 阻止冒泡，避免触发卡片跳转
                              showDeleteConfirm(item.id)
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

          {/* 触底加载触发器 & 加载中动画 */}
          <div ref={observerLoader} className="py-8 flex justify-center w-full">
            {loadingMore && (
              <div className="flex flex-col items-center gap-2">
                <Spin spinning={true} />
                <p className="text-gray-400 text-xs">{t('wgSsCBV0Jt0ZbR9li55C8')}</p>
              </div>
            )}
            {!hasMore && historyData.length > 0 && (
              <p className="text-gray-300 text-xs">— {t('pHLYbZkdJSoL0XUmj9Ct0')} —</p>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default HistoryPage
