import React from 'react';
import { Form, Input, Button, message } from 'antd';

interface UpdatePwdFormProps {
  onClose: () => void; // 用于点击取消或修改成功后关闭弹窗
}

export const UpdatePwdForm: React.FC<UpdatePwdFormProps> = ({ onClose }) => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('提交的密码表单:', values);
    // TODO: 调用后端接口修改密码
    // 模拟成功后的交互
    message.success('密码修改成功，请重新登录！');
    onClose(); 
  };

  // 统一的无边框浅灰底输入框样式 (移除前缀图标，高度稍微紧凑一点为 h-11)
  const inputStyles = "rounded-lg h-11 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-primary  transition-all";

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
        label="旧登录密码"
        rules={[{ required: true, message: '请输入旧登录密码' }]}
      >
        <Input.Password
          placeholder="请输入旧登录密码"
          className={inputStyles}
        />
      </Form.Item>

      {/* 2. 新密码 */}
      <Form.Item
        name="newPassword"
        label="新登录密码"
        rules={[
          { required: true, message: '请输入新登录密码' },
          { min: 6, message: '密码长度至少为6位' }
        ]}
      >
        <Input.Password
          placeholder="请输入新登录密码"
          className={inputStyles}
        />
      </Form.Item>

      {/* 3. 确认新密码 (带一致性校验) */}
      <Form.Item
        name="confirmPassword"
        label="确认新密码"
        dependencies={['newPassword']}
        rules={[
          { required: true, message: '请再次输入新密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致！'));
            },
          }),
        ]}
      >
        <Input.Password
          placeholder="请再次输入新密码"
          className={inputStyles}
        />
      </Form.Item>

      {/* 底部按钮组：居中对齐 */}
      <div className="flex justify-center gap-4 mt-8 mb-2">
        <Button 
          onClick={onClose}
          className="w-28 h-10 rounded-lg text-gray-600 border-gray-300 hover:text-primary hover:border-primary transition-colors"
        >
          取消
        </Button>
        <Button 
          type="primary" 
          htmlType="submit"
          className="w-28 h-10 bg-primary hover:bg-secondary border-none rounded-lg text-white shadow-md shadow-indigo-500/20"
        >
          确定
        </Button>
      </div>
    </Form>
  );
};