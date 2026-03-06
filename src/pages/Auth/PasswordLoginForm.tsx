import React, { useState } from 'react'
import { Form, Input, Checkbox, Button } from 'antd'
import { UserOutlined, KeyOutlined } from '@ant-design/icons'
import {
  FormErrorMessage,
  type ErrorState,
} from '@/components/FormErrorMessage'

interface Props {
  onSwitchMode: (
    mode: 'pwd_login' | 'phone_login' | 'register' | 'reset_pwd',
  ) => void
}

export const PasswordLoginForm: React.FC<Props> = ({ onSwitchMode }) => {
  const [errorData, setErrorData] = useState<ErrorState | null>(null)
  const [shakeKey, setShakeKey] = useState<number>(0)

  // 模拟登录提交
  const onFinish = (values: any) => {
    // 【模拟接口校验】：假设账号密码不对，触发红色的错误提示
    if (values.username !== 'admin@test.com' || values.password !== '123456') {
      setErrorData({ msg: '用户名或密码不正确', type: 'error' })
      setShakeKey(Date.now()) // 同样触发抖动动画
      return
    }

    // 成功则清空错误，执行后续逻辑
    setErrorData(null)
    console.log('登录成功:', values)
  }

  // 捕获表单前端校验失败事件 (必填项没填)
  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields[0]?.errors[0]
    if (firstError) {
      // 表单缺失信息，触发橙色的警告提示
      setErrorData({ msg: firstError, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  return (
    <>
      <div className='flex justify-between items-baseline mb-6'>
        <span className='text-[17px] font-bold text-gray-800'>密码登录</span>
        <a
          className='text-[14px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
          onClick={() => onSwitchMode('phone_login')}
        >
          手机登录
        </a>
      </div>

      <Form
        name='login'
        initialValues={{ remember: false }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        // 当用户开始重新输入时，自动清空底部的错误提示
        onValuesChange={() => setErrorData(null)}
        size='large'
        className='w-full [&_.ant-form-item-explain]:hidden'
      >
        <Form.Item
          name='username'
          className='mb-6'
          rules={[{ required: true, message: '请填写用户账号' }]}
        >
          <Input
            prefix={<UserOutlined className='text-blue-500 text-lg mr-1' />}
            placeholder='请输入用户邮箱'
            autoFocus
            className='rounded-lg h-12'
          />
        </Form.Item>

        <Form.Item
          name='password'
          className='mb-5'
          rules={[{ required: true, message: '请填写登录密码' }]}
        >
          <Input.Password
            prefix={<KeyOutlined className='text-gray-400 text-lg mr-1' />}
            placeholder='请输入登录密码'
            className='rounded-lg h-12'
          />
        </Form.Item>

        <div className='flex justify-between items-center mb-6 text-sm'>
          <Form.Item name='remember' valuePropName='checked' noStyle>
            <Checkbox className='text-gray-500'>记住登录状态</Checkbox>
          </Form.Item>

          <div className='flex gap-4'>
            <a
              className='text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
              onClick={() => onSwitchMode('register')}
            >
              注册账号
            </a>
            <a
              className='text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
              onClick={() => onSwitchMode('reset_pwd')}
            >
              忘记密码?
            </a>
          </div>
        </div>

        <Form.Item className='mb-0'>
          <Button
            type='primary'
            htmlType='submit'
            className='w-full h-12 bg-[#666cff] hover:bg-[#585ee6] border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'
          >
            登录
          </Button>
        </Form.Item>

        <FormErrorMessage errorData={errorData} shakeKey={shakeKey} />
      </Form>
    </>
  )
}
