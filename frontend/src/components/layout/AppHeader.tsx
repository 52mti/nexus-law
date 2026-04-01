import React, { useState } from "react";
import { Badge, Button, Dropdown } from "antd";
import { BellOutlined, GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

// 🚀 引入拆分出来的子组件
import { RechargeModal } from "../header/RechargeModal";
import { MessageCenter } from "../header/MessageCenter";
import { UserProfile } from "../header/UserProfile";

export const AppHeader: React.FC = () => {
  const { t, i18n } = useTranslation();

  // 顶层状态控制
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const languageItems = [
    { key: "zh-CN", label: "中文" },
    { key: "en-US", label: "English" },
    { key: "am-ET", label: "አማርኛ" },
  ];

  return (
    <>
      <div className="flex items-center justify-end h-full px-6 bg-white border-b border-gray-100 gap-6">
        {/* 充值入口 */}
        <div
          className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setIsRechargeModalOpen(true)}
        >
          <span className="text-[#5c6bc0] font-semibold">
            🔥 <span>{t("KfeCrWV2baDEaTQl9hMTK")}</span> : 1200
          </span>
        </div>

        {/* 消息中心入口 */}
        <Badge count={7} size="small">
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined className="text-lg text-gray-600" />}
            onClick={() => setIsNotificationOpen(true)}
          />
        </Badge>

        {/* 语言切换 */}
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

        {/* 🚀 用户资料组件 */}
        <UserProfile />
      </div>

      {/* 🚀 挂载拆分出来的弹窗和抽屉组件 */}
      <RechargeModal
        open={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
      />

      <MessageCenter
        open={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
};
