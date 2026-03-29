import React, { useState, useEffect } from 'react';
import { Button, App, Spin } from 'antd'; // 🚀 引入 Spin 用作加载动画
import { CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';

// 🚀 引入支付弹窗组件与 API
import { PaymentModal } from '@/components/PaymentModal';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';
import { MembershipPlan } from '@/api/plan'; // 假设你的 api 路径在这里
// 根据你上一步生成的类型，引入真实的后端类型
import type { PlanSubscription } from '@/api/plan';

// ==========================================
// 1. 定义前端 UI 需要的卡片数据类型
// ==========================================
export interface UIPlanType {
  id: string;
  title: string;
  icon: React.ReactNode | null;
  price: string;
  priceUnit: string;
  subtitle: string;
  buttonText: string;
  isPrimary: boolean;
  buttonDisabled: boolean;
  pointsTitle: string;
  pointsDesc: string;
  features: string[];
  // 🚀 把后端的原始数据保留一份，将来点击“购买”生成订单时会用到
  originalData: PlanSubscription;
}

export const MembershipPage: React.FC = () => {
  const { message } = App.useApp()

  // ==========================================
  // 🚀 状态管理
  // ==========================================
  const [loading, setLoading] = useState(true); // 页面初始化加载状态
  const [plans, setPlans] = useState<UIPlanType[]>([]); // 存放转换后的套餐数据

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<UIPlanType | null>(null);

  // ==========================================
  // 🚀 核心：初始化加载与数据映射 (Mapping)
  // ==========================================
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await MembershipPlan();

        if (res.successful && res.data?.records) {
          // 将后端的 records 映射成前端 UI 需要的格式
          const formattedPlans: UIPlanType[] = res.data.records.map((record) => {
            // 判断是否是免费体验用户 (通过价格判断，或者通过 code === 'TYYH' 判断)
            const isFree = Number(record.price) === 0;
            // 判断是否是主推的高级套餐 (比如 钻石会员 ZSHY)
            const isPrimary = record.code === 'ZSHY';

            return {
              id: record.id!,
              title: record.name || '未知套餐',
              icon: isFree ? null : <CrownOutlined className="mr-1" />,
              // 处理价格：如果是 0 就显示“免费试用”，否则截掉多余的小数点 (如 799.0000 -> 799)
              price: isFree ? '免费试用' : Number(record.price).toString(),
              priceUnit: isFree ? '' : '元/年',
              subtitle: record.hint || '',
              buttonText: isFree ? '已领取' : '购买',
              isPrimary: isPrimary,
              buttonDisabled: isFree, // 免费体验无需购买
              pointsTitle: `每月获得 ${record.gainPointsPerMonth || 0} 积分`,
              // 如果有些特定的描述（如黄金会员的图生图数量），前端可以自己写死兜底，或者让后端加字段
              pointsDesc: record.code === 'BJHY' ? '约生成4210张图片或320个标准视频' : '',
              // 共同的权益说明，后端暂无此字段，前端先统一配置
              features: [
                '智能法律咨询：每日文字咨询不限制',
                '条文检索：每日限 20 次基础检索',
                '案例检索匹配：每日限 20 次检索',
                '法律文书生成：每日不限 次算力限制',
                '每月赠送 500 基础算力（用完需充值）'
              ],
              originalData: record // 藏匿原始数据
            };
          });

          // 🚀 按照价格从低到高排序，让“免费体验”排在最前面
          formattedPlans.sort((a, b) => Number(a.originalData.price) - Number(b.originalData.price));

          setPlans(formattedPlans);
        } else {
          message.error(res.message || '获取套餐数据失败');
        }
      } catch (error) {
        console.error('获取会员套餐报错:', error);
        message.error('网络异常，无法获取套餐信息');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [message]);

  // 点击购买按钮逻辑
  const handleBuyClick = (plan: UIPlanType) => {
    setCurrentPlan(plan);
    setIsPaymentModalOpen(true);
  };

  // // 模拟扫码支付成功
  // useEffect(() => {
  //   let timer: NodeJS.Timeout;
  //   if (isPaymentModalOpen) {
  //     timer = setTimeout(() => {
  //       setIsPaymentModalOpen(false);
  //       setIsSuccessModalOpen(true);
  //       message.success('模拟支付成功！');
  //     }, 3000);
  //   }
  //   return () => clearTimeout(timer);
  // }, [isPaymentModalOpen, message]);

  // ==========================================
  // 🚀 渲染层
  // ==========================================
  return (
    <div className="h-full overflow-y-auto bg-[#f9fafb] p-8 pb-16 relative flex flex-col items-center">

      {/* 🚀 加载状态遮罩 */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f9fafb]/80 backdrop-blur-sm">
          <Spin size="large" description="正在获取最新会员方案..." />
        </div>
      )}

      {/* 头部标题 */}
      <div className="text-center mt-6 mb-12 animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-wide">选择适合你的会员方案</h1>
        <p className="text-[15px] text-gray-500 tracking-widest">释放你的终极力量</p>
      </div>

      {/* 定价卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-300 animate-fade-in">
        {/* 🚀 改用 plans 进行遍历 */}
        {plans.map((plan) => {
          const isPrimary = plan.isPrimary;

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${isPrimary
                ? 'bg-primary text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                }`}
            >
              {/* 卡片上半部分：渐变头、价格、按钮 */}
              <div className={`p-8 pb-6 flex flex-col items-center ${isPrimary ? '' : 'bg-linear-to-b from-[#f0f2ff] to-white'}`}>
                {/* 标题 */}
                <div className={`text-lg font-bold mb-4 flex items-center ${isPrimary ? 'text-white' : 'text-primary'}`}>
                  {plan.icon} {plan.title}
                </div>

                {/* 价格 */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-extrabold ${isPrimary ? 'text-white' : 'text-gray-800'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${isPrimary ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {plan.priceUnit}
                  </span>
                </div>

                {/* 价格副标题 */}
                <div className={`text-[12px] h-4 mb-6 ${isPrimary ? 'text-indigo-100' : 'text-gray-400'}`}>
                  {plan.subtitle}
                </div>

                {/* 操作按钮 */}
                <Button
                  type={isPrimary ? 'default' : 'primary'}
                  disabled={plan.buttonDisabled}
                  onClick={() => handleBuyClick(plan)}
                  className={`w-full h-11 rounded-lg text-[15px] font-medium border-none tracking-wider ${plan.buttonDisabled
                    ? 'bg-gray-100! text-gray-400!'
                    : isPrimary
                      ? 'bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white'
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
                    <div className={`text-[12px] ${isPrimary ? 'text-indigo-100' : 'text-gray-400'}`}>
                      {plan.pointsDesc}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircleOutlined
                        className={`mt-0.75 text-[13px] shrink-0 ${isPrimary ? 'text-indigo-200' : 'text-primary/80'
                          }`}
                      />
                      <span className={`text-[13px] leading-relaxed ${isPrimary ? 'text-indigo-50' : 'text-gray-600'
                        }`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* 🚀 弹窗挂载区域 */}
      {/* ========================================== */}
      <PaymentModal
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        orderId={currentPlan?.originalData.id || ''}
        // 🚀 注意这里：拿取真实的后端价格传入支付弹窗
        amount={Number(currentPlan?.originalData.price) || 0}
      />

      <PaymentSuccessModal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        amount={Number(currentPlan?.originalData.price || 0).toFixed(2)}
        payMethod="支付宝"
        payTime={new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')}
        onReturnHome={() => {
          setIsSuccessModalOpen(false);
          message.info('返回首页逻辑...');
        }}
      />
    </div>
  );
};

export default MembershipPage;