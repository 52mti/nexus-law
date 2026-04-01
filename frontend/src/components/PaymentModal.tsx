import React, { useState } from "react";
import { Modal, Button, App } from "antd"; // 🚀 1. 引入 Button 和 App(用于全局提示)
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { useTranslation } from "react-i18next";
// 🚀 2. 假设你的 issueOrder 接口在这个文件里，请根据实际路径替换
import { issueOrder } from "@/api/payment";

interface PaymentModalProps {
  open: boolean;
  onCancel: () => void;
  amount: number | string;
  orderId: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onCancel,
  amount,
  orderId,
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  // 🚀 3. 增加 Loading 状态，防止重复点击下单
  const [loading, setLoading] = useState(false);

  // 🚀 4. 封装下单逻辑
  const handleIssueOrder = async () => {
    if (!orderId) {
      message.error(t("CT4CZ8JqKH8M0KRGd36cv"));
      return;
    }

    try {
      setLoading(true);
      // 调用你的统一下单接口，传入 orderId
      const res = await issueOrder({ id: orderId });

      // 假设 res.code === 200 或 res.successful 代表成功（根据你的真实拦截器调整）
      message.success(t("bRjUxTnow0Ap-YnPsFFUC"));

      // 💡 提示：如果你的二维码需要真实的支付链接，通常后端会在这个接口里返回
      // 比如 res.data.payUrl，你可以把它存进 state 传给下面的 QRCodeScanner
    } catch (error) {
      console.error("下单报错:", error);
      // 网络级别的报错通常在 axios 拦截器里提示了，这里可以不弹或做兜底提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={null}
      centered
      width={400}
      classNames={{ container: "rounded-2xl p-0" }}
    >
      <div className="pt-10 pb-6 px-6 flex flex-col items-center animate-fade-in">
        {/* 弹窗标题 */}
        <div className="text-xl font-bold text-gray-800 mb-6">
          {t("bilZpkT35pe7rc_kPqYzh")}{" "}
          <span className="text-primary mx-1">{amount}</span>{" "}
          {t("w3sCAov1HRR2xI673RFxr")}
        </div>

        {/* 引入复用的二维码组件 */}
        <QRCodeScanner />

        {/* 🚀 5. 新增的下单按钮 */}
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleIssueOrder}
          className="w-full mb-8 bg-primary mt-8 hover:bg-secondary rounded-lg font-medium tracking-wide shadow-md shadow-indigo-500/20 border-none"
        >
          {loading ? t("dQc64SStuPf1ewP82hciO") : t("iUK1H65U-CevUxcpNqAL9")}
        </Button>

        {/* 底部服务协议 */}
        <div className="text-[12px] text-gray-400 mt-8">
          {t("pXNQr6vug-33Su5C0L3ag")}
          <a className="text-primary hover:text-secondary transition-colors cursor-pointer">
            {t("17ddfv4M9tfH3GJZtf6_r")}
          </a>
        </div>
      </div>
    </Modal>
  );
};
