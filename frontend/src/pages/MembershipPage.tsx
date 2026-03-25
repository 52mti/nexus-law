import React, { useState, useEffect } from 'react';
import { Button, App } from 'antd';
import { CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';

// 🚀 1. 引入支付相关的两个弹窗组件
import { PaymentModal } from '@/components/PaymentModal';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';

// ==========================================
// 1. JSON 驱动配置：会员方案数据
// ==========================================
const membershipPlans = [
  {
    id: 'free',
    title: '体验用户',
    icon: null,
    price: '免费试用',
    priceUnit: '',
    subtitle: '体验AI带来的工作生产力腾飞',
    buttonText: '已领取',
    isPrimary: false,   // 是否为主推版本（整卡变蓝）
    buttonDisabled: true,
    pointsTitle: '每月获得 66 积分',
    pointsDesc: '',
    features: [
      '智能法律咨询：每日文字咨询不限制',
      '条文检索：每日限 20 次基础检索',
      '案例检索匹配：每日限 20 次检索',
      '法律文书生成：每日不限 次算力限制',
      '每月赠送 500 基础算力（用完需充值）'
    ]
  },
  {
    id: 'gold',
    title: '黄金会员',
    icon: <CrownOutlined className="mr-1" />,
    price: '299',
    priceUnit: '元/年',
    subtitle: '单月24元 2.22元/100积分',
    buttonText: '购买',
    isPrimary: false,
    buttonDisabled: false,
    pointsTitle: '每月获得 1080 积分',
    pointsDesc: '约生成4210张图片或320个标准视频',
    features: [
      '智能法律咨询：每日文字咨询不限制',
      '条文检索：每日限 20 次基础检索',
      '案例检索匹配：每日限 20 次检索',
      '法律文书生成：每日不限 次算力限制',
      '每月赠送 500 基础算力（用完需充值）'
    ]
  },
  {
    id: 'platinum',
    title: '铂金会员',
    icon: <CrownOutlined className="mr-1" />,
    price: '599',
    priceUnit: '元/年',
    subtitle: '单月49元 1.63元/100积分',
    buttonText: '购买',
    isPrimary: false,
    buttonDisabled: false,
    pointsTitle: '每月获得 3000 积分',
    pointsDesc: '',
    features: [
      '智能法律咨询：每日文字咨询不限制',
      '条文检索：每日限 20 次基础检索',
      '案例检索匹配：每日限 20 次检索',
      '法律文书生成：每日不限 次算力限制',
      '每月赠送 500 基础算力（用完需充值）'
    ]
  },
  {
    id: 'diamond',
    title: '钻石会员',
    icon: <CrownOutlined className="mr-1" />,
    price: '799',
    priceUnit: '元/年',
    subtitle: '单月66元 0.66元/100积分',
    buttonText: '购买',
    isPrimary: true, // 🚀 设为主推，整张卡片样式逆转
    buttonDisabled: false,
    pointsTitle: '每月获得 10000 积分',
    pointsDesc: '',
    features: [
      '智能法律咨询：每日文字咨询不限制',
      '条文检索：每日限 20 次基础检索',
      '案例检索匹配：每日限 20 次检索',
      '法律文书生成：每日不限 次算力限制',
      '每月赠送 500 基础算力（用完需充值）'
    ]
  }
];

// 定义计划的类型，方便状态管理
type PlanType = typeof membershipPlans[0];

export const MembershipPage: React.FC = () => {
  const { message } = App.useApp()
  // 🚀 2. 管理弹窗状态与当前选中的套餐
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType | null>(null);

  // 🚀 3. 点击购买按钮逻辑
  const handleBuyClick = (plan: PlanType) => {
    setCurrentPlan(plan);
    setIsPaymentModalOpen(true);
  };

  // 🚀 4. 模拟扫码支付成功（3秒后自动跳转成功弹窗）
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPaymentModalOpen) {
      timer = setTimeout(() => {
        setIsPaymentModalOpen(false); // 关掉扫码框
        setIsSuccessModalOpen(true);  // 打开成功框
        message.success('模拟支付成功！');
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isPaymentModalOpen]);

  return (
    <div className="h-full overflow-y-auto bg-[#f9fafb] p-8 pb-16 animate-fade-in flex flex-col items-center">
      
      {/* ========================================== */}
      {/* 1. 页面头部标题 */}
      {/* ========================================== */}
      <div className="text-center mt-6 mb-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-wide">选择适合你的会员方案</h1>
        <p className="text-[15px] text-gray-500 tracking-widest">释放你的终极力量</p>
      </div>

      {/* ========================================== */}
      {/* 2. 定价卡片网格 */}
      {/* ========================================== */}
      {/* 使用 grid 布局，大屏 4 列，中屏 2 列，小屏 1 列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-300">
        {membershipPlans.map((plan) => {
          // 判断是否为主推的高亮卡片（钻石会员）
          const isPrimary = plan.isPrimary;

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
                isPrimary 
                  ? 'bg-primary text-white shadow-lg shadow-indigo-500/30' // 高亮卡片：纯蓝背景，白字
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100' // 普通卡片：白背景
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
                  onClick={() => handleBuyClick(plan)} // 🚀 绑定点击事件
                  className={`w-full h-11 rounded-lg text-[15px] font-medium border-none tracking-wider ${
                    plan.buttonDisabled 
                      ? 'bg-gray-100! text-gray-400!' // 置灰状态（已领取）
                      : isPrimary
                        ? 'bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white' // 钻石会员：透明描边白字
                        : 'bg-primary hover:bg-secondary text-white shadow-md shadow-indigo-500/20' // 普通购买：紫色按钮
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </div>

              {/* 卡片下半部分：权益列表 */}
              <div className="px-8 pb-8 flex-1 flex flex-col">
                {/* 积分额度 */}
                <div className="mb-6">
                  <div className="font-bold text-[15px] mb-1">{plan.pointsTitle}</div>
                  {plan.pointsDesc && (
                    <div className={`text-[12px] ${isPrimary ? 'text-indigo-100' : 'text-gray-400'}`}>
                      {plan.pointsDesc}
                    </div>
                  )}
                </div>

                {/* 权益列表清单 */}
                <div className="flex flex-col gap-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {/* 打勾图标 */}
                      <CheckCircleOutlined 
                        className={`mt-0.75 text-[13px] shrink-0 ${
                          isPrimary ? 'text-indigo-200' : 'text-primary/80'
                        }`} 
                      />
                      {/* 权益文案 */}
                      <span className={`text-[13px] leading-relaxed ${
                        isPrimary ? 'text-indigo-50' : 'text-gray-600'
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
      {/* 🚀 5. 弹窗挂载区域 */}
      {/* ========================================== */}

      {/* 1. 扫码支付弹窗 */}
      <PaymentModal
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        // 将价格字符串转为数字（如果点击的是体验用户虽然按钮置灰，但也做了兜底转换）
        amount={Number(currentPlan?.price) || 0}
      />

      {/* 2. 支付成功弹窗 */}
      <PaymentSuccessModal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        // 保证金额格式是 "299.00" 这种格式
        amount={Number(currentPlan?.price || 0).toFixed(2)}
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