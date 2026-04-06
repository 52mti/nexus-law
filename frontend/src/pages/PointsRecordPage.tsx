import React, { useState, useEffect } from 'react'
import { Pagination, App, Spin } from 'antd'
import { ProfileOutlined, InboxOutlined } from '@ant-design/icons'
import Copiright from '@/components/Copiright'
import { PageContainer } from '@/components/layout/PageContainer'
import { getPointsHistory } from '@/api/common'
import { useTranslation } from 'react-i18next'
import { useSettingStore } from '@/store/useSettingStore'
// ==========================================
// 1. 类型定义
// ==========================================
interface PointRecord {
  id: string
  title: string
  time: string
  change: string
  remaining: string
}

// ==========================================
// 2. 页面主组件
// ==========================================
export const PointsRecordPage: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()

  // 🚀 状态管理
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<PointRecord[]>([])

  // 分页状态
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // 🚀 获取列表数据
  useEffect(() => {
    const fetchPointsHistory = async () => {
      setLoading(true)
      try {
        // 请求参数：当前页、每页条数
        const res = await getPointsHistory({ current, size: pageSize })

        if (res?.successful && res?.data) {
          const rawRecords = res.data.records || []

          // 将后端原始数据映射为前端 UI 需要的格式
          const formattedRecords: PointRecord[] = rawRecords.map((item: any) => {
            // 处理时间格式，例如 "2026-03-30T15:42:06.421Z" -> "2026-03-30 15:42"
            let formattedTime = item.createTime || '-'
            if (formattedTime.includes('T')) {
              formattedTime = formattedTime.replace('T', ' ').substring(0, 16)
            }

            // 处理变动数字（正数加 + 号）
            const countNum = Number(item.count) || 0
            const changeStr = countNum > 0 ? `+${countNum}` : `${countNum}`

            // 1. 提取后端返回的业务 Code
            const typeCode = item.pointsType

            // 2. 💡 使用 .getState() 可以直接在普通函数/useEffect中同步读取最新状态，不会引发重渲染和依赖报警
            // 找到对应的字典项，并提取它的 name 属性（如 "合规审查消耗积分"）
            const settingItem = useSettingStore.getState().settings.find((s) => s.code === typeCode)

            return {
              id: item.id,
              title: settingItem?.name || typeCode || t('2bNr1yJPkqOHiooJmsKHs'),
              time: formattedTime,
              change: changeStr,
              remaining: String(item.restCount || 0),
            }
          })

          setRecords(formattedRecords)
          setTotal(res.data.total || 0)
        } else {
          message.error(res?.message || t('bqNfUgb8tQx4W7304W_Ql'))
          setRecords([])
        }
      } catch (error) {
        console.error('获取积分记录异常:', error)
        message.error(t('w1uTKKjZIs7Pvw0AqEpmd'))
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    fetchPointsHistory()
  }, [current, pageSize, message])

  // 处理翻页事件
  const handlePageChange = (page: number, size: number) => {
    setCurrent(page)
    setPageSize(size)
  }

  return (
    <PageContainer>
      <div className="flex flex-col animate-fade-in relative">
        {/* 全局 Loading 遮罩 */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
            <Spin size="large" description={t('XTdw6QC1UNzSmtRMd06AF')} />
          </div>
        )}

        {/* 核心白底容器 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 pb-6 mb-6 flex-1 flex flex-col min-h-[500px]">
          {/* ========================================== */}
          {/* 1. 头部标题 */}
          {/* ========================================== */}
          <div className="flex items-center gap-2 mb-6">
            <ProfileOutlined className="text-primary text-xl" />
            <span className="text-[16px] font-bold text-gray-800">
              {t('usKpZDupky2E5R4Kv34MQ')}{' '}
            </span>
          </div>

          {/* ========================================== */}
          {/* 2. 顶部概览数据板 (后端当前未返回汇总数据，此处保留 UI) */}
          {/* ========================================== */}
          <div className="bg-[#f7f8fb] rounded-xl py-6 px-10 mb-8 flex items-center justify-between">
            {/* 剩余积分 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('osR6Wy58P62jN2ostq-O-')}
              </div>
              <div className="text-2xl font-black text-gray-800 pl-3">1200</div>
            </div>

            <div className="text-gray-400 font-medium text-lg">=</div>

            {/* 充值积分 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('bR1gGCRMtKV22YIGjwyID')}
              </div>
              <div className="text-xl font-bold text-gray-800 pl-3">1080</div>
            </div>

            <div className="text-gray-400 font-medium text-lg">+</div>

            {/* 赠送积分 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('c2w4kJJPj-FAU5djkFqlI')}
              </div>
              <div className="text-xl font-bold text-gray-800 pl-3">200</div>
            </div>

            <div className="text-gray-400 font-medium text-lg">-</div>

            {/* 消耗积分 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('JM78KYjZClms_zYeUlF_q')}
              </div>
              <div className="text-xl font-bold text-gray-800 pl-3">150</div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 3. 数据卡片列表 (Card List) */}
          {/* ========================================== */}
          <div className="flex flex-col gap-3 flex-1 mb-8">
            {records.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <InboxOutlined className="text-5xl mb-3 text-gray-200" />
                <span>{t('8_qosm-gtQgYOl7Xvqfon')}</span>
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-5 rounded-xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-[0_2px_8px_rgba(102,108,255,0.08)] transition-all group"
                >
                  {/* 左侧：操作名称与时间 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[15px] font-bold text-gray-800 group-hover:text-primary transition-colors">
                      {record.title}
                    </span>
                    <span className="text-[13px] text-gray-400">{record.time}</span>
                  </div>

                  {/* 右侧：数值变化 */}
                  <div className="flex items-center gap-16 pr-4">
                    {/* 积分变化 */}
                    <div className="flex flex-col gap-1.5 items-end">
                      <span className="text-[13px] text-gray-500">
                        {t('IsMedV_A5eGGtphMFIrh9')}
                      </span>
                      <span
                        className={`text-[15px] font-bold ${record.change.startsWith('+') ? 'text-green-500' : 'text-gray-800'}`}
                      >
                        {record.change}
                      </span>
                    </div>
                    {/* 剩余积分 */}
                    <div className="flex flex-col gap-1.5 items-end w-16">
                      <span className="text-[13px] text-gray-500">
                        {t('osR6Wy58P62jN2ostq-O-')}
                      </span>
                      <span className="text-[15px] font-bold text-gray-800">
                        {record.remaining}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ========================================== */}
          {/* 4. 底部分页器 */}
          {/* ========================================== */}
          {total > 0 && (
            <div className="flex justify-center mt-auto pt-4 border-t border-gray-50">
              <Pagination
                current={current}
                pageSize={pageSize}
                total={total}
                showSizeChanger={true}
                onChange={handlePageChange}
              />
            </div>
          )}
        </div>

        {/* 底部版权信息 */}
        <Copiright />
      </div>
    </PageContainer>
  )
}

export default PointsRecordPage
