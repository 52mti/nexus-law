import React, { useState, useEffect } from 'react'
import { Button, App, Spin } from 'antd' // 🚀 引入 Spin 用作加载动画
import { CrownOutlined, CheckCircleOutlined, InboxOutlined } from '@ant-design/icons'

// 🚀 引入支付弹窗组件与 API
import { PaymentModal } from '@/components/PaymentModal'
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal'
import { confirmPayment, createOrder, listPlans, type PlanItem } from '@/api/commerce'
import { getProfile } from '@/api/auth'
import { useUserStore } from '@/store/useUserStore'
import { useTranslation } from 'react-i18next'

// ==========================================
// 1. 定义前端 UI 需要的卡片数据类型
// ==========================================
export interface UIPlanType {
  id: string
  title: string
  icon: React.ReactNode | null
  price: string
  priceUnit: string
  subtitle: string
  buttonText: string
  isPrimary: boolean
  buttonDisabled: boolean
  pointsTitle: string
  pointsDesc: string
  features: string[]
  // 🚀 把后端的原始数据保留一份，将来点击“购买”生成订单时会用到
  originalData: PlanItem
}

function periodLabel(period: string | null) {
  switch (period) {
    case 'month':
      return '按月订阅'
    case 'year':
      return '按年订阅'
    case 'quarter':
      return '按季订阅'
    case 'week':
      return '按周订阅'
    default:
      return period || ''
  }
}

