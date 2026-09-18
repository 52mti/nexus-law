import React, { useState } from "react";
import { Form, Input, Button, App } from "antd";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage, updatePassword } from "@/api/auth";

interface UpdatePwdFormProps {
  onClose: () => void;
}

export const UpdatePwdForm: React.FC<UpdatePwdFormProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    oldPassword: string;
    newPassword: string;
  }) => {
    try {
      setLoading(true);
      await updatePassword({
        old_password: values.oldPassword,
        new_password: values.newPassword,
      });
      message.success(t("SMBWM52NMOTifNaIEW_uN"));
      onClose();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "rounded-lg h-11 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-primary  transition-all";

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      size="large"
      className="pt-2 [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-gray-800"
    >
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

      <Form.Item
        name="newPassword"
        label={t("8dOul593jEZQ00LVgvy7R")}
        rules={[
          { required: true, message: t("BPgCQ5Jpl87Ri88thWlwZ") },
          { min: 8, message: t("TDu1A9D9uQ5C1EeRh5faN") },
        ]}
      >
        <Input.Password
          placeholder={t("BPgCQ5Jpl87Ri88thWlwZ")}
          className={inputStyles}
        />
      </Form.Item>

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
          loading={loading}
          className="w-28 h-10 bg-primary hover:bg-secondary border-none rounded-lg text-white shadow-md shadow-indigo-500/20"
        >
          {t("VyRCMyezcXKEj2kLYHRVd")}
        </Button>
      </div>
    </Form>
  );
};
