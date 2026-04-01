import React from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // 🚀 核心修复：处理动态路由的高亮问题
  // 无论当前在 "/doc/123" 还是 "/doc"，都统一提取出 "/doc" 来匹配菜单
  const getSelectedKey = () => {
    const pathSegments = location.pathname.split("/");
    // pathSegments[1] 就是去掉第一个斜杠后的那一节，比如 "doc"、"chat"
    return pathSegments[1] ? `/${pathSegments[1]}` : "/";
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "/chat",
      icon: <MessageOutlined />,
      label: t("55MgcdgL-M_bDMPikm8dg"),
    },
    {
      key: "/doc",
      icon: <FileTextOutlined />,
      label: t("Y5lXXT2JlkDU0PQI0I7yq"),
    },
    {
      key: "/law",
      icon: <SearchOutlined />,
      label: t("-12qwY0PC7PpbQh4_MKXF"),
    },
    {
      key: "/case_review",
      icon: <ProfileOutlined />,
      label: t("v62oh91W_duc1Jbd_i6fQ"),
    },
    {
      key: "/compliance_review",
      icon: <SafetyCertificateOutlined />,
      label: t("arNSK77_1mBHqUKeHWOI9"),
    },
    {
      key: "/case_search",
      icon: <FolderOpenOutlined />,
      label: t("eFKZva_VhL-1yNF8MdN5X"),
    },
    { type: "divider" },
    {
      key: "g_other",
      type: "group",
      label: t("XOu1VB-e5FKA38r-JSlEd"),
      children: [
        {
          key: "/history",
          icon: <HistoryOutlined />,
          label: t("5McxCVFh594H_M21lerxL"),
        },
        {
          key: "/vip",
          icon: <CrownOutlined />,
          label: t("4Vf5BRDSBpDb3UA8xEvat"),
        },
        {
          key: "/orders",
          icon: <FileTextOutlined />,
          label: t("wMyFtSLZvebniEZL05GM6"),
        },
        {
          key: "/points",
          icon: <PayCircleOutlined />,
          label: t("usKpZDupky2E5R4Kv34MQ"),
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f6f7f9] px-2">
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-center font-bold text-xl text-[#5c6bc0] border-b border-gray-100">
        {t("htQgdqSMQ9Gox7Sl0tdDM")}
      </div>

      {/* 菜单区域 */}
      <Menu
        mode="inline"
        // 🚀 使用我们刚才写的函数来计算应该高亮谁
        selectedKeys={[getSelectedKey()]}
        onClick={({ key }) => {
          if (key === getSelectedKey()) return;

          // 只有点击了其他的菜单（比如去历史记录），才执行真实的跳转
          navigate(key);
        }}
        items={menuItems}
        className="flex-1 border-r-0! mt-2 custom-sidebar-menu bg-transparent!"
      />
    </div>
  );
};
