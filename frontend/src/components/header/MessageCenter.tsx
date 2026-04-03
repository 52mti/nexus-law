import React, { useState } from 'react'
import { Drawer, Modal, Button, App, Spin, Empty } from 'antd'
import { BellOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { markReaded } from '@/api/common' // 注意：这里不再需要引入 getMessageNotification
import { useTranslation } from 'react-i18next'

// 🚀 1. 扩充 Props 类型，接收来自 AppHeader 的数据
interface Props {
  open: boolean
  onClose: () => void
  notifications: any[]
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>
  loading: boolean
}

export const MessageCenter: React.FC<Props> = ({
  open,
  onClose,
  notifications,
  setNotifications,
  loading,
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const [isMessageDetailOpen, setIsMessageDetailOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<any>(null)

  // ==========================================
  // 🚀 2. 交互操作（不用改，只要记得用 props 里的 setNotifications）
  // ==========================================
  const handleViewMessageDetail = async (notice: any) => {
    setCurrentMessage(notice)
    setIsMessageDetailOpen(true)

    if (!notice.isRead) {
      try {
        const res = await markReaded(notice.id)
        if (res?.successful || res?.code === 0 || res?.code === 200) {
          // 乐观更新父组件传下来的状态
          setNotifications((prev) =>
            prev.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)),
          )
        }
      } catch (error) {
        console.error('标记已读状态失败:', error)
      }
    }
  }

  const handleMarkAllAsRead = () => {
    message.success(t('XPA9ue7_wp_bPGWxZTLSs'))
    const updated = notifications.map((n) => ({ ...n, isRead: true }))
    setNotifications(updated)
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
                    {notice.title}
                  </span>
                </div>
                <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3">
                  {notice.content}
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
              {currentMessage.title}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-400 text-[13px] mb-6">
              <ClockCircleOutlined />
              <span>{currentMessage.time}</span>
            </div>

            {/* 🚀 修改点：使用 content，并支持文本自动换行 */}
            <div className="text-[14px] text-gray-500 leading-relaxed space-y-6 mb-10 tracking-wide whitespace-pre-wrap">
              {currentMessage.content}
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
