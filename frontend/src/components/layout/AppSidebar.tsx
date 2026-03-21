import React from 'react'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MessageOutlined,
  FileTextOutlined,
  SearchOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  CrownOutlined,
  PayCircleOutlined,
} from '@ant-design/icons'

export const AppSidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // 🚀 核心修复：处理动态路由的高亮问题
  // 无论当前在 "/doc/123" 还是 "/doc"，都统一提取出 "/doc" 来匹配菜单
  const getSelectedKey = () => {
    const pathSegments = location.pathname.split('/')
    // pathSegments[1] 就是去掉第一个斜杠后的那一节，比如 "doc"、"chat"
    return pathSegments[1] ? `/${pathSegments[1]}` : '/'
  }

  const menuItems: MenuProps['items'] = [
    { key: '/chat', icon: <MessageOutlined />, label: '法律咨询' },
    { key: '/doc', icon: <FileTextOutlined />, label: '文书生成' },
    { key: '/law', icon: <SearchOutlined />, label: '条文检索' },
    { key: '/case_review', icon: <ProfileOutlined />, label: '案件快梳' },
    {
      key: '/compliance',
      icon: <SafetyCertificateOutlined />,
      label: '合规审查',
    },
    { key: '/case_search', icon: <FolderOpenOutlined />, label: '案例搜索' },
    { type: 'divider' },
    {
      key: 'g_other',
      type: 'group',
      label: '其它',
      children: [
        { key: '/history', icon: <HistoryOutlined />, label: '历史记录' },
        { key: '/vip', icon: <CrownOutlined />, label: '会员方案' },
        { key: '/orders', icon: <FileTextOutlined />, label: '订单管理' },
        { key: '/points', icon: <PayCircleOutlined />, label: '积分记录' },
      ],
    },
  ]

  return (
    <div className='flex flex-col h-full bg-[#f6f7f9] px-2'>
      {/* Logo 区域 */}
      <div className='h-16 flex items-center justify-center font-bold text-xl text-[#5c6bc0] border-b border-gray-100'>
        汇动法律 AI
      </div>

      {/* 菜单区域 */}
      <Menu
        mode='inline'
        // 🚀 使用我们刚才写的函数来计算应该高亮谁
        selectedKeys={[getSelectedKey()]}
        onClick={({ key }) => {
          if (key === getSelectedKey()) return;

          // 只有点击了其他的菜单（比如去历史记录），才执行真实的跳转
          navigate(key);
        }}
        items={menuItems}
        className='flex-1 border-r-0! mt-2 custom-sidebar-menu bg-transparent!'
      />
    </div>
  )
}
