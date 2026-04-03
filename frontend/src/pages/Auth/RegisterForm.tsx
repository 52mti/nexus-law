import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Checkbox, Button, App } from 'antd'
import { FormErrorMessage, type ErrorState } from '@/components/FormErrorMessage'
import { register, getVerificationCode } from '@/api/auth'
import { useTranslation } from 'react-i18next'
interface Props {
  onSwitchMode: (mode: AuthMode) => void
}

export const RegisterForm: React.FC<Props> = ({ onSwitchMode }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { message } = App.useApp()
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
      const phone = form.getFieldValue('phone')
      console.log(phone)

      // 注意：真实接口未定义
      getVerificationCode({ mobile: phone })

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

  const onFinish = async (values: any) => {
    // 成功提交时清空报错
    setErrorData(null)
    try {
      await register({
        username: values.username,
        nickName: values.username,
        email: values.email,
        password: values.password,
        mobile: values.phone,
        code: values.code,
      })
      message.success(t('aELL9mgSuqys9CHTtF2jR'))
      onSwitchMode('pwd_login')
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.response?.data?.message || err.message || t('ABwks52RGAfXD5Y3lP55Y')
      setErrorData({ msg: errorMsg, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  // 🚀 捕获表单前端校验失败事件
  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields[0]?.errors[0]
    if (firstError) {
      setErrorData({ msg: firstError, type: 'warning' })
      setShakeKey(Date.now())
    }
  }

  // 统一的输入框基础 Tailwind 样式
  const inputStyles = 'rounded-lg h-12'

  return (
    <>
      {/* 登录方式切换头 */}
      <div className="flex justify-between items-baseline mb-6">
        <span className="text-[17px] font-bold text-gray-800">{t('TNBGWR_K6Y9nTIztorU4y')}</span>
        <a
          className="text-[14px] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
          onClick={() => onSwitchMode('pwd_login')}
        >
          {t('kXQuNgrL9k_f0M5LSI0cs')}
        </a>
      </div>

      <Form
        form={form}
        name="register_form"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed} // 绑定失败事件
        onValuesChange={() => setErrorData(null)} // 输入内容时自动清空底部的报错
        size="large"
        // 🚀 隐藏 Antd 默认的红色文字提示
        className="w-full [&_.ant-form-item-explain]:hidden"
      >
        {/* ================= 1. 用户名 (新增) ================= */}
        <Form.Item
          name="username"
          className="mb-4"
          rules={[
            { required: true, message: t('jhWz8vHGwDGGDhpVnROtS') },
            { min: 2, max: 20, message: t('W_PPZ1G5UsgugXjbybvBI') },
          ]}
        >
          <Input placeholder={t('jhWz8vHGwDGGDhpVnROtS')} className={inputStyles} />
        </Form.Item>

        {/* ================= 2. 邮箱地址 ================= */}
        <Form.Item
          name="email"
          className="mb-4"
          rules={[
            { required: true, message: t('PzrY3bTUSZEzDPQLALeKP') },
            { type: 'email', message: t('rR-jS3EoUSvUHPhxZV_pD') },
          ]}
        >
          <Input placeholder={t('PzrY3bTUSZEzDPQLALeKP')} className={inputStyles} />
        </Form.Item>

        {/* ================= 3. 登录密码 ================= */}
        <Form.Item
          name="password"
          className="mb-4"
          rules={[
            { required: true, message: t('ibJBLfFgAZA4pJFvsgxUa') },
            { min: 6, message: t('TDu1A9D9uQ5C1EeRh5faN') },
          ]}
        >
          <Input.Password placeholder={t('ibJBLfFgAZA4pJFvsgxUa')} className={inputStyles} />
        </Form.Item>

        {/* ================= 4. 手机号码 ================= */}
        <Form.Item
          name="phone"
          className="mb-4"
          rules={[
            { required: true, message: t('vQnMeRoaUdpZTxYSZfd1b') },
            { pattern: /^1[3-9]\d{9}$/, message: t('GLqPKWbxj2tgDO3EIX9mc') },
          ]}
        >
          <Input placeholder={t('vQnMeRoaUdpZTxYSZfd1b')} className={inputStyles} />
        </Form.Item>

        {/* ================= 5. 手机验证码 ================= */}
        <Form.Item
          name="code"
          className="mb-5"
          rules={[{ required: true, message: t('MuXpdQ3cGHsb4eW8eDxKo') }]}
        >
          <Input
            placeholder={t('MuXpdQ3cGHsb4eW8eDxKo')}
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
                {countdown > 0
                  ? t('EQYTcDCN5wpUaylPv-Ktn', { countdown })
                  : t('CzJkxAofKnEZhPz2Xi_Lw')}
              </span>
            }
          />
        </Form.Item>

        {/* ================= 6. 用户协议复选框 ================= */}
        <Form.Item
          name="agreement"
          valuePropName="checked"
          className="mb-6"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error(t('Ziloo7FwfdpeFadytf43i'))),
            },
          ]}
        >
          <Checkbox className="text-gray-500 text-[13px]">
            {t('Y7vc13weRYMS5LQazd7s5')}
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:text-blue-600 ml-1"
              onClick={(e) => e.stopPropagation()} // 防止点击链接时触发 checkbox 的切换
            >
              {t('yFoPxdqlh907bCo-htUqn')}
            </a>
          </Checkbox>
        </Form.Item>

        {/* ================= 7. 注册按钮 ================= */}
        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            className="w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20"
          >
            {t('Q3lVWqRdv4O4B59Xn48OR')}
          </Button>
        </Form.Item>

        {/* 🚀 引入公共的报错组件，并传入状态 */}
        <FormErrorMessage errorData={errorData} shakeKey={shakeKey} />
      </Form>
    </>
  )
}
