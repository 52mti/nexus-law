import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Checkbox, Button } from 'antd'
import { UserOutlined, KeyOutlined } from '@ant-design/icons'
import {
  FormErrorMessage,
  type ErrorState,
} from '@/components/FormErrorMessage'

import { login } from '@/api/auth'
import { useUserStore } from '@/store/useUserStore'

interface Props {
  onSwitchMode: (mode: AuthMode) => void
}

interface formValue {
  email: string
  password: string
  remember: boolean
}

export const PasswordLoginForm: React.FC<Props> = ({ onSwitchMode }) => {
  const navigate = useNavigate()
  const [errorData, setErrorData] = useState<ErrorState | null>(null)
  const [shakeKey, setShakeKey] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const setUser = useUserStore((state) => state.setUser)

  const onFinish = async (values: formValue) => {
    try {
      setLoading(true)
      const response = await login({
        username: values.email, // 映射到真实的接口 username
        password: values.password,
        loginType: 'password',
        code: '123456'
      })
      // 修改兼容后端的真实数据包裹层，以避免 TypeScript 类型校验报错
      const token = (response as any)?.data?.accessToken || (response as any)?.accessToken
      if (token) {
        localStorage.setItem('token', token)
      }

      // 保存用户信息到全局store
      setUser(response)
      setErrorData(null)
      navigate('/')
    } catch (err) {
      console.error(err)
      setErrorData({ msg: '登录失败，请检查邮箱和密码', type: 'error' })
      setShakeKey(Date.now())
    } finally {
      setLoading(false)
    }
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
          name='email'
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
            loading={loading}
            className='w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'
          >
            登录
          </Button>
        </Form.Item>

        <FormErrorMessage errorData={errorData} shakeKey={shakeKey} />
      </Form>
    </>
  )
}
