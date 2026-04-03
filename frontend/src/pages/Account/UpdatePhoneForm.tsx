import React, { useState } from 'react'
import { Form, Input, Button, Steps } from 'antd'
import { MailOutlined, MobileOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
interface UpdatePhoneFormProps {
  onClose: () => void // 用于在最后一步完成后关闭弹窗
}

export const UpdatePhoneForm: React.FC<UpdatePhoneFormProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [formStep0] = Form.useForm()
  const [formStep1] = Form.useForm()
  const [countdown, setCountdown] = useState(0)

  // 模拟获取验证码的通用倒计时逻辑
  const handleGetCode = () => {
    if (countdown > 0) return
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

  // 第一步：验证原手机号
  const onFinishStep0 = (values: any) => {
    console.log('原手机号验证码:', values)
    setCurrentStep(1) // 验证成功，进入下一步
    setCountdown(0) // 重置倒计时，供下一步使用
  }

  // 第二步：绑定新手机号
  const onFinishStep1 = (values: any) => {
    console.log('新手机号及验证码:', values)
    setCurrentStep(2) // 绑定成功，进入成功提示页
  }

  // 统一的 UI 样式
  const inputStyles =
    'rounded-lg h-12 bg-[#f7f8fa] border-transparent hover:border-transparent focus:bg-white focus:border-primary  transition-all'
  const buttonStyles =
    'w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium tracking-wide shadow-md shadow-indigo-500/20'

  return (
    <div className="w-full pt-2">
      {/* 顶部步骤条 */}
      <Steps
        current={currentStep}
        type="dot"
        items={[
          { title: t('p7GD4B8AnU3TwI9-huawh') },
          { title: t('lG3tjJSqJHzO08P7BKcwB') },
          { title: t('EO9WF7b0HVOFibftS0iLW') },
        ]}
        className="mb-8 custom-steps-text-sm"
      />

      {/* ======= 步骤 0：验证原手机号 (严格还原原型图) ======= */}
      {currentStep === 0 && (
        <Form form={formStep0} onFinish={onFinishStep0} size="large" className="px-4">
          <Form.Item
            name="oldCode"
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
            <Button type="primary" htmlType="submit" className={buttonStyles}>
              {t('2jMJBEGZFAaWJ41IB208Z')}
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ======= 步骤 1：验证新手机号 ======= */}
      {currentStep === 1 && (
        <Form
          form={formStep1}
          onFinish={onFinishStep1}
          size="large"
          className="px-4 animate-fade-in"
        >
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
            <Button type="primary" htmlType="submit" className={buttonStyles}>
              {t('mCzAHgECjBBSMsiSEZioJ')}
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ======= 步骤 2：修改成功 ======= */}
      {currentStep === 2 && (
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
