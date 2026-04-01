import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Popover, Avatar, App, Spin } from 'antd'
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
// 🚀 1. 确保引入了真实的 API 接口
import { getMemberInfo } from '@/api/auth'

export const UserProfile: React.FC = () => {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()

  // 🚀 2. 增加状态管理，用于存储用户信息和加载状态
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 🚀 3. 在组件挂载时拉取真实用户数据
  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true)
      try {
        const res = await getMemberInfo()
        if (res && res.successful && res.data) {
          setUserInfo(res.data)
        } else {
          message.error(res.message || '获取用户信息失败')
        }
      } catch (error) {
        console.error('获取用户信息报错:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [message])

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
        onOk: () => {
          // 💡 提示：退出时记得清除 localStorage/sessionStorage 里的 token
          localStorage.removeItem('token')
          navigate('/login')
        },
      })
      return
    }
    if (item.path) navigate(item.path)
  }

  // 🚀 4. 手机号脱敏处理函数 (如：18012345678 -> 180****5678)
  const maskMobile = (mobile: string) => {
    if (!mobile) return '暂无手机号'
    return mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  // 🚀 5. 简单的会员等级映射（你可以根据后端实际的 membershipPlanId 进行拓展）
  const getVipName = (planId: string) => {
    if (!planId) return '普通用户'
    // 假设你有特定的映射关系
    const planMap: Record<string, string> = {
      'gold_id': '黄金会员',
      'platinum_id': '铂金会员',
      'diamond_id': '钻石会员',
    }
    return planMap[planId] || '尊享会员'
  }

  const content = (
    <div className='w-87 bg-[#757575] rounded-lg p-4 shadow-lg'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          {/* 🚀 6. 动态渲染头像，如果有真实头像则显示，否则回退到默认图标 */}
          <Avatar
            size={46}
            src={userInfo?.avatar}
            icon={!userInfo?.avatar && <UserOutlined />}
            className='bg-white text-[#5c6bc0]'
          />
          <div className='text-white'>
            {/* 🚀 7. 动态渲染昵称和脱敏手机号 */}
            <div className='text-base font-medium'>
              {userInfo?.nickName || userInfo?.username || '微信用户'}
            </div>
            <div className='text-sm text-gray-200 mt-0.5 tracking-wide'>
              {maskMobile(userInfo?.mobile)}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-1 text-[13px] border border-[#dcb36d] text-[#dcb36d] px-2 py-0.5 rounded'>
          <CrownFilled className='text-xs' />
          {/* 🚀 8. 动态渲染会员名称 */}
          {getVipName(userInfo?.membershipPlanId)}
        </div>
      </div>

      <div className='flex items-center justify-between mt-5 mb-4'>
        <div className='text-white'>
          <div className='font-medium text-[15px]'>会员特权</div>
          <div className='text-[13px] text-gray-200 mt-1'>
            开通会员即刻解锁多种专享权益
          </div>
        </div>
        <button
          onClick={() => navigate('/vip')} // 💡 快捷跳转开通会员页
          className='bg-[#d7d7d7] text-[#4a3512] font-medium text-sm rounded-[5px] px-4 py-1 hover:bg-linear-to-r hover:from-[#fbe89e] hover:via-[#f9d98a] hover:to-[#f7ca76] hover:shadow-md transition-all'
        >
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
        {/* 外部的触发头像也与内部数据保持一致 */}
        <Avatar
          size='default'
          src={userInfo?.avatar}
          icon={!userInfo?.avatar && <UserOutlined />}
          className='bg-[#5c6bc0] cursor-pointer hover:opacity-80 transition-opacity'
        />
      </Popover>
    </>
  )
}