import React, { useState } from 'react'
import { Form, Input, Checkbox, Button } from 'antd'
import { MobileOutlined, MailOutlined } from '@ant-design/icons'

// 如果你的 Wrapper 需要控制模式切换，可以保留 Props；如果不需要，删掉即可
interface Props {
  onSwitchMode: (
    mode: 'pwd_login' | 'phone_login' | 'register' | 'reset_pwd',
  ) => void
}

export const PhoneLoginForm: React.FC<Props> = ({ onSwitchMode }) => {
  const [form] = Form.useForm()
  // 验证码倒计时状态
  const [countdown, setCountdown] = useState(0)

  // 模拟发送验证码逻辑
  const handleGetCode = () => {
    if (countdown > 0) return

    // TODO: 这里可以先触发表单手机号字段的校验，成功后再调接口
    // form.validateFields(['phone']).then(() => { ... })

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
    console.log('Phone Login Success:', values)
  }

  return (
    <>
      {/* 登录方式切换头 */}
      <div className='flex justify-between items-baseline mb-6'>
        <span className='text-[17px] font-bold text-gray-800'>密码登录</span>
        <a
          className='text-[14px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
          onClick={() => onSwitchMode('pwd_login')}
        >
          邮箱登录
        </a>
      </div>
      <Form
        form={form}
        name='phone_login'
        initialValues={{ remember: false }}
        onFinish={onFinish}
        size='large'
        className='w-full'
      >
        {/* 手机号输入框 */}
        <Form.Item
          name='phone'
          className='mb-5'
          rules={[
            { required: true, message: '请输入手机号码' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]}
        >
          <Input
            prefix={<MobileOutlined className='text-gray-400 text-lg mr-1.5' />}
            placeholder='请输入手机号码'
            className='rounded-lg h-12 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all'
          />
        </Form.Item>

        {/* 短信验证码输入框 */}
        <Form.Item
          name='code'
          className='mb-6'
          rules={[{ required: true, message: '请输入短信验证码' }]}
        >
          <Input
            prefix={<MailOutlined className='text-gray-400 text-lg mr-1.5' />}
            placeholder='请输入短信验证码'
            className='rounded-lg h-12 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all'
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

        {/* 选项区：原图中只有左侧的记住登录状态，没有忘记密码等额外操作 */}
        <div className='flex justify-start items-center mb-6 text-sm'>
          <Form.Item name='remember' valuePropName='checked' noStyle>
            <Checkbox className='text-gray-500'>记住登录状态</Checkbox>
          </Form.Item>
        </div>

        {/* 登录按钮 */}
        <Form.Item className='mb-0'>
          <Button
            type='primary'
            htmlType='submit'
            className='w-full h-12 bg-[#666cff] hover:bg-[#585ee6] border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'
          >
            登录
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}
