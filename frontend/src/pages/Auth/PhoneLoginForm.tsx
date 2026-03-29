import React, { useState } from 'react'
import { Form, Input, Checkbox, Button } from 'antd'
import {
  MobileOutlined,
  MailOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useUserStore } from '@/store/useUserStore'

// 错误提示的状态结构
interface ErrorState {
  msg: string
  type: 'warning' | 'error'
}

interface Props {
  onSwitchMode: (
    mode: AuthMode,
  ) => void
}

export const PhoneLoginForm: React.FC<Props> = ({ onSwitchMode }) => {
  const navigate = useNavigate()
  const setUser = useUserStore((state) => state.setUser)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [countdown, setCountdown] = useState(0)

  // 新增：集中式报错状态与动画触发器
  const [errorData, setErrorData] = useState<ErrorState | null>(null)
  const [shakeKey, setShakeKey] = useState<number>(0)

  // 获取验证码逻辑 (加入前置校验)
  const handleGetCode = async () => {
    if (countdown > 0) return

    try {
      // 🚀 核心逻辑：先触发表单手机号字段的校验
      await form.validateFields(['phone'])

      // 校验通过，清空错误并开始倒计时
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
      // 校验不通过，捕获错误并触发底部抖动提示
      const errorMsg = errorInfo.errorFields[0]?.errors[0]
      if (errorMsg) {
        setErrorData({ msg: errorMsg, type: 'warning' })
        setShakeKey(Date.now())
      }
    }
  }

  const onFinish = async (values: any) => {
    try {
      setLoading(true)
      const response = await login({
        username: values.phone,
        password: values.code,
        grantType: 'sms', // 短信验证码登录
      })
      // 修改兼容后端的真实数据包裹层，以避免 TypeScript 类型校验报错
      const token = (response as any)?.data?.accessToken || (response as any)?.accessToken
      if (token) {
        localStorage.setItem('token', token)
      }

      setUser(response)
      setErrorData(null)
      navigate('/')
    } catch (err) {
      console.error(err)
      setErrorData({ msg: '登录失败，请检查手机号或验证码', type: 'error' })
      setShakeKey(Date.now())
    } finally {
      setLoading(false)
    }
  }

  // 捕获表单前端校验失败事件 (必填项没填)
  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields[0]?.errors[0]
    if (firstError) {
      setErrorData({ msg: firstError, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  return (
    <>
      {/* 登录方式切换头 */}
      <div className='flex justify-between items-baseline mb-6'>
        {/* 注意：顺手帮你把这里修成了“手机登录” */}
        <span className='text-[17px] font-bold text-gray-800'>手机登录</span>
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
        onFinishFailed={onFinishFailed} // 绑定提交失败事件
        onValuesChange={() => setErrorData(null)} // 输入时清空错误
        size='large'
        // 隐藏 Antd 默认的红色文字提示
        className='w-full [&_.ant-form-item-explain]:hidden'
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
            className='rounded-lg h-12'
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
            className='rounded-lg h-12'
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

        {/* 选项区 */}
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
            loading={loading}
            className='w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'
          >
            登录
          </Button>
        </Form.Item>

        <div className='mt-4 h-12'>
          {/* 🚀 动态渲染的集中式底部报错横幅 */}
          {errorData && (
            <div
              key={shakeKey}
              className={`mt-4 flex items-center gap-2 rounded-md border px-4 py-3 text-[14px] animate-shake-y ${
                errorData.type === 'warning'
                  ? 'border-[#ffd591] bg-[#fffbe6] text-[#fa8c16]' // 橙色警告
                  : 'border-[#ffccc7] bg-[#fff2f0] text-[#ff4d4f]' // 红色错误
              }`}
            >
              {errorData.type === 'warning' ? (
                <ExclamationCircleOutlined className='text-base' />
              ) : (
                <CloseCircleOutlined className='text-base' />
              )}
              <span>{errorData.msg}</span>
            </div>
          )}
        </div>
      </Form>
    </>
  )
}