export const MembershipPage: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const setMemberInfo = useUserStore((state) => state.setMemberInfo)

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<UIPlanType[]>([])
  const [buying, setBuying] = useState(false)

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<UIPlanType | null>(null)
  const [payInfo, setPayInfo] = useState<{
    order_id: string
    checkout_url: string
    amount: string
    sign?: string
    channel: string
  } | null>(null)

  // ==========================================
  // 🚀 核心：初始化加载与数据映射 (Mapping)
  // ==========================================
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true)
      try {
        const data = await listPlans({ current: 1, size: 100 })
        const records = (data.records || []).filter((record) => record.type !== 'points')
        const formattedPlans: UIPlanType[] = records.map((record) => {
          const priceNum = Number(record.price)
          const isFree = priceNum === 0
          const giftPoints = record.benefits?.gift_points || 0
          const features = record.benefits?.features?.length
            ? record.benefits.features
            : [t('haMa5NKgtArvQU6lZ5LHR', { count: giftPoints })]
          return {
            id: record.id,
            title: record.name || t('TpztAoVIZ1BnWXeGtIvBT'),
            icon: isFree ? null : <CrownOutlined className="mr-1" />,
            price: isFree ? t('5orx1DyQY2gLVgf5OsX0b') : String(priceNum),
            priceUnit: isFree ? '' : t('SN0eJqECHeRaU7DfLdk1l'),
            subtitle: record.benefits?.hint || periodLabel(record.period),
            buttonText: isFree ? t('TW3Qxm3H9mjNuyd7A1faX') : t('Sy1xxFPxQB9iXLe3kUKFo'),
            isPrimary: record.benefits?.code === 'ZSHY' || record.period === 'year',
            buttonDisabled: isFree,
            pointsTitle: t('haMa5NKgtArvQU6lZ5LHR', { count: giftPoints }),
            pointsDesc: '',
            features,
            originalData: record,
          }
        })
        formattedPlans.sort((a, b) => Number(a.originalData.price) - Number(b.originalData.price))
        setPlans(formattedPlans)
      } catch (error) {
        console.error('获取会员套餐报错:', error)
        message.error(error instanceof Error ? error.message : t('94nidbWrt1CrI2gvgGPry'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [message, t])

  const handleBuyClick = async (plan: UIPlanType) => {
    try {
      setBuying(true)
      const created = await createOrder({
        product_type: 'plan',
        product_id: plan.id,
        channel: 'mock',
      })
      setCurrentPlan(plan)
      setPayInfo({
        order_id: created.order.id,
        checkout_url: created.pay.checkout_url,
        amount: created.pay.amount,
        sign: created.pay.sign,
        channel: created.pay.channel,
      })
      setIsPaymentModalOpen(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('94nidbWrt1CrI2gvgGPry'))
    } finally {
      setBuying(false)
    }
  }

  const handleMockPay = async () => {
    if (!payInfo) return
    await confirmPayment({
      order_id: payInfo.order_id,
      channel: payInfo.channel,
      amount: payInfo.amount,
      sign: payInfo.sign,
    })
    try {
      const profile = await getProfile()
      setMemberInfo(profile)
    } catch {
      // profile refresh is best-effort after payment
    }
    setIsPaymentModalOpen(false)
    setIsSuccessModalOpen(true)
  }

  // ==========================================
  // 🚀 渲染层
  // ==========================================
  return (
    <div className="h-full overflow-y-auto bg-[#f9fafb] p-8 pb-16 relative flex flex-col items-center">
      {/* 🚀 加载状态遮罩 */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f9fafb]/80 backdrop-blur-sm">
          <Spin size="large" description={t('GO1VjsHxUiEW_cp_WIAeu')} />
        </div>
      )}

      {/* 头部标题 */}
      <div className="text-center mt-6 mb-12 animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-wide">
          {t('sEG5IrOhZrj4Al7hTXM9y')}{' '}
        </h1>
        <p className="text-[15px] text-gray-500 tracking-widest">{t('X-6ME5WqeWy9lsGJ9-fAR')} </p>
      </div>

      {/* 定价卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-300 animate-fade-in">
        {!loading && plans.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
            <InboxOutlined className="text-5xl mb-3 text-gray-200" />
            <span>暂无会员套餐，请确认已登录且后端已写入套餐数据</span>
          </div>
        )}
        {/* 🚀 改用 plans 进行遍历 */}
        {plans.map((plan) => {
          const isPrimary = plan.isPrimary

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
                isPrimary
                  ? 'bg-primary text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100'
              }`}
            >
              {/* 卡片上半部分：渐变头、价格、按钮 */}
              <div
                className={`p-8 pb-6 flex flex-col items-center ${isPrimary ? '' : 'bg-linear-to-b from-[#f0f2ff] to-white'}`}
              >
                {/* 标题 */}
                <div
                  className={`text-lg font-bold mb-4 flex items-center ${isPrimary ? 'text-white' : 'text-primary'}`}
                >
                  {plan.icon} {plan.title}
                </div>

                {/* 价格 */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className={`text-4xl font-extrabold ${isPrimary ? 'text-white' : 'text-gray-800'}`}
                  >
                    {plan.price}
                  </span>
                  <span className={`text-sm ${isPrimary ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {plan.priceUnit}
                  </span>
                </div>

                {/* 价格副标题 */}
                <div
                  className={`text-[12px] h-4 mb-6 ${isPrimary ? 'text-indigo-100' : 'text-gray-400'}`}
                >
                  {plan.subtitle}
                </div>

                {/* 操作按钮 */}
                <Button
                  type={isPrimary ? 'default' : 'primary'}
                  disabled={plan.buttonDisabled || buying}
                  onClick={() => handleBuyClick(plan)}
                  className={`w-full h-11 rounded-lg text-[15px] font-medium border-none tracking-wider ${
                    plan.buttonDisabled
                      ? 'bg-gray-100! text-gray-400!'
                      : isPrimary
                        ? 'bg-white text-primary hover:bg-indigo-50 shadow-lg'
                        : 'bg-primary hover:bg-secondary text-white shadow-md shadow-indigo-500/20'
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </div>

              {/* 卡片下半部分：权益列表 */}
              <div className="px-8 pb-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <div className="font-bold text-[15px] mb-1">{plan.pointsTitle}</div>
                  {plan.pointsDesc && (
                    <div
                      className={`text-[12px] ${isPrimary ? 'text-indigo-100' : 'text-gray-400'}`}
                    >
                      {plan.pointsDesc}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircleOutlined
                        className={`mt-0.75 text-[13px] shrink-0 ${
                          isPrimary ? 'text-indigo-200' : 'text-primary/80'
                        }`}
                      />
                      <span
                        className={`text-[13px] leading-relaxed ${
                          isPrimary ? 'text-indigo-50' : 'text-gray-600'
                        }`}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ========================================== */}
      {/* 🚀 弹窗挂载区域 */}
      {/* ========================================== */}
      <PaymentModal
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        checkoutUrl={payInfo?.checkout_url}
        onMockPay={payInfo ? handleMockPay : undefined}
        amount={payInfo?.amount || Number(currentPlan?.originalData.price) || 0}
      />

      <PaymentSuccessModal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        amount={Number(currentPlan?.originalData.price || 0).toFixed(2)}
        payMethod={t('JyExJ3XBs6zPJOFkmtz7c')}
        payTime={new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')}
        onReturnHome={() => {
          setIsSuccessModalOpen(false)
          message.info(t('9QRFkDEwSoKxG3Tk7snkB'))
        }}
      />
    </div>
  )
}

export default MembershipPage
