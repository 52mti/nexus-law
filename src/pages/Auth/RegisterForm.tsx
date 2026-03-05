import React, { useState } from 'react'
import { Form, Input, Checkbox, Button } from 'antd'

interface Props {
  // 如果你的 Wrapper 需要控制模式切换，可以保留 Props
  onSwitchMode: (
    mode: 'pwd_login' | 'phone_login' | 'register' | 'reset_pwd',
  ) => void
}

export const RegisterForm: React.FC<Props> = ({ onSwitchMode }) => {
  const [form] = Form.useForm()
  const [countdown, setCountdown] = useState(0)

  // 获取验证码倒计时逻辑
  const handleGetCode = () => {
    if (countdown > 0) return

    // 实际业务中这里应该先校验手机号： form.validateFields(['phone']).then(...)
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const onFinish = (values: any) => {
    console.log('Register Form Submitted:', values)
  }

  // 统一的输入框基础 Tailwind 样式
  const inputStyles =
    'rounded-lg h-12 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all'

  return (
    <>
      {/* 登录方式切换头 */}
      <div className='flex justify-between items-baseline mb-6'>
        <span className='text-[17px] font-bold text-gray-800'>注册账号</span>
        <a
          className='text-[14px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
          onClick={() => onSwitchMode('pwd_login')}
        >
          前往登录
        </a>
      </div>

      <Form
        form={form}
        name='register_form'
        onFinish={onFinish}
        size='large'
        className='w-full'
      >
        {/* 1. 用户名称 */}
        <Form.Item
          name='username'
          className='mb-4'
          rules={[{ required: true, message: '请输入用户名称' }]}
        >
          <Input placeholder='请输入用户名称' className={inputStyles} />
        </Form.Item>

        {/* 2. 登录密码 */}
        <Form.Item
          name='password'
          className='mb-4'
          rules={[
            { required: true, message: '请输入登录密码' },
            { min: 6, message: '密码长度至少为6位' },
          ]}
        >
          <Input.Password
            placeholder='请输入登录密码'
            className={inputStyles}
          />
        </Form.Item>

        {/* 3. 手机号码 */}
        <Form.Item
          name='phone'
          className='mb-4'
          rules={[
            { required: true, message: '请输入手机号码' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]}
        >
          <Input placeholder='请输入手机号码' className={inputStyles} />
        </Form.Item>

        {/* 4. 手机验证码 */}
        <Form.Item
          name='code'
          className='mb-5'
          rules={[{ required: true, message: '请输入手机验证码' }]}
        >
          <Input
            placeholder='请输入手机验证码'
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

        {/* 5. 用户协议复选框 */}
        <Form.Item
          name='agreement'
          valuePropName='checked'
          className='mb-6'
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error('请先阅读并同意用户服务协议')),
            },
          ]}
        >
          <Checkbox className='text-gray-500 text-[13px]'>
            我已经阅读并同意
            <a
              href='/terms'
              target='_blank'
              rel='noreferrer'
              className='text-blue-500 hover:text-blue-600 ml-1'
              onClick={(e) => e.stopPropagation()} // 防止点击链接时触发 checkbox 的切换
            >
              《用户服务协议》
            </a>
          </Checkbox>
        </Form.Item>

        {/* 6. 注册按钮 */}
        <Form.Item className='mb-0'>
          <Button
            type='primary'
            htmlType='submit'
            className='w-full h-12 bg-[#666cff] hover:bg-[#585ee6] border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'
          >
            注册
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}
