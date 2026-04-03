import React, { useState, useEffect } from 'react'
import { Badge, Button, Dropdown } from 'antd'
import { BellOutlined, GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
// 🚀 1. 引入获取消息的 API
import { getMessageNotification } from '@/api/common'

import { RechargeModal } from '../header/RechargeModal'
import { MessageCenter } from '../header/MessageCenter'
import { UserProfile } from '../header/UserProfile'

export const AppHeader: React.FC = () => {
  const { t, i18n } = useTranslation()

  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  // ==========================================
  // 🚀 2. 核心：将消息状态提升到全局 Header 中管理
  // ==========================================
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 页面一加载就请求消息，这样不点开抽屉也能看到红点数量
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const res = await getMessageNotification({ current: 1, size: 20 })
        if (res?.successful && res?.data?.records) {
          const formattedData = res.data.records.map((item: any) => {
            let formattedTime = item.createTime || '-'
            if (formattedTime.includes('T')) {
              formattedTime = formattedTime.replace('T', ' ').substring(0, 19)
            }
            return {
              id: item.id,
              title: item.title || t('1rPK7Kh2jWTApuNa8oLbv'),
              content: item.content || '',
              time: formattedTime,
              isRead: String(item.read) === '1',
              raw: item,
            }
          })
          setNotifications(formattedData)
        }
      } catch (error) {
        console.error('获取消息列表异常:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [t])

  // 🚀 3. 动态计算出【未读】消息的数量，用于展示在 Badge 上
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const languageItems = [
    { key: 'zh-CN', label: '中文' },
    { key: 'en-US', label: 'English' },
    { key: 'am-ET', label: 'አማርኛ' },
  ]

  return (
    <>
      <div className="flex items-center justify-end h-full px-6 bg-white border-b border-gray-100 gap-6">
        <div
          className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setIsRechargeModalOpen(true)}
        >
          <span className="text-[#5c6bc0] font-semibold">
            🔥 <span>{t('KfeCrWV2baDEaTQl9hMTK')}</span> : 1200
          </span>
        </div>

        {/* 🚀 4. 将静态的 7 改为动态计算的 unreadCount */}
        <Badge count={unreadCount} size="small">
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined className="text-lg text-gray-600" />}
            onClick={() => setIsNotificationOpen(true)}
          />
        </Badge>

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

        <UserProfile />
      </div>

      <RechargeModal open={isRechargeModalOpen} onClose={() => setIsRechargeModalOpen(false)} />

      {/* 🚀 5. 把状态和修改状态的方法作为 props 传给子组件 */}
      <MessageCenter
        open={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
        loading={loading}
      />
    </>
  )
}
