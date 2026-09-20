import React, { useState, useEffect } from 'react'
import { Pagination, App, Spin } from 'antd'
import { ProfileOutlined, InboxOutlined } from '@ant-design/icons'
import Copiright from '@/components/Copiright'
import { PageContainer } from '@/components/layout/PageContainer'
import { listPointLedgers, type LedgerSummary } from '@/api/commerce'
import { useTranslation } from 'react-i18next'

interface PointRecord {
  id: string
  title: string
  time: string
  change: string
  remaining: string
}

const EMPTY_SUMMARY: LedgerSummary = {
  points: 0,
  recharge: 0,
  gift: 0,
  consume: 0,
}

export const PointsRecordPage: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<PointRecord[]>([])
  const [summary, setSummary] = useState<LedgerSummary>(EMPTY_SUMMARY)

  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchPointsHistory = async () => {
      setLoading(true)
      try {
        const data = await listPointLedgers({ current, size: pageSize })
        const formattedRecords: PointRecord[] = (data.records || []).map((item) => {
          let formattedTime = item.created_at || '-'
          if (formattedTime.includes('T')) {
            formattedTime = formattedTime.replace('T', ' ').substring(0, 16)
          }
          const changeStr = item.change > 0 ? `+${item.change}` : String(item.change)
          return {
            id: item.id,
            title: item.title || item.type || t('2bNr1yJPkqOHiooJmsKHs'),
            time: formattedTime,
            change: changeStr,
            remaining: String(item.balance ?? 0),
          }
        })

        setRecords(formattedRecords)
        setTotal(data.total || 0)
        setSummary(data.summary || EMPTY_SUMMARY)
      } catch (error) {
        console.error('获取积分记录异常:', error)
        message.error(error instanceof Error ? error.message : t('w1uTKKjZIs7Pvw0AqEpmd'))
        setRecords([])
        setSummary(EMPTY_SUMMARY)
      } finally {
        setLoading(false)
      }
    }

    fetchPointsHistory()
  }, [current, pageSize, message, t])

  const handlePageChange = (page: number, size: number) => {
    setCurrent(page)
    setPageSize(size)
  }

  return (
    <PageContainer>
      <div className="flex flex-col animate-fade-in relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
            <Spin size="large" description={t('XTdw6QC1UNzSmtRMd06AF')} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 pb-6 mb-6 flex-1 flex flex-col min-h-[500px]">
          <div className="flex items-center gap-2 mb-6">
            <ProfileOutlined className="text-primary text-xl" />
            <span className="text-[16px] font-bold text-gray-800">
              {t('usKpZDupky2E5R4Kv34MQ')}{' '}
            </span>
          </div>

          <div className="bg-[#f7f8fb] rounded-xl py-6 px-10 mb-8 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('osR6Wy58P62jN2ostq-O-')}
              </div>
              <div className="text-2xl font-black text-gray-800 pl-3">{summary.points}</div>
            </div>

            <div className="text-gray-400 font-medium text-lg">=</div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('bR1gGCRMtKV22YIGjwyID')}
              </div>
              <div className="text-xl font-bold text-gray-800 pl-3">{summary.recharge}</div>
            </div>

            <div className="text-gray-400 font-medium text-lg">+</div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('c2w4kJJPj-FAU5djkFqlI')}
              </div>
              <div className="text-xl font-bold text-gray-800 pl-3">{summary.gift}</div>
            </div>

            <div className="text-gray-400 font-medium text-lg">-</div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium">
                <div className="w-1.5 h-1.5 bg-primary" /> {t('JM78KYjZClms_zYeUlF_q')}
              </div>
              <div className="text-xl font-bold text-gray-800 pl-3">{summary.consume}</div>
            </div>
          </div>

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
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[15px] font-bold text-gray-800 group-hover:text-primary transition-colors">
                      {record.title}
                    </span>
                    <span className="text-[13px] text-gray-400">{record.time}</span>
                  </div>

                  <div className="flex items-center gap-16 pr-4">
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

        <Copiright />
      </div>
    </PageContainer>
  )
}

export default PointsRecordPage
