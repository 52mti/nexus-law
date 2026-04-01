import React, { useState } from "react";
import { Form, Input, Button, Avatar, Modal } from "antd";
import {
  IdcardOutlined,
  UserOutlined,
  CrownFilled,
  FireFilled,
} from "@ant-design/icons";
import { UpdatePhoneForm } from "./UpdatePhoneForm";
import { UpdatePwdForm } from "./UpdatePwdForm";
import { useTranslation } from "react-i18next";

export const AccountInfoPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  // 预留的弹窗控制状态
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);

  // 提交表单
  const onFinish = (values: any) => {
    console.log("保存账号信息:", values);
  };

  // 统一的输入框无边框浅灰底样式
  const inputStyles =
    "rounded-lg h-11 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white transition-all text-gray-700";

  // 自定义表单 Label 渲染函数（用于在 Label 右侧加上“修改xx”的蓝色可点击文字）
  const renderLabel = (
    title: string,
    actionText?: string,
    onActionClick?: () => void,
  ) => (
    <div className="flex justify-between items-center w-full">
      <span className="font-bold text-gray-800 text-[15px]">{title}</span>
      {actionText && (
        <span
          onClick={onActionClick}
          className="text-blue-500 text-sm font-normal cursor-pointer hover:text-blue-600 transition-colors"
        >
          {actionText}
        </span>
      )}
    </div>
  );

  return (
    <div className="p-6 bg-[#fbfbff] h-max flex justify-center">
      {/* 账号信息主卡片 */}
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-130 p-8">
        {/* 卡片标题 */}
        <div className="flex items-center gap-2 mb-6">
          <IdcardOutlined className="text-primary text-xl" />
          <span className="text-lg font-bold text-gray-800 tracking-wide">
            {t("nXZTUOs7jKAumP_qtxb1r")}
          </span>
        </div>

        {/* 顶部深灰色用户信息横幅 */}
        <div className="bg-[#757575] rounded-xl p-6 flex justify-between items-center mb-8 shadow-inner">
          {/* 左侧头像区 */}
          <div className="flex flex-col items-center gap-2 cursor-pointer group">
            <Avatar
              size={56}
              icon={<UserOutlined />}
              className="bg-white text-primary group-hover:opacity-80 transition-opacity"
            />
            <span className="text-xs text-white tracking-widest">
              {t("D-gRZ59bNyDKl30c-kjq9")}
            </span>
          </div>

          {/* 右侧徽章区 */}
          <div className="flex flex-col items-end gap-3">
            {/* 黄金会员描边徽章 */}
            <div className="flex items-center gap-1 text-[13px] border border-[#dcb36d] text-[#dcb36d] px-2 py-0.5 rounded">
              <CrownFilled className="text-xs" /> {t("UWm7lVfb3sMZQcIfE4izs")}
            </div>
            {/* 积分展示 */}
            <div className="text-white text-sm flex items-center gap-1.5">
              <FireFilled className="text-gray-300" />
              {t("fiBgQpgbqy2hy1nW1pOwU")}{" "}
              <span className="font-bold text-base ml-0.5">1200</span>
            </div>
          </div>
        </div>

        {/* 表单区域：使用 vertical 布局让 label 在上方 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            nickname: t("RMSNWy1Vp2xPdEv-A2nGv"),
            phone: "180****6666",
            password: "********",
            email: "176924****qq.com",
          }}
          // 覆盖 Antd 默认的 label 宽度限制，让 flex justify-between 生效
          className="account-form w-full [&_.ant-form-item-label>label]:w-full"
        >
          {/* 用户昵称 */}
          <Form.Item
            name="nickname"
            label={renderLabel(t("4s3L5QQOD_7Qiy6KEsgZz"))}
            className="mb-5"
          >
            <Input
              placeholder={t("jrqHwRbqmoBQQHcKv6hsN")}
              className={inputStyles}
            />
          </Form.Item>

          {/* 手机号码 (带修改动作) */}
          <Form.Item
            name="phone"
            label={renderLabel(
              t("AjWfKBaFL69WcJMGbcdUG"),
              t("CrGJSBi8Jwt49o7DmJw5v"),
              () => setIsPhoneModalOpen(true),
            )}
            className="mb-5"
          >
            <Input
              disabled
              className={`${inputStyles} text-gray-500 bg-[#f7f8fa]`}
            />
          </Form.Item>

          {/* 登录密码 (带修改动作) */}
          <Form.Item
            name="password"
            label={renderLabel(
              t("6D-dxRr_zvby9-DqC0gAv"),
              t("rF8XUWJHHf-IOiFD9OkO9"),
              () => setIsPwdModalOpen(true),
            )}
            className="mb-5"
          >
            <Input.Password
              disabled
              visibilityToggle={false}
              className={`${inputStyles} text-gray-500 bg-[#f7f8fa]`}
            />
          </Form.Item>

          {/* 登录邮箱 */}
          <Form.Item
            name="email"
            label={renderLabel(t("N5Vpa7pfDjS7v4kbXf285"))}
            className="mb-8"
          >
            <Input
              placeholder={t("e2yVZYtiY-LjHLQelD4qD")}
              className={inputStyles}
            />
          </Form.Item>

          {/* 底部保存按钮 (居中短按钮) */}
          <div className="flex justify-center mt-20">
            <Button
              type="primary"
              htmlType="submit"
              className="w-48 h-11 bg-[#5a72ef] hover:bg-[#7466ec] border-none rounded-lg text-base font-medium tracking-wide shadow-md shadow-indigo-500/20 text-white"
            >
              {t("yxmUI6--n80gpeto9U3BY")}
            </Button>
          </div>
        </Form>
      </div>

      {/* ================= 预留的弹窗区域 ================= */}

      {/* 1. 修改手机弹窗 */}
      <Modal
        title={t("CrGJSBi8Jwt49o7DmJw5v")}
        centered
        open={isPhoneModalOpen}
        onCancel={() => setIsPhoneModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div className="py-4">
          {/* 传入 onClose 事件，让表单在最后一步点击“完成”时能关闭弹窗 */}
          <UpdatePhoneForm onClose={() => setIsPhoneModalOpen(false)} />
        </div>
      </Modal>

      {/* 2. 修改密码弹窗 */}
      <Modal
        title={t("rF8XUWJHHf-IOiFD9OkO9")}
        centered
        open={isPwdModalOpen}
        onCancel={() => setIsPwdModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div className="py-2">
          <UpdatePwdForm onClose={() => setIsPwdModalOpen(false)} />
        </div>
      </Modal>
    </div>
  );
};

export default AccountInfoPage;
