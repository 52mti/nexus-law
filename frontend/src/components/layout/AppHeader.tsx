import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Dropdown, Popover, Modal, Drawer } from 'antd'
import {
  UserOutlined,
  BellOutlined,
  GlobalOutlined,
  CrownFilled,
  IdcardOutlined,
  HistoryOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  PayCircleOutlined,
  LogoutOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

// 🚀 引入我们刚刚封装好的独立二维码组件
import { QRCodeScanner } from '../QRCodeScanner'

// 1. 定义菜单项的 TypeScript 类型
interface UserMenuItem {
  key: string
  icon: React.ElementType
  label: string
  path?: string
}

export const AppHeader: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // 状态控制
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<number>(500)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  // 🚀 新增：控制系统消息详情弹窗的开关与内容
  const [isMessageDetailOpen, setIsMessageDetailOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<any>(null)

  // 充值套餐数据配置
  const rechargePackages = [
    { points: 500, price: '50.00' },
    { points: 750, price: '75.00' },
    { points: 1500, price: '150.00' },
    { points: 2500, price: '220.00' },
    { points: 4500, price: '400.00' },
    { points: 9500, price: '900.00' },
  ]

  // 悬浮窗用户菜单配置
  const userMenuItems: UserMenuItem[] = [
    {
      key: 'account',
      icon: IdcardOutlined,
      label: '账号信息',
      path: '/account',
    },
    {
      key: 'history',
      icon: HistoryOutlined,
      label: '历史记录',
      path: '/history',
    },
    {
      key: 'orders',
      icon: ProfileOutlined,
      label: '订单管理',
      path: '/orders',
    },
    { key: 'vip', icon: AppstoreOutlined, label: '会员方案', path: '/vip' },
    {
      key: 'points',
      icon: PayCircleOutlined,
      label: '积分记录',
      path: '/points',
    },
    { key: 'logout', icon: LogoutOutlined, label: '退出登录' },
  ]

  const handleMenuClick = (item: UserMenuItem) => {
    if (item.key === 'logout') {
      Modal.confirm({
        title: '确认退出',
        content: '您确定要退出当前账号吗？',
        okText: '退出',
        cancelText: '取消',
        onOk: () => {
          console.log('执行清除 Token 等登出逻辑...')
          navigate('/login')
        },
      })
      return
    }
    if (item.path) navigate(item.path)
  }

  // 模拟消息通知数据
  const mockNotifications = Array(5)
    .fill({
      id: 1,
      title: '合规审查功能将迎来效果更新，敬请关注',
      content:
        '为保证用户体验，我们将于近期上线合规审查功能，请您敬请期待，以获得更好的...',
      detailPara1:
        '我们将在6月中旬上线图片3.0模型效果优化实验。此次更新不影响您的使用流程，但模型效果会产生变化。如果您正在推进的项目对风格一致性有要求，建议提前完成关键内容产出。',
      detailPara2:
        '这次更新是我们持续提升模型能力的重要一步，也非常欢迎大家在使用中多多反馈，我们会认真听取并不断优化！',
      time: '2026-06-26 10:20:30',
      isRead: false,
    })
    .map((item, index) => ({ ...item, id: index }))

  const languageItems = [
    { key: 'zh', label: '中文' },
    { key: 'en', label: 'English' },
  ]

  // 点击查看详情
  const handleViewMessageDetail = (notice: any) => {
    setCurrentMessage(notice)
    setIsMessageDetailOpen(true)
  }

  const userProfileContent = (
    <div className='w-87 bg-[#757575] rounded-lg p-4 shadow-lg'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Avatar
            size={46}
            icon={<UserOutlined />}
            className='bg-white text-[#5c6bc0]'
          />
          <div className='text-white'>
            <div className='text-base font-medium'>上山打老虎</div>
            <div className='text-sm text-gray-200 mt-0.5 tracking-wide'>
              1803****66
            </div>
          </div>
        </div>
        <div className='flex items-center gap-1 text-[13px] border border-[#dcb36d] text-[#dcb36d] px-2 py-0.5 rounded'>
          <CrownFilled className='text-xs' /> 黄金会员
        </div>
      </div>

      <div className='flex items-center justify-between mt-5 mb-4'>
        <div className='text-white'>
          <div className='font-medium text-[15px]'>会员特权</div>
          <div className='text-[13px] text-gray-200 mt-1'>
            开通会员即刻解锁多种专享权益
          </div>
        </div>
        <button className='bg-[#d7d7d7] text-[#4a3512] font-medium text-sm rounded-[5px] px-4 py-1 hover:bg-linear-to-r hover:from-[#fbe89e] hover:via-[#f9d98a] hover:to-[#f7ca76] hover:shadow-md transition-all'>
          开通会员
        </button>
      </div>

      <div className='bg-white rounded-lg p-2.5 grid grid-cols-2 gap-y-1 gap-x-2'>
        {userMenuItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className='flex items-center justify-start gap-3 hover:bg-[#f5f5f5] py-2 px-4 rounded-md cursor-pointer group transition-colors'
              onClick={() => handleMenuClick(item)}
            >
              <Icon className='text-gray-400 text-base group-hover:text-[#666cff] transition-colors' />
              <span className='text-sm text-gray-600 group-hover:text-[#666cff] transition-colors'>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <div className='flex items-center justify-end h-full px-6 bg-white border-b border-gray-100 gap-6'>
        <div
          className='flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors'
          onClick={() => setIsRechargeModalOpen(true)}
        >
          <span className='text-[#5c6bc0] font-semibold'>
            🔥 {t('header.quota', '剩余额度')}: 1200
          </span>
        </div>

        <Badge count={7} size='small'>
          <Button
            type='text'
            shape='circle'
            icon={<BellOutlined className='text-lg text-gray-600' />}
            onClick={() => setIsNotificationOpen(true)}
          />
        </Badge>

        <Dropdown
          menu={{
            items: languageItems,
            onClick: ({ key }) => i18n.changeLanguage(key),
          }}
          placement='bottomRight'
        >
          <Button
            type='text'
            shape='circle'
            icon={<GlobalOutlined className='text-lg text-gray-600' />}
          />
        </Dropdown>

        <Popover
          content={userProfileContent}
          trigger='hover'
          placement='bottomRight'
          arrow={false}
          color='transparent'
          styles={{ container: { padding: 0 } }}
        >
          <Avatar
            size='default'
            icon={<UserOutlined />}
            className='bg-[#5c6bc0] cursor-pointer hover:opacity-80 transition-opacity'
          />
        </Popover>
      </div>

      {/* ==================== 消息中心抽屉 (Drawer) ==================== */}
      <Drawer
        title={
          <div className='flex items-center gap-2 text-base'>
            <BellOutlined /> 消息中心
          </div>
        }
        closable={false}
        placement='right'
        size={380}
        onClose={() => setIsNotificationOpen(false)}
        open={isNotificationOpen}
        extra={
          <span className='text-blue-500 text-sm cursor-pointer hover:text-blue-600'>
            全部标记已读
          </span>
        }
        styles={{
          body: { backgroundColor: '#f9fafb', padding: '16px' },
          header: { borderBottom: '1px solid #f0f0f0' },
        }}
      >
        <div className='flex flex-col gap-3'>
          {mockNotifications.map((notice) => (
            <div
              key={notice.id}
              className='bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow'
            >
              <div className='flex items-center gap-2 mb-2'>
                {!notice.isRead && (
                  <div className='w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0'></div>
                )}
                <span className='font-medium text-gray-800 text-[15px] truncate'>
                  {notice.title}
                </span>
              </div>
              <p className='text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3'>
                {notice.content}
              </p>
              <div className='flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs'>
                <div className='text-gray-400 flex items-center gap-1'>
                  <ClockCircleOutlined />
                  {notice.time}
                </div>
                <span
                  className='text-gray-500 cursor-pointer hover:text-[#666cff] transition-colors'
                  onClick={() => handleViewMessageDetail(notice)}
                >
                  查看详情
                </span>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* ==================== 🚀 详情系统消息弹窗 (Modal) ==================== */}
      <Modal
        title={
          <span className='font-bold text-gray-800 text-base'>系统消息</span>
        }
        open={isMessageDetailOpen}
        onCancel={() => setIsMessageDetailOpen(false)}
        footer={null}
        centered
        width={480}
        classNames={{ container: 'rounded-2xl' }}
      >
        {currentMessage && (
          <div className='pt-4 pb-2 animate-fade-in'>
            {/* 消息大标题 */}
            <h3 className='text-[16px] font-bold text-gray-800 mb-3 leading-snug'>
              {currentMessage.title}
            </h3>

            {/* 消息时间 */}
            <div className='flex items-center gap-1.5 text-gray-400 text-[13px] mb-6'>
              <ClockCircleOutlined />
              <span>{currentMessage.time}</span>
            </div>

            {/* 消息正文段落 */}
            <div className='text-[14px] text-gray-500 leading-relaxed space-y-6 mb-10 tracking-wide'>
              <p>{currentMessage.detailPara1}</p>
              <p>{currentMessage.detailPara2}</p>
            </div>

            {/* 右下角按钮 */}
            <div className='flex justify-end'>
              <Button
                type='primary'
                onClick={() => setIsMessageDetailOpen(false)}
                className='bg-[#666cff] hover:bg-[#585ee6] border-none rounded-lg px-6 h-9 text-sm tracking-widest shadow-md shadow-indigo-500/20'
              >
                我知道了
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== 充值弹窗 (Modal) ==================== */}
      <Modal
        open={isRechargeModalOpen}
        onCancel={() => setIsRechargeModalOpen(false)}
        footer={null}
        closeIcon={null}
        width={720}
        centered
        rootClassName='[&_.ant-modal]:outline-none [&_.ant-modal-wrap]:outline-none [&_.ant-modal-content]:outline-none'
        styles={{
          container: { padding: 0, overflow: 'hidden', borderRadius: '12px' },
        }}
      >
        {/* 深色头部 */}
        <div className='bg-[#5a5f6b] text-white px-6 py-4 flex justify-between items-center rounded-t-xl'>
          <div className='flex items-center gap-3'>
            <Avatar
              size={32}
              icon={<UserOutlined />}
              className='bg-white text-gray-500'
            />
            <span className='text-base font-medium'>宋工</span>
          </div>
          <div className='flex items-center gap-4'>
            <span className='text-sm'>🔥 我的积分 1200</span>
            <CloseOutlined
              className='cursor-pointer text-lg text-gray-300 hover:text-white transition-colors'
              onClick={() => setIsRechargeModalOpen(false)}
            />
          </div>
        </div>

        {/* 白色主体区 */}
        <div className='bg-white p-6 flex gap-8 rounded-b-xl'>
          {/* 左侧：选择积分网格 */}
          <div className='flex-1'>
            <h3 className='text-base font-medium text-gray-800 mb-4'>
              选择积分
            </h3>
            <div className='grid grid-cols-3 gap-3'>
              {rechargePackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.points
                return (
                  <div
                    key={pkg.points}
                    onClick={() => setSelectedPackage(pkg.points)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border transition-all
                      ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 text-blue-500'
                          : 'border-gray-200 hover:border-blue-300 text-gray-800'
                      }
                    `}
                  >
                    <div className='font-semibold text-base mb-1'>
                      {pkg.points}积分
                    </div>
                    <div
                      className={isSelected ? 'text-blue-400' : 'text-gray-400'}
                    >
                      ¥ {pkg.price}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className='mt-8 text-[12px] text-gray-400 leading-relaxed'>
              温馨提示：积分不可兑换会员，不可转赠和提现。充值后不支持退款，有效期为2年。
            </div>
          </div>

          {/* 右侧：扫码支付区域 (🚀 完全复用提取出的组件) */}
          <div className='w-55 pl-8 border-l border-gray-100 flex flex-col items-center justify-center'>
            <h3 className='text-base font-medium text-gray-800 w-full mb-4'>
              扫码支付
            </h3>

            {/* 直接调用提取好的 QRCodeScanner */}
            <QRCodeScanner />

            <div className='text-[12px] text-gray-400 text-center mt-3'>
              支付即代表您已同意{' '}
              <a className='text-[#666cff] hover:text-[#585ee6] hover:underline transition-colors'>
                《付费服务协议》
              </a>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
