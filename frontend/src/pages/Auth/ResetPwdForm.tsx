import React, { useState } from 'react'
import { Form, Input, Button, Steps, App } from 'antd'
import {
  MobileOutlined,
  MailOutlined,
  KeyOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
// 🚀 引入公共报错组件和类型
import { FormErrorMessage, type ErrorState } from '@/components/FormErrorMessage'
import { getVerificationCode, checkCode, changePassword } from '@/api/auth'
import { useUserStore } from '@/store/useUserStore'

interface Props {
  onSwitchMode: (
    mode: AuthMode,
  ) => void
}

export const ResetPwdForm: React.FC<Props> = ({ onSwitchMode }) => {
  const { message } = App.useApp()
  const user = useUserStore((state) => state.user)
  const [currentStep, setCurrentStep] = useState(0)

  const [formStep0] = Form.useForm()
  const [formStep1] = Form.useForm()

  const [countdown, setCountdown] = useState(0)

  // 🚀 新增：跨步骤共享的错误状态和抖动 Key
  const [errorData, setErrorData] = useState<ErrorState | null>(null)
  const [shakeKey, setShakeKey] = useState<number>(0)

  // 获取验证码逻辑
  const handleGetCode = async () => {
    if (countdown > 0) return

    try {
      // 🚀 优先校验手机号字段
      await formStep0.validateFields(['phone'])
      const phone = formStep0.getFieldValue('phone')

      await getVerificationCode({ mobile: phone })
      message.success('验证码已发送')

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
      // 校验失败，触发警告
      const errorMsg = errorInfo.errorFields[0]?.errors[0]
      if (errorMsg) {
        setErrorData({ msg: errorMsg, type: 'warning' })
        setShakeKey(Date.now())
      }
    }
  }

  // 步骤 1：验证手机号提交
  const onFinishStep0 = async (values: any) => {
    console.log('Step 0 (Phone verified):', values)
    setErrorData(null) // 成功进入下一步前清空报错
    try {
      await checkCode({ mobile: values.phone, code: values.code })
      setCurrentStep(1)
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.response?.data?.message || err.message || '验证码错误'
      setErrorData({ msg: errorMsg, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  // 步骤 2：设置新密码提交
  const onFinishStep1 = async (values: any) => {
    console.log('Step 1 (New password set):', values)
    setErrorData(null) // 成功进入下一步前清空报错
    try {
      // 尝试从 Store 中提取 username，这里做了 any 强转是因为 LoginResp 类型中未显式声明 username
      const username = (user as any)?.username || (user as any)?.account || 'test';
      if (!username) {
        throw new Error('未获取到您的账户信息，请确保此时存在可用的用户信息');
      }
      await changePassword({ username, password: values.password })
      setCurrentStep(2)
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.response?.data?.message || err.message || '密码修改失败'
      setErrorData({ msg: errorMsg, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  // 🚀 统一的失败处理函数，两个表单都可以复用
  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields[0]?.errors[0]
    if (firstError) {
      setErrorData({ msg: firstError, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  // 保持你原有的 UI 样式字典不变
  const inputStyles = 'rounded-lg h-12'
  const buttonStyles =
    'w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'

  const stepItems = [
    { title: '验证手机号码' },
    { title: '设置新密码' },
    { title: '密码重置成功' },
  ]

  return (
    <div className='w-full'>
      {/* 步骤指示器（全局常驻） */}
      <Steps
        current={currentStep}
        type='dot'
        items={stepItems}
        className='mb-8! custom-steps-text-sm'
      />

      {/* 标题与切换区域 (仅在步骤 0 和 1 显示) */}
      {currentStep < 2 && (
        <div className='flex justify-between items-baseline mb-6'>
          <span className='text-[17px] font-bold text-gray-800'>
            {currentStep === 0 ? '重置密码' : '设置新密码'}
          </span>
          <a
            onClick={() => onSwitchMode('pwd_login')}
            className='text-sm text-blue-500 hover:text-blue-600 transition-colors cursor-pointer'
          >
            前往登录
          </a>
        </div>
      )}

      {/* ======= 步骤 0：验证手机号码 ======= */}
      {currentStep === 0 && (
        <Form
          form={formStep0}
          name='reset_pwd_step0'
          onFinish={onFinishStep0}
          onFinishFailed={onFinishFailed} // 🚀 绑定失败事件
          onValuesChange={() => setErrorData(null)} // 🚀 输入时清空
          size='large'
          className='[&_.ant-form-item-explain]:hidden' // 🚀 隐藏 Antd 默认提示
        >
          <Form.Item
            name='phone'
            className='mb-5'
            rules={[
              { required: true, message: '请输入手机号码' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input
              prefix={
                <MobileOutlined className='text-gray-400 text-lg mr-1.5' />
              }
              placeholder='请输入手机号码'
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item
            name='code'
            className='mb-6'
            rules={[{ required: true, message: '请输入短信验证码' }]}
          >
            <Input
              prefix={<MailOutlined className='text-gray-400 text-lg mr-1.5' />}
              placeholder='请输入短信验证码'
              className={inputStyles}
              suffix={
                <span
                  onClick={handleGetCode}
                  className={`text-[14px] transition-colors select-none ${countdown > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-500 hover:text-blue-600 cursor-pointer'
                    }`}
                >
                  {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
                </span>
              }
            />
          </Form.Item>

          <Form.Item className='mb-0'>
            <Button type='primary' htmlType='submit' className={buttonStyles}>
              下一步
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ======= 步骤 1：设置新密码 ======= */}
      {currentStep === 1 && (
        <Form
          form={formStep1}
          name='reset_pwd_step1'
          onFinish={onFinishStep1}
          onFinishFailed={onFinishFailed} // 🚀 绑定失败事件
          onValuesChange={() => setErrorData(null)} // 🚀 输入时清空
          size='large'
          className='[&_.ant-form-item-explain]:hidden' // 🚀 隐藏 Antd 默认提示
        >
          <Form.Item
            name='password'
            className='mb-5'
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' },
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined className='text-gray-400 text-lg mr-1.5' />}
              placeholder='请输入新密码 (至少6位)'
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item
            name='confirmPassword'
            className='mb-6'
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致！'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined className='text-gray-400 text-lg mr-1.5' />}
              placeholder='请再次确认新密码'
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item className='mb-0'>
            <Button type='primary' htmlType='submit' className={buttonStyles}>
              确认重置
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* 🚀 在这里统一渲染报错组件 (仅在步骤 0 和 1 时需要渲染) */}
      {currentStep < 2 && (
        <FormErrorMessage errorData={errorData} shakeKey={shakeKey} />
      )}

      {/* ======= 步骤 2：密码重置成功 ======= */}
      {currentStep === 2 && (
        <div className='flex flex-col items-center justify-center py-6 animate-fade-in'>
          <CheckCircleFilled className='text-primary text-[64px] mb-5 shadow-sm rounded-full' />

          <h2 className='text-xl font-bold text-gray-800 mb-2'>密码重置成功</h2>
          <p className='text-sm text-gray-500 mb-8'>
            您的账户密码已更新，请妥善保管
          </p>

          <Button
            type='primary'
            className={buttonStyles}
            onClick={() => onSwitchMode('pwd_login')}
          >
            立即登录
          </Button>
        </div>
      )}
    </div>
  )
}