import React from "react";
import { Form, Input, Button, App } from "antd";
import { useTranslation } from "react-i18next";
interface UpdatePwdFormProps {
  onClose: () => void; // 用于点击取消或修改成功后关闭弹窗
}

export const UpdatePwdForm: React.FC<UpdatePwdFormProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log("提交的密码表单:", values);
    // TODO: 调用后端接口修改密码
    // 模拟成功后的交互
    message.success(t("SMBWM52NMOTifNaIEW_uN"));
    onClose();
  };

  // 统一的无边框浅灰底输入框样式 (移除前缀图标，高度稍微紧凑一点为 h-11)
  const inputStyles =
    "rounded-lg h-11 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-primary  transition-all";

  return (
    // 使用 layout="vertical" 让标签在上方，并用 Tailwind 强行加粗所有 label
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      size="large"
      className="pt-2 [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-gray-800"
    >
      {/* 1. 旧密码 */}
      <Form.Item
        name="oldPassword"
        label={t("D_QUhGPhceepd92L3xdfg")}
        rules={[{ required: true, message: t("o4B1kPp5pmwtQCsvmUWia") }]}
      >
        <Input.Password
          placeholder={t("o4B1kPp5pmwtQCsvmUWia")}
          className={inputStyles}
        />
      </Form.Item>

      {/* 2. 新密码 */}
      <Form.Item
        name="newPassword"
        label={t("8dOul593jEZQ00LVgvy7R")}
        rules={[
          { required: true, message: t("BPgCQ5Jpl87Ri88thWlwZ") },
          { min: 6, message: t("TDu1A9D9uQ5C1EeRh5faN") },
        ]}
      >
        <Input.Password
          placeholder={t("BPgCQ5Jpl87Ri88thWlwZ")}
          className={inputStyles}
        />
      </Form.Item>

      {/* 3. 确认新密码 (带一致性校验) */}
      <Form.Item
        name="confirmPassword"
        label={t("j3AwQDfpKunZ2mXpfDeH2")}
        dependencies={["newPassword"]}
        rules={[
          { required: true, message: t("MzZ165fMk6NNTck9m_70W") },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(t("MFsmqmV4yNMD2D4Wi072G")));
            },
          }),
        ]}
      >
        <Input.Password
          placeholder={t("MzZ165fMk6NNTck9m_70W")}
          className={inputStyles}
        />
      </Form.Item>

      {/* 底部按钮组：居中对齐 */}
      <div className="flex justify-center gap-4 mt-8 mb-2">
        <Button
          onClick={onClose}
          className="w-28 h-10 rounded-lg text-gray-600 border-gray-300 hover:text-primary hover:border-primary transition-colors"
        >
          {t("_GHogb_X8_F5-Yq_WFMNL")}
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          className="w-28 h-10 bg-primary hover:bg-secondary border-none rounded-lg text-white shadow-md shadow-indigo-500/20"
        >
          {t("VyRCMyezcXKEj2kLYHRVd")}
        </Button>
      </div>
    </Form>
  );
};
