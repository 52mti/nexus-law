import React, { useState } from 'react'
import { Form, Input, Checkbox, Button } from 'antd'
// 🚀 引入公共报错组件和类型
import {
  FormErrorMessage,
  type ErrorState,
} from '@/components/FormErrorMessage'

interface Props {
  onSwitchMode: (
    mode: 'pwd_login' | 'phone_login' | 'register' | 'reset_pwd',
  ) => void
}

export const RegisterForm: React.FC<Props> = ({ onSwitchMode }) => {
  const [form] = Form.useForm()
  const [countdown, setCountdown] = useState(0)

  // 🚀 新增：统一的错误状态和抖动 Key
  const [errorData, setErrorData] = useState<ErrorState | null>(null)
  const [shakeKey, setShakeKey] = useState<number>(0)

  // 获取验证码倒计时逻辑
  const handleGetCode = async () => {
    if (countdown > 0) return

    try {
      // 🚀 先校验手机号字段
      await form.validateFields(['phone'])

      // 校验通过，清空错误，开始倒计时
      setErrorData(null)
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
    } catch (errorInfo: any) {
      // 校验失败，触发底部抖动提示
      const errorMsg = errorInfo.errorFields[0]?.errors[0]
      if (errorMsg) {
        setErrorData({ msg: errorMsg, type: 'warning' })
        setShakeKey(Date.now())
      }
    }
  }

  const onFinish = (values: any) => {
    // 成功提交时清空报错
    setErrorData(null)
    console.log('Register Form Submitted:', values)
    // TODO: 接口请求，如果后端返回账号已存在等错误，可按如下方式触发：
    // setErrorData({ msg: '该手机号已被注册', type: 'error' })
    // setShakeKey(Date.now())
  }

  // 🚀 捕获表单前端校验失败事件
  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields[0]?.errors[0]
    if (firstError) {
      setErrorData({ msg: firstError, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  // 统一的输入框基础 Tailwind 样式 (顺手帮你补全了无边框灰底的质感样式)
  const inputStyles = 'rounded-lg h-12'

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
        onFinishFailed={onFinishFailed} // 绑定失败事件
        onValuesChange={() => setErrorData(null)} // 输入内容时自动清空底部的报错
        size='large'
        // 🚀 隐藏 Antd 默认的红色文字提示
        className='w-full [&_.ant-form-item-explain]:hidden'
      >
        {/* 1. 邮箱地址 */}
        <Form.Item
          name='email'
          className='mb-4'
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input placeholder='请输入邮箱地址' className={inputStyles} />
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

        {/* 🚀 引入公共的报错组件，并传入状态 */}
        <FormErrorMessage errorData={errorData} shakeKey={shakeKey} />
      </Form>
    </>
  )
}
