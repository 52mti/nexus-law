import React from 'react'
import { Menu } from 'antd'
import type { MenuProps } from 'antd' // 1. 引入 MenuProps 类型
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
  const location = useLocation() // 获取当前路由路径

  // 2. 为 menuItems 显式指定类型为 MenuProps['items']
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
    // 3. 将后续的菜单项作为 children 放入 group 中
    {
      key: 'g_other',
      type: 'group',
      label: '其它',
      children: [
        { key: '/history', icon: <HistoryOutlined />, label: '历史记录' },
        { key: '/vip', icon: <CrownOutlined />, label: '会员方案' },
        { key: '/order', icon: <FileTextOutlined />, label: '订单管理' },
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
        // 自动根据当前 URL 高亮对应的菜单项
        selectedKeys={[location.pathname]}
        // 点击菜单时触发路由跳转
        onClick={({ key }) => navigate(key)}
        items={menuItems}
        className='flex-1 border-r-0! mt-2 custom-sidebar-menu bg-transparent!'
      />
    </div>
  )
}
