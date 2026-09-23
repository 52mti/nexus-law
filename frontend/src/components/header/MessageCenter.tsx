import React, { useState } from 'react'
import { Drawer, Modal, Button, App, Spin, Empty } from 'antd'
import { BellOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { markNotificationsRead, type NotificationExtra } from '@/api/notification'
import { useTranslation } from 'react-i18next'

export interface AppNotification {
  id: string
  type: string
  title: string
  content: string
  extra: NotificationExtra
  time: string
  isRead: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
  unreadCount: number
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
  loading: boolean
}

function displayTitle(notice: AppNotification, t: (key: string) => string) {
  if (notice.type === 'feature_launch') {
    return notice.title || t('notify.feature_launch')
  }
  if (notice.type === 'payment_success') return t('notify.payment_success')
  if (notice.type === 'rebate_success') return t('notify.rebate_success')
  if (notice.type === 'refund_success') return t('notify.refund_success')
  return notice.title || t('1rPK7Kh2jWTApuNa8oLbv')
}

function displayContent(notice: AppNotification, t: (key: string, options?: Record<string, unknown>) => string) {
  const extra = notice.extra || {}
  if (notice.type === 'payment_success') {
    return t('notify.payment_success_body', {
      plan: extra.plan_name || t('notify.order'),
      amount: extra.amount || '',
    })
  }
  if (notice.type === 'rebate_success') {
    return t('notify.rebate_success_body', { points: extra.points ?? '' })
  }
  if (notice.type === 'refund_success') {
    return t('notify.refund_success_body', { amount: extra.amount || '' })
  }
  return notice.content
}

export const MessageCenter: React.FC<Props> = ({
  open,
  onClose,
  notifications,
  setNotifications,
  unreadCount,
  setUnreadCount,
  loading,
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const [isMessageDetailOpen, setIsMessageDetailOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<AppNotification | null>(null)

  const handleViewMessageDetail = async (notice: AppNotification) => {
    setCurrentMessage(notice)
    setIsMessageDetailOpen(true)

    if (!notice.isRead) {
      try {
        await markNotificationsRead([notice.id])
        setNotifications((prev) =>
          prev.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)),
        )
        setUnreadCount((count) => Math.max(0, count - 1))
      } catch (error) {
        console.error('标记已读状态失败:', error)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 && notifications.every((item) => item.isRead)) return
    try {
      await markNotificationsRead()
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
      message.success(t('XPA9ue7_wp_bPGWxZTLSs'))
    } catch (error) {
      console.error('全部标记已读失败:', error)
    }
  }

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center gap-2 text-base">
            <BellOutlined /> {t('6qjXDiWASM4QFoKYxn9xO')}
          </div>
        }
        closable={false}
        placement="right"
        size={380}
        onClose={onClose}
        open={open}
        extra={
          <span
            className="text-blue-500 text-sm cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleMarkAllAsRead}
          >
            {t('zMChAdzPN0L2xvlCMxP2F')}
          </span>
        }
        styles={{
          body: { backgroundColor: '#f9fafb', padding: '16px' },
          header: { borderBottom: '1px solid #f0f0f0' },
        }}
      >
        <div className="flex flex-col gap-3 relative min-h-[100px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f9fafb]/80 backdrop-blur-[1px]">
              <Spin description={t('bfJ8KlxbV0DiFDkTPbmfD')} />
            </div>
          )}

          {!loading && notifications.length === 0 ? (
            <div className="pt-20">
              <Empty description={t('GPIfvzlliJuVHtKcovAno')} />
            </div>
          ) : (
            notifications.map((notice) => (
              <div
                key={notice.id}
                className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  {!notice.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                  )}
                  <span className="font-medium text-gray-800 text-[15px] truncate">
                    {displayTitle(notice, t)}
                  </span>
                </div>
                <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3">
                  {displayContent(notice, t)}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs">
                  <div className="text-gray-400 flex items-center gap-1">
                    <ClockCircleOutlined /> {notice.time}
                  </div>
                  <span
                    className="text-gray-500 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleViewMessageDetail(notice)}
                  >
                    {t('uT_w5mZsxlBhmSBdYeM3h')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>

      {/* 详情弹窗代码完全保持原样，省略显示 */}
      <Modal
        title={
          <span className="font-bold text-gray-800 text-base">{t('KbBI_RUAQ2pR3-6eer8Yb')}</span>
        }
        open={isMessageDetailOpen}
        onCancel={() => setIsMessageDetailOpen(false)}
        footer={null}
        centered
        width={480}
        classNames={{ container: 'rounded-2xl' }}
      >
        {currentMessage && (
          <div className="pt-4 pb-2 animate-fade-in">
            <h3 className="text-[16px] font-bold text-gray-800 mb-3 leading-snug">
              {displayTitle(currentMessage, t)}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-400 text-[13px] mb-6">
              <ClockCircleOutlined />
              <span>{currentMessage.time}</span>
            </div>

            {/* 🚀 修改点：使用 content，并支持文本自动换行 */}
            <div className="text-[14px] text-gray-500 leading-relaxed space-y-6 mb-10 tracking-wide whitespace-pre-wrap">
              {displayContent(currentMessage, t)}
            </div>

            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => setIsMessageDetailOpen(false)}
                className="bg-primary hover:bg-secondary border-none rounded-lg px-6 h-9 text-sm tracking-widest shadow-md shadow-indigo-500/20"
              >
                {t('Fw8SefKWcNDVHCFhUFmhk')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
