import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Checkbox, Button } from "antd";
import { UserOutlined, KeyOutlined } from "@ant-design/icons";
import {
  FormErrorMessage,
  type ErrorState,
} from "@/components/FormErrorMessage";

import { login } from "@/api/auth";
import { useUserStore } from "@/store/useUserStore";
import { useTranslation } from "react-i18next";
interface Props {
  onSwitchMode: (mode: AuthMode) => void;
}

interface formValue {
  email: string;
  password: string;
  remember: boolean;
}

export const PasswordLoginForm: React.FC<Props> = ({ onSwitchMode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [errorData, setErrorData] = useState<ErrorState | null>(null);
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const setUser = useUserStore((state) => state.setUser);

  const onFinish = async (values: formValue) => {
    try {
      setLoading(true);
      const response = await login({
        username: values.email, // 映射到真实的接口 username
        password: values.password,
        loginType: "member_password",
        code: "123456",
      });
      // 修改兼容后端的真实数据包裹层，以避免 TypeScript 类型校验报错
      const token =
        (response as any)?.data?.accessToken || (response as any)?.accessToken;
      if (token) {
        localStorage.setItem("token", token);
      }

      // 保存用户信息到全局store
      setUser(response);
      setErrorData(null);
      navigate("/");
    } catch (err) {
      console.error(err);
      setErrorData({ msg: t("nIO4XnSftkLpv06cCgfl2"), type: "error" });
      setShakeKey(Date.now());
    } finally {
      setLoading(false);
    }
  };

  // 捕获表单前端校验失败事件 (必填项没填)
  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields[0]?.errors[0];
    if (firstError) {
      // 表单缺失信息，触发橙色的警告提示
      setErrorData({ msg: firstError, type: "warning" });
      setShakeKey(Date.now());
    }
  };

  return (
    <>
      <div className="flex justify-between items-baseline mb-6">
        <span className="text-[17px] font-bold text-gray-800">
          {t("qPRtVUR1dXRS3o2okNqsG")}
        </span>
        <a
          className="text-[14px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
          onClick={() => onSwitchMode("phone_login")}
        >
          {t("pAmyjO0PJbZ8MEO9BoOGY")}{" "}
        </a>
      </div>

      <Form
        name="login"
        initialValues={{ remember: false }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        // 当用户开始重新输入时，自动清空底部的错误提示
        onValuesChange={() => setErrorData(null)}
        size="large"
        className="w-full [&_.ant-form-item-explain]:hidden"
      >
        <Form.Item
          name="email"
          className="mb-6"
          rules={[{ required: true, message: t("2YnabB8M4oUQg3geXkFGh") }]}
        >
          <Input
            prefix={<UserOutlined className="text-blue-500 text-lg mr-1" />}
            placeholder={t("EZd_LN1Vt2xWTtKffhdKX")}
            autoFocus
            className="rounded-lg h-12"
          />
        </Form.Item>

        <Form.Item
          name="password"
          className="mb-5"
          rules={[{ required: true, message: t("jO9vXm4X8tk6XiXgbQ1iO") }]}
        >
          <Input.Password
            prefix={<KeyOutlined className="text-gray-400 text-lg mr-1" />}
            placeholder={t("ibJBLfFgAZA4pJFvsgxUa")}
            className="rounded-lg h-12"
          />
        </Form.Item>

        <div className="flex justify-between items-center mb-6 text-sm">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox className="text-gray-500">
              {t("re8zqAWm1FpwnB0sHH5C3")}
            </Checkbox>
          </Form.Item>

          <div className="flex gap-4">
            <a
              className="text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
              onClick={() => onSwitchMode("register")}
            >
              {t("TNBGWR_K6Y9nTIztorU4y")}
            </a>
            <a
              className="text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
              onClick={() => onSwitchMode("reset_pwd")}
            >
              {t("9EYGnd4Cyodb01nMyW6B2")}
            </a>
          </div>
        </div>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20"
          >
            {t("8COh3xoW8nfdMYt2nI0HT")}
          </Button>
        </Form.Item>

        <FormErrorMessage errorData={errorData} shakeKey={shakeKey} />
      </Form>
    </>
  );
};
