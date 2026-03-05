import React, { useState } from 'react';
import { Form, Input, Button, Steps } from 'antd';
import { 
  MobileOutlined, 
  MailOutlined, 
  KeyOutlined, 
  CheckCircleFilled 
} from '@ant-design/icons';

interface Props {
  onSwitchMode: (mode: 'pwd_login' | 'phone_login' | 'register' | 'reset_pwd') => void;
}

export const ResetPwdForm: React.FC<Props> = ({ onSwitchMode }) => {
  // 增加步骤控制状态：0-验证手机，1-设置新密码，2-重置成功
  const [currentStep, setCurrentStep] = useState(0);
  
  // 两个步骤的表单实例独立管理
  const [formStep0] = Form.useForm();
  const [formStep1] = Form.useForm();
  
  const [countdown, setCountdown] = useState(0);

  // 获取验证码倒计时逻辑
  const handleGetCode = () => {
    if (countdown > 0) return;
    
    // 实际业务中这里应该先校验手机号格式： formStep0.validateFields(['phone']).then(...)
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 步骤 1：验证手机号提交
  const onFinishStep0 = (values: any) => {
    console.log('Step 0 (Phone verified):', values);
    // TODO: 调用后端接口验证验证码是否正确，成功后进入下一步
    setCurrentStep(1); 
  };

  // 步骤 2：设置新密码提交
  const onFinishStep1 = (values: any) => {
    console.log('Step 1 (New password set):', values);
    // TODO: 调用后端接口提交新密码，成功后进入成功提示页
    setCurrentStep(2); 
  };

  // 统一的 UI 样式字典
  const inputStyles = "rounded-lg h-12 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all";
  const buttonStyles = "w-full h-12 bg-[#666cff] hover:bg-[#585ee6] border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20";

  // 步骤条配置
  const stepItems = [
    { title: '验证手机号码' },
    { title: '设置新密码' },
    { title: '密码重置成功' },
  ];

  return (
    <div className="w-full">
      {/* 步骤指示器（全局常驻） */}
      <Steps 
        current={currentStep} 
        type='dot'
        items={stepItems} 
        className="mb-8! custom-steps-text-sm" 
      />

      {/* 标题与切换区域 (仅在步骤 0 和 1 显示) */}
      {currentStep < 2 && (
        <div className="flex justify-between items-baseline mb-6">
          <span className="text-[17px] font-bold text-gray-800">
            {currentStep === 0 ? '重置密码' : '设置新密码'}
          </span>
          <a 
            onClick={() => onSwitchMode('pwd_login')} 
            className="text-sm text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            前往登录
          </a>
        </div>
      )}

      {/* ======= 步骤 0：验证手机号码 ======= */}
      {currentStep === 0 && (
        <Form
          form={formStep0}
          name="reset_pwd_step0"
          onFinish={onFinishStep0}
          size="large"
        >
          <Form.Item
            name="phone"
            className="mb-5"
            rules={[
              { required: true, message: '请输入手机号码' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
            ]}
          >
            <Input
              prefix={<MobileOutlined className="text-gray-400 text-lg mr-1.5" />}
              placeholder="请输入手机号码"
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item
            name="code"
            className="mb-6"
            rules={[{ required: true, message: '请输入短信验证码' }]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400 text-lg mr-1.5" />}
              placeholder="请输入短信验证码"
              className={inputStyles}
              suffix={
                <span
                  onClick={handleGetCode}
                  className={`text-[14px] transition-colors select-none ${
                    countdown > 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-blue-500 hover:text-blue-600 cursor-pointer'
                  }`}
                >
                  {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
                </span>
              }
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" className={buttonStyles}>
              下一步
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ======= 步骤 1：设置新密码 ======= */}
      {currentStep === 1 && (
        <Form
          form={formStep1}
          name="reset_pwd_step1"
          onFinish={onFinishStep1}
          size="large"
        >
          <Form.Item
            name="password"
            className="mb-5"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' }
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined className="text-gray-400 text-lg mr-1.5" />}
              placeholder="请输入新密码 (至少6位)"
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            className="mb-6"
            dependencies={['password']} // 依赖 password 字段，password改变时会重新触发这里的校验
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致！'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined className="text-gray-400 text-lg mr-1.5" />}
              placeholder="请再次确认新密码"
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" className={buttonStyles}>
              确认重置
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ======= 步骤 2：密码重置成功 ======= */}
      {currentStep === 2 && (
        <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
          {/* 使用与按钮同色的靛蓝色作为成功图标色 */}
          <CheckCircleFilled className="text-[#666cff] text-[64px] mb-5 shadow-sm rounded-full" />
          
          <h2 className="text-xl font-bold text-gray-800 mb-2">密码重置成功</h2>
          <p className="text-sm text-gray-500 mb-8">
            您的账户密码已更新，请妥善保管
          </p>
          
          <Button 
            type="primary" 
            className={buttonStyles} 
            onClick={() => onSwitchMode('pwd_login')}
          >
            立即登录
          </Button>
        </div>
      )}
    </div>
  );
};