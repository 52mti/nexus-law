import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageOutlined, HistoryOutlined } from '@ant-design/icons';

export const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation(); // 获取当前路由路径

  // 定义菜单数据结构
  const menuItems = [
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: t('menu.legal_consult', '法律咨询'), // 第二个参数是默认值
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: t('menu.history', '历史记录'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-center font-bold text-xl text-[#5c6bc0] border-b border-gray-100">
        汇动法律 AI
      </div>

      {/* 菜单区域 */}
      <Menu
        mode="inline"
        // 自动根据当前 URL 高亮对应的菜单项
        selectedKeys={[location.pathname]} 
        // 点击菜单时触发路由跳转
        onClick={({ key }) => navigate(key)}
        items={menuItems}
        className="flex-1 border-r-0 mt-2"
      />
    </div>
  );
};