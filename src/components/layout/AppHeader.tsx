import React from 'react';
import { Avatar, Badge, Button, Dropdown } from 'antd';
import { UserOutlined, BellOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export const AppHeader: React.FC = () => {
  const { t, i18n } = useTranslation();

  // 语言切换菜单配置
  const languageItems = [
    { key: 'zh', label: '中文' },
    { key: 'en', label: 'English' },
  ];

  return (
    <div className="flex items-center justify-end h-full px-6 bg-white border-b border-gray-100 gap-6">
      {/* 剩余额度展示 */}
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full">
        <span className="text-[#5c6bc0] font-semibold">🔥 {t('header.quota', '剩余额度')}: 1200</span>
      </div>

      {/* 消息通知 (带红点徽标) */}
      <Badge count={7} size="small">
        <Button type="text" shape="circle" icon={<BellOutlined className="text-lg text-gray-600" />} />
      </Badge>

      {/* 多语言切换 */}
      <Dropdown 
        menu={{ 
          items: languageItems, 
          onClick: ({ key }) => i18n.changeLanguage(key) 
        }} 
        placement="bottomRight"
      >
        <Button type="text" shape="circle" icon={<GlobalOutlined className="text-lg text-gray-600" />} />
      </Dropdown>

      {/* 用户头像 */}
      <Avatar size="default" icon={<UserOutlined />} className="bg-[#5c6bc0]" />
    </div>
  );
};