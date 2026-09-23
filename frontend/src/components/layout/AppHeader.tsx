import React, { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Dropdown } from 'antd'
import { BellOutlined, GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { listNotifications, type NotificationRecord } from '@/api/notification'
import { parseDate } from '@/utils/formatDate'

import { RechargeModal } from '../header/RechargeModal'
import { MessageCenter, type AppNotification } from '../header/MessageCenter'
import { UserProfile } from '../header/UserProfile'
import { useUserStore } from '@/store/useUserStore'

function formatNoticeTime(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toAppNotification(item: NotificationRecord): AppNotification {
  return {
    id: item.id,
    type: item.type,
    title: item.title || '',
    content: item.content || '',
    extra: item.extra || {},
    time: formatNoticeTime(item.created_at),
    isRead: Boolean(item.is_read),
  }
}

interface AppHeaderProps {
  onlyLanguage?: boolean
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onlyLanguage = false }) => {
  const { t, i18n } = useTranslation()
  const userInfo = useUserStore((state) => state.memberInfo)
  const giftPoints = userInfo?.points ?? 0

  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  // ==========================================
  // 🚀 2. 核心：将消息状态提升到全局 Header 中管理
  // ==========================================
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await listNotifications({ current: 1, size: 20 })
      setNotifications((data.records || []).map(toAppNotification))
      setUnreadCount(data.unread ?? 0)
    } catch (error) {
      console.error('获取消息列表异常:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (onlyLanguage) return
    void fetchNotifications()
  }, [fetchNotifications, onlyLanguage])

  useEffect(() => {
    if (onlyLanguage || !isNotificationOpen) return
    void fetchNotifications(true)
  }, [fetchNotifications, isNotificationOpen, onlyLanguage])

  const languageItems = [
    { key: 'en-US', label: 'English' },
    { key: 'am-ET', label: 'አማርኛ' },
    { key: 'zh-CN', label: '中文' },
  ]

  return (
    <>
      <div className={`flex items-center justify-end h-full px-6 gap-6 ${onlyLanguage ? 'bg-transparent border-none' : 'bg-white border-b border-gray-100'}`}>
        {!onlyLanguage && (
          <>
            <div
              className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => setIsRechargeModalOpen(true)}
            >
              <span className="text-[#5c6bc0] font-semibold">
                🔥 <span>{t('KfeCrWV2baDEaTQl9hMTK')}</span> : {giftPoints}
              </span>
            </div>

            {/* 🚀 4. 将静态的 7 改为动态计算的 unreadCount */}
            <Badge count={onlyLanguage ? 0 : unreadCount} size="small">
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined className="text-lg text-gray-600" />}
                onClick={() => setIsNotificationOpen(true)}
              />
            </Badge>
          </>
        )}

        <Dropdown
          menu={{
            items: languageItems,
            onClick: ({ key }) => i18n.changeLanguage(key),
          }}
          placement="bottomRight"
        >
          <Button
            type="text"
            shape="circle"
            icon={<GlobalOutlined className="text-lg text-gray-600" />}
          />
        </Dropdown>

        {!onlyLanguage && <UserProfile />}
      </div>

      {!onlyLanguage && (
        <>
          <RechargeModal open={isRechargeModalOpen} onClose={() => setIsRechargeModalOpen(false)} />

          {/* 🚀 5. 把状态和修改状态的方法作为 props 传给子组件 */}
          <MessageCenter
            open={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notifications}
            setNotifications={setNotifications}
            unreadCount={unreadCount}
            setUnreadCount={setUnreadCount}
            loading={loading}
          />
        </>
      )}
    </>
  )
}
