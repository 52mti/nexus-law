import React from 'react'
import { Form, Input, Checkbox, Button } from 'antd'
import { UserOutlined, KeyOutlined } from '@ant-design/icons'

interface Props {
  onSwitchMode: (
    mode: 'pwd_login' | 'phone_login' | 'register' | 'reset_pwd',
  ) => void
}

export const PasswordLoginForm: React.FC<Props> = ({ onSwitchMode }) => {
  const onFinish = (values: any) => {
    console.log('Success:', values)
  }

  return (
    // 页面整体背景与居中布局
    <>
      {/* 登录方式切换头 */}
      <div className='flex justify-between items-baseline mb-6'>
        <span className='text-[17px] font-bold text-gray-800'>密码登录</span>
        <a
          className='text-[14px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
          onClick={() => onSwitchMode('phone_login')}
        >
          手机登录
        </a>
      </div>

      {/* 表单区域 */}
      <Form
        name='login'
        initialValues={{ remember: false }}
        onFinish={onFinish}
        size='large'
        className='w-full'
      >
        {/* 账号输入框：图片中处于 focus 状态，图标和边框为蓝色 */}
        <Form.Item name='username' className='mb-6'>
          <Input
            prefix={<UserOutlined className='text-blue-500 text-lg mr-1' />}
            placeholder='请输入用户邮箱'
            autoFocus // 自动聚焦以还原设计图中的蓝色边框激活状态
            className='rounded-lg h-12'
          />
        </Form.Item>

        {/* 密码输入框 */}
        <Form.Item name='password' className='mb-5'>
          <Input.Password
            prefix={<KeyOutlined className='text-gray-400 text-lg mr-1' />}
            placeholder='请输入登录密码'
            className='rounded-lg h-12'
          />
        </Form.Item>

        {/* 选项及链接区 */}
        <div className='flex justify-between items-center mb-6 text-sm'>
          <Form.Item name='remember' valuePropName='checked' noStyle>
            <Checkbox className='text-gray-500'>记住登录状态</Checkbox>
          </Form.Item>

          <div className='flex gap-4'>
            <a className='text-blue-500 hover:text-blue-600 transition-colors' onClick={() => onSwitchMode('register')}>
              注册账号
            </a>
            <a className='text-blue-500 hover:text-blue-600 transition-colors' onClick={() => onSwitchMode('reset_pwd')}>
              忘记密码?
            </a>
          </div>
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
