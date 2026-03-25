import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Popover, Avatar, App } from 'antd'
import {
  UserOutlined,
  CrownFilled,
  IdcardOutlined,
  HistoryOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  PayCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons'

export const UserProfile: React.FC = () => {
  const navigate = useNavigate()
  const { modal } = App.useApp()

  const userMenuItems = [
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

  const handleMenuClick = (item: any) => {
    if (item.key === 'logout') {
      modal.confirm({
        title: '确认退出',
        content: '您确定要退出当前账号吗？',
        okText: '退出',
        cancelText: '取消',
        onOk: () => navigate('/login'),
      })
      return
    }
    if (item.path) navigate(item.path)
  }

  const content = (
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
              <Icon className='text-gray-400 text-base group-hover:text-primary transition-colors' />
              <span className='text-sm text-gray-600 group-hover:text-primary transition-colors'>
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
      <Popover
        content={content}
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
    </>
  )
}
