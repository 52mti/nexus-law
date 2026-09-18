import React, { useState } from 'react'
import { Form, Input, Button, Steps, App } from 'antd'
import { MailOutlined, MobileOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getApiErrorMessage, sendCode, updateProfile } from '@/api/auth'
import { useUserStore } from '@/store/useUserStore'

interface UpdatePhoneFormProps {
  onClose: () => void
}

export const UpdatePhoneForm: React.FC<UpdatePhoneFormProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const setMemberInfo = useUserStore((state) => state.setMemberInfo)
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [countdown, setCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleGetCode = async () => {
    if (countdown > 0) return
    try {
      await form.validateFields(['newPhone'])
      const phone = form.getFieldValue('newPhone')
      const data = await sendCode({ scene: 'bind_contact', phone })
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
      message.success(data.code ? `验证码：${data.code}` : t('6N65PF1mph7tUzYruoBZ-'))
    } catch (error: any) {
      const errorMsg = error.errorFields?.[0]?.errors?.[0] || getApiErrorMessage(error)
      message.error(errorMsg)
    }
  }

  const onFinish = async (values: { newPhone: string; newCode: string }) => {
    try {
      setSubmitting(true)
      const profile = await updateProfile({
        phone: values.newPhone,
        code: values.newCode,
      })
      setMemberInfo(profile)
      setCurrentStep(1)
    } catch (error) {
      message.error(getApiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyles =
    'rounded-lg h-12 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-primary  transition-all'
  const buttonStyles =
    'w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'

  return (
    <div className="w-full pt-2">
      <Steps
        current={currentStep}
        type="dot"
        items={[{ title: t('lG3tjJSqJHzO08P7BKcwB') }, { title: t('EO9WF7b0HVOFibftS0iLW') }]}
        className="mb-8 custom-steps-text-sm"
      />

      {currentStep === 0 && (
        <Form form={form} onFinish={onFinish} size="large" className="px-4 animate-fade-in">
          <Form.Item
            name="newPhone"
            className="mb-5"
            rules={[
              { required: true, message: t('W-fnunlPVchKiMcSKDlOh') },
              { pattern: /^1[3-9]\d{9}$/, message: t('GLqPKWbxj2tgDO3EIX9mc') },
            ]}
          >
            <Input
              prefix={<MobileOutlined className="text-gray-400 text-lg mr-1.5" />}
              placeholder={t('W-fnunlPVchKiMcSKDlOh')}
              className={inputStyles}
            />
          </Form.Item>

          <Form.Item
            name="newCode"
            className="mb-6"
            rules={[{ required: true, message: t('ElK_5bnTZNp2icI2YGtV1') }]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400 text-lg mr-1.5" />}
              placeholder={t('ElK_5bnTZNp2icI2YGtV1')}
              className={inputStyles}
              suffix={
                <span
                  onClick={handleGetCode}
                  className={`text-[14px] transition-colors select-none ${
                    countdown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-primary hover:text-secondary cursor-pointer'
                  }`}
                >
                  {countdown > 0
                    ? t('EQYTcDCN5wpUaylPv-Ktn', { countdown })
                    : t('CzJkxAofKnEZhPz2Xi_Lw')}
                </span>
              }
            />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button type="primary" htmlType="submit" loading={submitting} className={buttonStyles}>
              {t('mCzAHgECjBBSMsiSEZioJ')}
            </Button>
          </Form.Item>
        </Form>
      )}

      {currentStep === 1 && (
        <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
          <CheckCircleFilled className="text-primary text-[64px] mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">{t('0Ar0qTDnCmjgSc2BM1RU1')}</h2>
          <p className="text-sm text-gray-500 mb-8">{t('Z_v6vTztbuGDsZveMrXmC')}</p>
          <Button type="primary" className={buttonStyles} onClick={onClose}>
            {t('j0zAWnLUNl3s8Ish4QY8t')}
          </Button>
        </div>
      )}
    </div>
  )
}
